
import { GoogleGenAI } from "@google/genai";

let geminiApiKey: string | null = null;

export const initializeApi = (key: string): void => {
    geminiApiKey = key;
};

export const getAi = (): GoogleGenAI => {
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // This should not happen in normal operation as the platform provides the key.
        throw new Error("Gemini API key is missing. Please ensure the environment is correctly configured.");
    }
    // Create a new instance on every call to be safe.
    return new GoogleGenAI({ apiKey });
};
