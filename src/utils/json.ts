export const extractAndParseJson = <T>(text: string): T => {
    try {
        // Try to find JSON block in markdown
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : text;
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error("Failed to parse JSON from text:", text, error);
        throw new Error("Invalid JSON response from AI.");
    }
};
