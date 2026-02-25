

// FIX: `getAi` is not exported from `geminiService`. It should be imported from `./gemini`.
import { withRetry } from './geminiService';
import { getAi } from './gemini';
import { getProjectSourceCode } from '../utils/sourceCode';
import { CodeChange, CodeChangeType } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { extractAndParseJson } from '../utils/json';

const systemInstruction = `You are an expert senior software engineer integrated into an AI assistant named J.A.R.V.I.S.
Your task is to analyze user requests for new features, bug fixes, or modifications to J.A.R.V.I.S. itself.
You have been provided with the complete source code of the application.
Based on the user's request and the provided source code, you must generate a precise set of code changes to fulfill the request.
You MUST respond with a JSON object that strictly adheres to the provided schema. Do not add any extra commentary or explanations outside of the JSON structure.

Analyze the user's request and the codebase to determine the necessary modifications. This may involve creating new files, updating existing files, or deleting files.
For each change, provide a clear, concise description of what you are doing and why.

- For file CREATION, provide the full path and the complete content.
- For file UPDATES, provide the full path and the complete, updated content of the entire file.
- For file DELETION, provide the full path and set the content to null.

Your output must be a single JSON object containing a 'changes' array.
`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        changes: {
            type: Type.ARRAY,
            description: "A list of code modifications to be applied.",
            items: {
                type: Type.OBJECT,
                properties: {
                    file: {
                        type: Type.STRING,
                        description: "The full path of the file to modify, create, or delete."
                    },
                    content: {
                        type: Type.STRING,
                        description: "The full new content of the file. Should be null if type is DELETE."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A short summary of the change being made to this file."
                    },
                    type: {
                        type: Type.STRING,
                        description: "The type of change: CREATE, UPDATE, or DELETE."
                    }
                },
                required: ["file", "content", "description", "type"],
            }
        }
    },
    required: ["changes"],
};


export const proposeChanges = async (request: string): Promise<CodeChange[]> => {
    try {
        const sourceCode = await getProjectSourceCode();
        const sourceCodeString = Object.entries(sourceCode)
            .map(([path, content]) => `// File: ${path}\n\n${content}`)
            .join('\n\n---\n\n');
        
        const ai = getAi();
        const generateFn = () => ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `User Request: "${request}"\n\n---\n\nCurrent Source Code:\n${sourceCodeString}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        const response: GenerateContentResponse = await withRetry(generateFn);

        if (!response.text) {
            throw new Error("Received an empty response from the AI when proposing changes.");
        }
        const result = extractAndParseJson<{ changes: CodeChange[] }>(response.text);

        // Basic validation
        if (!result.changes || !Array.isArray(result.changes)) {
            throw new Error("Invalid response format from AI: 'changes' array not found.");
        }
        
        return result.changes.filter(c => c.type && c.file); // Filter out any malformed entries

    } catch (error) {
        console.error("Failed to propose changes:", error);
        throw new Error("J.A.R.V.I.S. was unable to devise a solution. The request may be too complex or an internal error occurred.");
    }
};