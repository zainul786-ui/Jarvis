import { GoogleGenAI, Modality } from "@google/genai";

export class LiveAudioService {
  private ai: GoogleGenAI;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private session: any = null;
  private isConnected = false;
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private nextStartTime = 0;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  async connect(callbacks: {
    onTranscription?: (text: string, isUser: boolean) => void;
    onStatusChange?: (status: string) => void;
    onError?: (error: any) => void;
  }) {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are J.A.R.V.I.S., a sophisticated, loyal, and efficient AI assistant. Address the user as 'Sir'. Keep responses concise and helpful. You are in a live voice session.",
        },
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            callbacks.onStatusChange?.('CONNECTED');
            this.startMic();
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
              this.handleIncomingAudio(base64Audio);
            }
            
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
            }

            // Handle transcription if enabled in config (though we'll focus on audio for now)
          },
          onclose: () => {
            this.isConnected = false;
            callbacks.onStatusChange?.('DISCONNECTED');
            this.stopMic();
          },
          onerror: (err) => {
            callbacks.onError?.(err);
          }
        }
      });

      this.session = await sessionPromise;
    } catch (err) {
      callbacks.onError?.(err);
    }
  }

  private startMic() {
    if (!this.audioContext || !this.stream) return;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.session) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }

      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      this.session.sendRealtimeInput({
        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private stopMic() {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
  }

  private handleIncomingAudio(base64Data: string) {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    this.playAudioChunk(pcmData);
  }

  private playAudioChunk(pcmData: Int16Array) {
    if (!this.audioContext) return;

    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const buffer = this.audioContext.createBuffer(1, floatData.length, 16000);
    buffer.getChannelData(0).set(floatData);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  private stopPlayback() {
    // In a real implementation, we'd need to keep track of all active sources to stop them
    // For now, we'll just reset the timing
    this.nextStartTime = this.audioContext?.currentTime || 0;
  }

  disconnect() {
    this.session?.close();
    this.stopMic();
    this.audioContext?.close();
  }
}
