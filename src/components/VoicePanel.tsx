import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantStatus, Transcript, ApiKeys } from '../types';
import { queryGrok } from '../services/grokService';
import { MicIcon, MicOffIcon } from './Icons';

interface VoicePanelProps {
    setAssistantStatus: (status: AssistantStatus) => void;
    setTranscript: (transcript: Transcript) => void;
    setAnalyserNode: (node: AnalyserNode | null) => void;
    apiKeys: ApiKeys;
    onYouTubePlay: (query: string) => Promise<boolean>;
    isCompact?: boolean;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({ 
    setAssistantStatus, 
    setTranscript, 
    setAnalyserNode, 
    apiKeys, 
    onYouTubePlay,
    isCompact = false
}) => {
    const [isMuted, setIsMuted] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [manualCommand, setManualCommand] = useState('');

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    useEffect(() => {
        const loadVoices = () => {
            voicesRef.current = synthesisRef.current.getVoices();
        };
        loadVoices();
        if (synthesisRef.current.onvoiceschanged !== undefined) {
            synthesisRef.current.onvoiceschanged = loadVoices;
        }
    }, []);

    const speakText = useCallback((text: string) => {
        if (!text) return;
        
        // Stop any current speaking
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a good voice
        const voices = voicesRef.current.length > 0 ? voicesRef.current : synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes('Google UK English Male') || 
            v.name.includes('Daniel') || 
            v.name.includes('Male') ||
            v.lang.startsWith('en-GB')
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.pitch = 0.9;
        utterance.rate = 1.0;

        utterance.onstart = () => setAssistantStatus(AssistantStatus.SPEAKING);
        utterance.onend = () => {
            setAssistantStatus(AssistantStatus.LISTENING);
            if (!isMutedRef.current) {
                startListening();
            }
        };
        utterance.onerror = () => setAssistantStatus(AssistantStatus.IDLE);

        synthesisRef.current.speak(utterance);
    }, [setAssistantStatus]);

    const processCommand = useCallback(async (text: string) => {
        if (!text) return;
        
        setAssistantStatus(AssistantStatus.THINKING);
        setTranscript({ user: text, jarvis: 'Thinking...' });

        // Check for basic local commands first
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('play') || lowerText.includes('gana bajao')) {
            const query = text.replace(/play|gana bajao/gi, '').trim();
            if (query) {
                speakText(`Searching for ${query} on YouTube, Sir.`);
                const success = await onYouTubePlay(query);
                if (success) {
                    setTranscript({ user: text, jarvis: `Playing ${query} on YouTube.` });
                    return;
                }
            }
        }

        if (lowerText.includes('status') || lowerText.includes('system check')) {
            const status = `Systems are operational, Sir. Grok Neural Core is ${apiKeys.grok.key ? 'ONLINE' : 'OFFLINE'}. YouTube integration is ${apiKeys.youtube.key ? 'ACTIVE' : 'INACTIVE'}.`;
            setTranscript({ user: text, jarvis: status });
            speakText(status);
            return;
        }

        // Default: Ask Grok
        if (!apiKeys.grok.key || !apiKeys.grok.enabled) {
            const msg = "Sir, the Grok API is not configured. Please provide a key in the settings.";
            setTranscript({ user: text, jarvis: msg });
            speakText(msg);
            return;
        }

        try {
            const response = await queryGrok(text, apiKeys.grok.key);
            setTranscript({ user: text, jarvis: response });
            speakText(response);
        } catch (err) {
            console.error(err);
            const msg = "I'm sorry, Sir. I encountered an error while communicating with the Grok mainframe.";
            setTranscript({ user: text, jarvis: msg });
            speakText(msg);
        }
    }, [apiKeys.grok, apiKeys.youtube, onYouTubePlay, setAssistantStatus, setTranscript, speakText]);

    const startListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Already started
            }
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setAssistantStatus(AssistantStatus.LISTENING);
            };

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                processCommand(text);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setError("Microphone access denied.");
                }
                setAssistantStatus(AssistantStatus.IDLE);
            };

            recognition.onend = () => {
                if (!isMutedRef.current && synthesisRef.current.speaking === false) {
                    // Restart listening if not muted and not speaking
                    startListening();
                }
            };

            recognitionRef.current = recognition;
        } else {
            setError("Speech recognition not supported in this browser.");
        }

        // Initialize Analyser for visualizer (using dummy data or real mic if possible)
        const initAnalyser = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserNodeRef.current = analyser;
                setAnalyserNode(analyser);
                audioContextRef.current = ctx;
            } catch (e) {
                console.warn("Could not initialize analyser for visualizer:", e);
            }
        };

        initAnalyser();

        return () => {
            stopListening();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [processCommand, setAnalyserNode, setAssistantStatus, startListening, stopListening]);

    const handleMuteToggle = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nextMuted) {
            stopListening();
            synthesisRef.current.cancel();
            setAssistantStatus(AssistantStatus.IDLE);
        } else {
            startListening();
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCommand.trim()) {
            processCommand(manualCommand.trim());
            setManualCommand('');
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center ${isCompact ? 'w-auto' : 'space-y-4 w-full max-w-md'}`}>
             {error && !isCompact && <p className="text-red-400 text-center text-xs">{error}</p>}
            
            <form onSubmit={handleManualSubmit} className={`flex items-center ${isCompact ? 'space-x-0' : 'w-full space-x-2 px-4'}`}>
                {!isCompact && (
                    <input
                        type="text"
                        value={manualCommand}
                        onChange={(e) => setManualCommand(e.target.value)}
                        placeholder="Type command or speak..."
                        className="flex-grow bg-black/40 border border-cyan-500/30 rounded-full px-4 py-2 text-cyan-100 text-sm focus:outline-none focus:border-cyan-500/60 transition-all"
                    />
                )}
                <button
                    onClick={handleMuteToggle}
                    className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full flex items-center justify-center transition-all duration-300 jarvis-border backdrop-blur-sm flex-shrink-0`}
                    aria-label={isMuted ? "Activate Microphone" : "Mute Microphone"}
                    type="button"
                    style={{
                        background: isMuted ? 'rgba(255, 50, 50, 0.2)' : 'rgba(0, 229, 255, 0.2)',
                        color: isMuted ? '#ff8080' : '#00e5ff'
                    }}
                >
                    {isMuted ? <MicOffIcon className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`}/> : <MicIcon className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'}`}/>}
                </button>
            </form>
        </div>
    );
};
