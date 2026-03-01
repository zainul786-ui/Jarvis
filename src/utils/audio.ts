export const floatToPcm = (float32Array: Float32Array): Int16Array => {
    const pcm = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm;
};

export const arrayBufferToBase64 = (buffer: ArrayBufferLike): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const decode = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export const createBlob = (data: ArrayBuffer, mimeType: string): Blob => {
    return new Blob([data], { type: mimeType });
};

export const decodeAudioData = async (data: ArrayBuffer, context: AudioContext): Promise<AudioBuffer> => {
    try {
        // IMPORTANT: decodeAudioData detaches the buffer. 
        // We pass a slice to keep the original buffer available for the fallback.
        return await context.decodeAudioData(data.slice(0));
    } catch (e) {
        // If native decoding fails, assume it's raw 16-bit PCM (common for Gemini Live/TTS)
        console.warn("Native decodeAudioData failed, attempting manual PCM decoding...");
        return pcmToAudioBuffer(data, context, 24000);
    }
};

export const pcmToAudioBuffer = (data: ArrayBuffer, context: AudioContext, sampleRate: number): AudioBuffer => {
    const int16Array = new Int16Array(data);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }
    
    const audioBuffer = context.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);
    return audioBuffer;
};
