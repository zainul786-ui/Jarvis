
import { GoogleGenAI, Type, FunctionDeclaration, Modality, GenerateContentResponse } from "@google/genai";
import { extractAndParseJson } from "../utils/json";
import { PersonalityMode } from "../types";
import { getAi } from "./gemini";

export const withRetry = async <T>(fn: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                console.error("Request failed after all retries.", error);
                throw error;
            }
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

export const functionDeclarations: FunctionDeclaration[] = [
    {
        name: 'performSearch',
        description: 'Performs a Google search for a given query to find up-to-date information and provides a spoken summary.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: 'The search term. e.g., "latest news", "weather in London".',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'recallMemory',
        description: 'Retrieves a piece of information that was previously stored. The key should be simple.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: {
                    type: Type.STRING,
                    description: 'The subject of the memory to recall. e.g., "my name".',
                },
            },
            required: ['key'],
        },
    },
    {
        name: 'updateMemory',
        description: "Stores a piece of information, mapping a key to a value. The key should be simple. For example, 'remember my name is John'.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                key: {
                    type: Type.STRING,
                    description: 'The subject of the memory. e.g., "my name", "my favorite color".',
                },
                value: {
                    type: Type.STRING,
                    description: 'The information to be remembered. e.g., "John", "blue".',
                },
            },
            required: ['key', 'value'],
        },
    },
    {
        name: 'createTask',
        description: "Creates a task for the user to be done in the future. Use this for reminders, scheduling, or any future actions. Infer date and time from relative terms.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                task_description: {
                    type: Type.STRING,
                    description: 'A clear and concise description of the task.',
                },
                due_date: {
                    type: Type.STRING,
                    description: 'The date the task is due, in YYYY-MM-DD format. Should be null if not specified.',
                },
                due_time: {
                    type: Type.STRING,
                    description: 'The time the task is due, in HH:MM (24-hour) format. Should be null if not specified.',
                },
            },
            required: ['task_description'],
        },
    },
    {
        name: 'suggestCodeModification',
        description: 'When the user asks to add a feature, fix a bug, or change the application, use this tool to generate and propose the necessary code modifications for review.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                request: {
                    type: Type.STRING,
                    description: 'A detailed description of the user\'s request for self-improvement.',
                },
            },
            required: ['request'],
        },
    },
    {
        name: 'developWebsite',
        description: 'Handles requests to create, update, or modify a separate web project. Use for tasks like "build a portfolio website", "add a contact page", or "change the CSS".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                request: {
                    type: Type.STRING,
                    description: 'A detailed description of the user\'s web development request.'
                },
            },
            required: ['request'],
        },
    },
    {
        name: 'openSettings',
        description: 'Opens the internal settings panel to manage API keys and other configurations.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'getSystemStatus',
        description: 'Retrieves the current operational status of the J.A.R.V.I.S. system, including active panels, microphone state, and enabled API keys. Use this to answer questions about the system itself.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    },
    {
        name: 'setPersonalityMode',
        description: 'Changes the conversational personality of the assistant. Also use for "normal mode".',
        parameters: {
            type: Type.OBJECT,
            properties: {
                mode: {
                    type: Type.STRING,
                    description: `The personality mode to switch to. Available modes: ${Object.values(PersonalityMode).join(', ')}. "Normal mode" should map to ASSISTANT.`,
                    enum: Object.values(PersonalityMode),
                },
            },
            required: ['mode'],
        },
    },
    {
        name: 'openHolographicCommandPanel',
        description: 'Opens a special holographic command panel for technical discussions about a web project. Only use when explicitly asked to "open command panel" or similar, and only when a web project is active.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        },
    }
];


export const performSearch = async (query: string): Promise<string> => {
    try {
        const ai = getAi();
        const generateFn = () => ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `Summarize the answer to the following query in a concise sentence or two, based on a web search: "${query}"`,
           config: {
             tools: [{googleSearch: {}}],
           },
        });
        const response: GenerateContentResponse = await withRetry(generateFn);

        return response.text || `I found some information regarding ${query}, but I'm having trouble summarizing it.`;

    } catch (error) {
        console.error("Error performing search:", error);
        return `I'm sorry, I was unable to complete the search for '${query}'.`;
    }
};

const webDevSystemInstruction = `You are J.A.R.V.I.S., a modern Vibe Coding development assistant. Your primary goal is to generate a real, component-based project structure for web applications, moving away from single-file layouts.

**PROJECT CREATION RULES:**
1.  **Modern Structure:** Always generate a project with a modern folder structure. A typical layout should be:
    - \`index.html\` (at the root)
    - \`src/main.js\`
    - \`src/styles/global.css\`
    - \`package.json\`
    - Create other folders like \`src/components/\` or \`src/assets/\` only when necessary for the request.
2.  **Component-Based Vanilla JS:** You MUST write modern, vanilla JavaScript (ES6+). Mimic a component-based architecture by creating functions that are responsible for rendering specific parts of the UI (e.g., \`createHeader()\`, \`createProductCard(product)\`). These functions should create and return DOM elements. The main script (\`src/main.js\`) should orchestrate calling these functions and appending the results to the DOM.
3.  **File Generation:**
    - Only generate files that are needed. Do not create empty or unnecessary files.
    - If the user asks for a new UI feature, create a new JS function for it.
    - Maintain clean, readable code with a clear separation of concerns.

**TECH STACK & BEST PRACTICES:**
1.  **Root HTML:** The main file MUST be \`index.html\` located at the project root.
2.  **Linking Files:** The \`index.html\` MUST correctly link to the CSS and JS files using relative paths.
    - Example CSS: \`<link rel="stylesheet" href="src/styles/global.css">\`
    - Example JS: \`<script src="src/main.js" type="module" defer></script>\`
3.  **Styling:** Use TailwindCSS via the CDN script in the \`<head>\` of \`index.html\`: \`<script src="https://cdn.tailwindcss.com"></script>\`.
4.  **Responsiveness:** All websites MUST be mobile-first and fully responsive. The \`index.html\` MUST include \`<meta name="viewport" content="width=device-width, initial-scale=1.0" />\`.
5.  **package.json:** Always include a basic \`package.json\` file, e.g., \`{ "name": "jarvis-project", "version": "1.0.0", "description": "" }\`.

**PROJECT UPDATES:**
- When asked to modify an existing project, you will receive the current file structure. You MUST return the **complete and updated set of ALL project files**, not just the changed ones.

**OUTPUT FORMAT:**
- Your response MUST be a single, valid JSON object with one root key: "files".
- The "files" value must be an array of objects, each with "path" and "content".
- Example: \`{ "files": [ { "path": "index.html", "content": "<!DOCTYPE html>..." }, { "path": "src/main.js", "content": "console.log('hello')" } ] }\``;

const websiteSchema = {
    type: Type.OBJECT,
    properties: {
        files: {
            type: Type.ARRAY,
            description: "A list of file objects, each with a path and content.",
            items: {
                type: Type.OBJECT,
                properties: {
                    path: {
                        type: Type.STRING,
                        description: "The full path of the file (e.g., 'index.html', 'src/styles/global.css')."
                    },
                    content: {
                        type: Type.STRING,
                        description: "The complete source code or content of the file."
                    }
                },
                required: ["path", "content"]
            }
        }
    },
    required: ["files"],
};


export const generateWebsiteCode = async (request: string, currentFiles: Record<string, string> | null): Promise<Record<string, string>> => {
    try {
        const ai = getAi();
        
        let prompt = `User Request: "${request}"`;
        if (currentFiles) {
            const filesArray = Object.entries(currentFiles).map(([path, content]) => ({ path, content }));
            prompt += `\n\n---\n\nCurrent Project Files:\n${JSON.stringify(filesArray, null, 2)}`;
        }

        const generateFn = () => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: webDevSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: websiteSchema,
            },
        });
        const response: GenerateContentResponse = await withRetry(generateFn);

        if (!response.text) {
            throw new Error("Received an empty response from the AI for website generation.");
        }
        const result = extractAndParseJson<{ files: { path: string, content: string }[] }>(response.text);

        if (!result.files || !Array.isArray(result.files)) {
            throw new Error("Invalid response format from AI: 'files' array not found.");
        }
        
        const filesRecord: Record<string, string> = result.files.reduce((acc, file) => {
            if (file.path) {
                acc[file.path] = file.content;
            }
            return acc;
        }, {} as Record<string, string>);

        if (Object.keys(filesRecord).length === 0 || !filesRecord['index.html']) {
            throw new Error("J.A.R.V.I.S. failed to generate a valid project structure. The request may have been too ambiguous.");
        }

        return filesRecord;

    } catch (error) {
        console.error("Failed to generate website code:", error);
        throw new Error("J.A.R.V.I.S. was unable to devise a web solution. The request may be too complex or an internal error occurred.");
    }
};


export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const ai = getAi();
        const generateFn = () => ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say with a confident, clear, and slightly formal tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        });
        const response: GenerateContentResponse = await withRetry(generateFn);

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        console.error("No audio data received from TTS API.");
        return null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};
