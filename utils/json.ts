
export const extractAndParseJson = <T>(text: string): T => {
    // Attempt to find a JSON object or array within the text, including markdown-fenced blocks.
    const match = text.match(/```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!match) {
        throw new Error("No valid JSON object or array found in the response text.");
    }
    
    // The first capture group is for ```json blocks, the second is for raw objects/arrays.
    const jsonString = match[1] || match[2];
    if (!jsonString) {
        throw new Error("Extracted JSON string is empty.");
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error("Failed to parse extracted JSON:", jsonString, error);
        throw new Error("The AI returned a malformed JSON response.");
    }
};
