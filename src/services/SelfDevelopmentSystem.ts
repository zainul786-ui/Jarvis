import { getAi } from './gemini';
import { getProjectSourceCode } from '../utils/sourceCode';
import { CodeChange } from '../types';

export const proposeChanges = async (request: string): Promise<CodeChange[]> => {
    const ai = getAi();
    const sourceCode = await getProjectSourceCode();
    
    const prompt = `You are the self-development module of J.A.R.V.I.S.
The user wants to modify the application: "${request}"

Current project source code:
${JSON.stringify(sourceCode, null, 2)}

Analyze the request and propose a set of code changes.
Return a JSON array of objects with the following structure:
{
  "type": "CREATE" | "UPDATE" | "DELETE",
  "file": "path/to/file",
  "content": "new file content" | null,
  "description": "brief description of the change"
}

Rules:
1. Only propose changes that are necessary.
2. Ensure the code is valid and follows the existing style.
3. If creating or updating, provide the full content of the file.
4. If deleting, set content to null.
5. Return ONLY the JSON array.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate proposed changes.");
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse proposed changes JSON:", text);
        throw new Error("Failed to parse the proposed changes. Please try again.");
    }
};
