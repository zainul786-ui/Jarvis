import { FunctionDeclaration, Type, Modality } from "@google/genai";
import { getAi } from './gemini';

export const functionDeclarations: FunctionDeclaration[] = [
    {
        name: "performSearch",
        parameters: {
            type: Type.OBJECT,
            description: "Perform a Google Search to find information on the web.",
            properties: {
                query: {
                    type: Type.STRING,
                    description: "The search query to perform.",
                },
            },
            required: ["query"],
        },
    },
    {
        name: "updateMemory",
        parameters: {
            type: Type.OBJECT,
            description: "Store a piece of information in the assistant's long-term memory.",
            properties: {
                key: {
                    type: Type.STRING,
                    description: "The key to identify the memory (e.g., 'user_birthday').",
                },
                value: {
                    type: Type.STRING,
                    description: "The value to store in memory.",
                },
            },
            required: ["key", "value"],
        },
    },
    {
        name: "recallMemory",
        parameters: {
            type: Type.OBJECT,
            description: "Retrieve a piece of information from the assistant's long-term memory.",
            properties: {
                key: {
                    type: Type.STRING,
                    description: "The key of the memory to retrieve.",
                },
            },
            required: ["key"],
        },
    },
    {
        name: "createTask",
        parameters: {
            type: Type.OBJECT,
            description: "Create a new task in the user's task manager.",
            properties: {
                task_description: {
                    type: Type.STRING,
                    description: "A clear description of the task.",
                },
                due_date: {
                    type: Type.STRING,
                    description: "The due date for the task (optional).",
                },
                due_time: {
                    type: Type.STRING,
                    description: "The due time for the task (optional).",
                },
            },
            required: ["task_description"],
        },
    },
    {
        name: "suggestCodeModification",
        parameters: {
            type: Type.OBJECT,
            description: "Propose a modification to the J.A.R.V.I.S. source code itself.",
            properties: {
                request: {
                    type: Type.STRING,
                    description: "The user's request for how to modify the application.",
                },
            },
            required: ["request"],
        },
    },
    {
        name: "developWebsite",
        parameters: {
            type: Type.OBJECT,
            description: "Generate a full-featured website based on the user's request.",
            properties: {
                request: {
                    type: Type.STRING,
                    description: "The user's request for the website's purpose and features.",
                },
            },
            required: ["request"],
        },
    },
    {
        name: "openSettings",
        parameters: {
            type: Type.OBJECT,
            description: "Open the application's settings panel for API key management.",
            properties: {},
        },
    },
    {
        name: "getSystemStatus",
        parameters: {
            type: Type.OBJECT,
            description: "Retrieve the current status of the J.A.R.V.I.S. system modules.",
            properties: {},
        },
    },
    {
        name: "setPersonalityMode",
        parameters: {
            type: Type.OBJECT,
            description: "Change the assistant's personality mode.",
            properties: {
                mode: {
                    type: Type.STRING,
                    enum: ["FRIENDSHIP", "ASSISTANT", "HACKER", "FUNNY", "MOTIVATIONAL"],
                    description: "The personality mode to activate.",
                },
            },
            required: ["mode"],
        },
    },
    {
        name: "openHolographicCommandPanel",
        parameters: {
            type: Type.OBJECT,
            description: "Deploy the holographic command panel for advanced project manipulation.",
            properties: {},
        },
    },
];

export const generateSpeech = async (text: string): Promise<string | null> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Speak in a calm, confident, and sophisticated J.A.R.V.I.S. tone: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
        console.error("Gemini TTS failed:", error);
        return null;
    }
};

export const performSearch = async (query: string): Promise<string> => {
    const ai = getAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: query }] }],
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response.text || "I'm sorry, I couldn't find any information on that.";
    } catch (error) {
        console.error("Google Search failed:", error);
        return "I'm sorry, I encountered an error while searching the web.";
    }
};

export const generateWebsiteCode = async (request: string, existingFiles: Record<string, string> | null): Promise<Record<string, string>> => {
    const ai = getAi();
    const prompt = `You are an expert web developer.
The user wants to build a website: "${request}"

${existingFiles ? `Existing project files:
${JSON.stringify(existingFiles, null, 2)}` : ''}

Generate a complete, modern, and responsive website using HTML, CSS (Tailwind CSS), and JavaScript.
Return a JSON object where the keys are file paths and the values are the file contents.
Ensure the project includes an 'index.html' file.
Use 'https://cdn.tailwindcss.com' for Tailwind CSS.
Return ONLY the JSON object.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: 'application/json',
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate website code.");
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse website code JSON:", text);
        throw new Error("Failed to parse the generated website code. Please try again.");
    }
};
