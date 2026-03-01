import axios from 'axios';

export const generateElevenLabsSpeech = async (text: string, apiKey: string): Promise<string | null> => {
    try {
        const response = await axios.post(
            'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', // Default voice
            {
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                },
            },
            {
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            }
        );

        const base64 = btoa(
            new Uint8Array(response.data).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
            )
        );
        return base64;
    } catch (error) {
        console.error("ElevenLabs TTS failed:", error);
        return null;
    }
};
