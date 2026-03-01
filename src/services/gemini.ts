import { GoogleGenAI } from "@google/genai";

let geminiApiKey: string | null = null;

export const initializeApi = (apiKey: string) => {
    geminiApiKey = apiKey;
};

export const getAi = (): GoogleGenAI => {
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API key is missing. Please ensure the environment is correctly configured.");
    }
    return new GoogleGenAI({ apiKey });
};
