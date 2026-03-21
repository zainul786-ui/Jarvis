
import axios from 'axios';

export const queryGrok = async (prompt: string, apiKey: string): Promise<string> => {
    try {
        const response = await axios.post(
            '/api/grok',
            { prompt, apiKey }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error querying Grok:', error);
        return "I'm sorry, Sir, but I'm having trouble connecting to the Grok mainframe at the moment. Please check your API key and connection.";
    }
};
