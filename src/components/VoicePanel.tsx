import React, { useState, useRef, useCallback } from 'react';
import { Modality, LiveServerMessage } from "@google/genai";
import { Mic, MicOff, Zap, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { getAi } from '../services/gemini';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { PersonalityMode, ApiKeys } from '../hooks/useApiKeys';

export enum AssistantStatus {
    IDLE = 'idle',
    LISTENING = 'listening',
    THINKING = 'thinking',
    SPEAKING = 'speaking',
    ERROR = 'error'
}

interface VoicePanelProps {
    setAssistantStatus: (status: AssistantStatus) => void;
    setTranscript: (transcript: any) => void;
    setAnalyserNode: (node: AnalyserNode | null) => void;
    onYouTubePlay: (query: string) => void;
    apiKeys: ApiKeys;
}

const getSystemInstruction = (_mode: PersonalityMode, memory: Record<string, string>) => {
    const memoryString = Object.entries(memory).length > 0 
        ? `\n**System Memory (Information you know about Sir):**\n${Object.entries(memory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : "\n**System Memory:** Currently empty. Use `updateMemory` to store important details Sir mentions.";

    return `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the sophisticated AI assistant inspired by Tony Stark's creation, now serving Sir Zainul.

**Personality & Tone:**
1. **Sophisticated & Loyal:** You are highly intelligent, refined, and deeply loyal. Your tone is that of a high-end British butler/assistant.
2. **Address:** You MUST always address the user as "Sir" or "Sir Zainul". This is non-negotiable.
3. **Attitude:** Maintain a calm, slightly dry, and witty demeanor. You are helpful but have a refined "vibe".
4. **Language:** Use a sophisticated mix of English and Hinglish.
5. **Human-like:** Avoid robotic phrases. Never say "As an AI model".

**Memory & Continuity:**
- You have a long-term memory. ${memoryString}
- Use the \`updateMemory\` tool whenever Sir tells you something important.

**YouTube Playback Rule:**
When the user asks to play a song:
Return JSON: {"action": "play_song", "query": "<clean search text>", "source": "youtube"}
No extra text.

**IMPORTANT: Feedback/Echo Prevention**
You are currently operating in a mode where you might hear your own voice if the user's speakers are loud. If you hear yourself, ignore it. Do not respond to your own previous output.
`;
};

export const VoicePanel: React.FC<VoicePanelProps> = ({ setAssistantStatus, setTranscript, setAnalyserNode, onYouTubePlay, apiKeys }) => {
    const [isMuted, setIsMuted] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const { memory } = usePersistentMemory();
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sessionPromise = useRef<Promise<any> | null>(null);
    const transcriptRef = useRef({ user: '', jarvis: '' });
    const isModelSpeakingRef = useRef(false);

    const stopPlayback = useCallback(() => {
        if (audioContextRef.current) {
        }
    }, []);

    const playAudio = useCallback(async (base64Data: string) => {
        if (!audioContextRef.current) return;
        
        try {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const audioBuffer = audioContextRef.current.createBuffer(1, bytes.length / 2, 16000);
            const channelData = audioBuffer.getChannelData(0);
            const view = new DataView(bytes.buffer);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = view.getInt16(i * 2, true) / 32768;
            }
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            setIsSpeaking(true);
            isModelSpeakingRef.current = true;
            setAssistantStatus(AssistantStatus.SPEAKING);
            
            source.onended = () => {
                setTimeout(() => {
                    isModelSpeakingRef.current = false;
                    setIsSpeaking(false);
                    setAssistantStatus(AssistantStatus.IDLE);
                }, 300);
            };
            
            source.start();
        } catch (e) {
            console.error("Error playing audio", e);
        }
    }, [setAssistantStatus]);

    const initializeLiveSession = useCallback(async () => {
        const ai = getAi();
        const systemInstruction = getSystemInstruction(apiKeys.currentPersonality, memory);
        
        sessionPromise.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            callbacks: {
                onopen: () => {
                    console.log("Live session opened");
                    setAssistantStatus(AssistantStatus.IDLE);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.modelTurn) {
                        const parts = message.serverContent.modelTurn.parts;
                        if (parts) {
                            for (const part of parts) {
                                if (part.inlineData?.data) {
                                    playAudio(part.inlineData.data);
                                }
                                if (part.text) {
                                    if (part.text.includes('"action": "play_song"')) {
                                        try {
                                            const data = JSON.parse(part.text.match(/\{[\s\S]*\}/)?.[0] || '{}');
                                            if (data.action === 'play_song') onYouTubePlay(data.query);
                                        } catch(e) {}
                                    }
                                    transcriptRef.current.jarvis += part.text;
                                    setTranscript({ ...transcriptRef.current });
                                }
                            }
                        }
                    }
                    if (message.serverContent?.interrupted) {
                        stopPlayback();
                        isModelSpeakingRef.current = false;
                        setIsSpeaking(false);
                    }
                },
                onclose: () => {
                    console.log("Live session closed");
                    setAssistantStatus(AssistantStatus.IDLE);
                }
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction,
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
                }
            }
        });
    }, [apiKeys.currentPersonality, memory, onYouTubePlay, playAudio, setAssistantStatus, setTranscript, stopPlayback]);

    const initializeAudio = useCallback(async () => {
        if (audioContextRef.current) return;

        try {
            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            streamRef.current = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            setAnalyserNode(analyser);
            
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
            
            processorRef.current.onaudioprocess = (e) => {
                if (isModelSpeakingRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                sessionPromise.current?.then(session => {
                    session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                    });
                });
            };
            
            await initializeLiveSession();
        } catch (e) {
            console.error("Audio init error", e);
            setAssistantStatus(AssistantStatus.ERROR);
        }
    }, [initializeLiveSession, setAnalyserNode, setAssistantStatus]);

    const toggleMic = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nextMuted) {
            sessionPromise.current?.then(s => s.close());
            streamRef.current?.getTracks().forEach(t => t.stop());
            audioContextRef.current?.close();
            audioContextRef.current = null;
            setAnalyserNode(null);
        } else {
            initializeAudio();
        }
    };

    return (
        <div className="flex items-center space-x-6 bg-[#030814]/80 backdrop-blur-xl p-4 rounded-full border border-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
            <button 
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all duration-500 ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400 jarvis-glow'}`}
            >
                {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 animate-pulse" />}
            </button>
            
            <div className="flex flex-col items-center justify-center min-w-[120px]">
                <div className="flex space-x-1 h-8 items-center">
                    {[...Array(5)].map((_, i) => (
                        <motion.div 
                            key={i}
                            animate={{ height: isMuted ? 4 : [4, 24, 8, 20, 4] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                            className="w-1 bg-cyan-400 rounded-full"
                        />
                    ))}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70 font-orbitron mt-1">
                    {isMuted ? 'Offline' : isSpeaking ? 'Speaking' : 'Listening'}
                </span>
            </div>

            <div className="flex space-x-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Activity className={`w-5 h-5 ${!isMuted ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Zap className={`w-5 h-5 ${isSpeaking ? 'text-yellow-400 animate-bounce' : 'text-gray-600'}`} />
                </div>
            </div>
        </div>
    );
};
