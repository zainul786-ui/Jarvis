
import { GoogleGenAI } from "@google/genai";

let geminiApiKey: string | null = null;

export const initializeApi = (key: string): void => {
    geminiApiKey = key;
};

export const getAi = (): GoogleGenAI => {
    if (!geminiApiKey) {
        // This should not happen in normal operation as the UI forces key entry.
        // This is a safeguard.
        throw new Error("Gemini API key has not been initialized. Please set it first.");
    }
    // Create a new instance on every call to be safe.
    return new GoogleGenAI({ apiKey: geminiApiKey });
};
