import { encode } from '../utils/audio';

// Voice ID for "Adam" - a popular deep, male voice.
const ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

/**
 * Generates speech using the ElevenLabs API.
 * @param text The text to convert to speech.
 * @param apiKey The ElevenLabs API key.
 * @returns A promise that resolves to a base64 encoded audio string, or null on failure.
 */
export const generateElevenLabsSpeech = async (text: string, apiKey: string): Promise<string | null> => {
    // Request PCM format to match the existing audio pipeline.
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=pcm_24000`;
    
    const headers = {
        'Accept': 'audio/raw', // Expect raw audio data
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
    };
    const body = JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
        },
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
        });

        if (!response.ok) {
            // Try to parse error for better debugging, but don't fail hard.
            try {
                const errorBody = await response.json();
                console.error("ElevenLabs API Error:", errorBody);
            } catch {
                console.error("ElevenLabs API Error: Could not parse error response. Status:", response.status);
            }
            // Return null to allow fallback to the default TTS.
            return null;
        }

        const audioBlob = await response.blob();
        const buffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        // Encode raw PCM bytes to base64 for the audio pipeline.
        return encode(uint8Array);

    } catch (error) {
        console.error("Error calling ElevenLabs API:", error);
        return null;
    }
};
