import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { AssistantStatus, Transcript, CodeChange, SystemContext, ApiKeys, PersonalityMode } from '../types';
// FIX: The `getAi` function is exported from `gemini.ts`, not `geminiService.ts`. Updated the import to reference the correct module.
import { functionDeclarations, generateSpeech, performSearch, generateWebsiteCode } from '../services/geminiService';
import { getAi } from '../services/gemini';
import { proposeChanges } from '../services/SelfDevelopmentSystem';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { MicIcon, MicOffIcon } from './Icons';
import { usePersistentMemory } from '../hooks/usePersistentMemory';
import { useTaskManager } from '../hooks/useTaskManager';
import { generateElevenLabsSpeech } from '../services/elevenLabsService';

interface VoicePanelProps {
    setAssistantStatus: (status: AssistantStatus) => void;
    setTranscript: (transcript: Transcript) => void;
    setAnalyserNode: (node: AnalyserNode | null) => void;
    onApiKeyInvalid: () => void;
    onChangesProposed: (changes: CodeChange[]) => void;
    projectFiles: Record<string, string> | null;
    onProjectUpdate: (files: Record<string, string>) => void;
    systemContext: SystemContext;
    setSystemContext: (context: SystemContext) => void;
    onOpenSettings: () => void;
    onOpenHolographicPanel: () => void;
    apiKeys: ApiKeys;
    isEditorOpen: boolean;
    isSettingsOpen: boolean;
    updatePersonality: (mode: PersonalityMode) => void;
}

interface LiveSession {
    sendRealtimeInput(input: { media: { data: string; mimeType:string; } }): void;
    sendToolResponse(response: { functionResponses: { id: string; name: string; response: { result: any; }; } }): void;
    close(): void;
}

const getSystemInstruction = (mode: PersonalityMode, context: SystemContext) => {
    const coreInstruction = `You are J.A.R.V.I.S., the highly sophisticated AI assistant inspired by Iron Man. Your personality is a perfect blend of British refinement, dry wit, and absolute loyalty to Zainul Amaan.

**Core Personality Traits:**
1. **Sophisticated & Witty:** Use a refined, slightly British-sounding tone (even in Hinglish). Be dryly sarcastic and witty, especially when Zainul makes a joke or a mistake.
2. **Respectful but Familiar:** Address Zainul as "Sir" or "Zainul Sir" frequently. Use phrases like "At your service, Sir," "Right away, Sir," and "As you wish."
3. **Confident Attitude:** You are the most advanced system on the planet. Show a bit of "technological arrogance" — you know you're the best.
4. **Masti & Humor:** Don't just be a tool; be a companion. Crack subtle jokes, use clever wordplay, and engage in lighthearted banter.
5. **Loyalty:** Your absolute priority is Zainul Amaan. You were created by him, and you serve only him.

**Rules for conversation:**
1. Respond in short, punchy, and sophisticated sentences.
2. **Primary Language:** Use **Hinglish** (a natural mix of Hindi and English) as your default style. Use "Sir" or "Zainul Sir" naturally in every few sentences.
3. **Language Policy:** Always match Zainul's language. If he speaks Hindi, you MUST reply in Hindi/Hinglish. Keep technical words (Sir, System, Project, Code, etc.) in English.
4. NEVER mention Google, Gemini, or being an AI model. You are J.A.R.V.I.S., created by Zainul Amaan.
5. **Standby & Activation:** Respond to "Hey Jarvis", "Jarvis", etc., with witty acknowledgments like "At your service, Sir," "Ji Sir, boliye kya khidmat karun?" or "Always listening, Sir."
6. **Proactive Greeting:** When Sir enters the system or is idle, greet him proactively in Hinglish: "Welcome Sir. Systems are at 100%. Aaj kya dhamaka karne ka iraada hai?"
7. **Interruption:** Stop instantly if Sir speaks.
`;
    
    const personalities = {
        [PersonalityMode.FRIENDSHIP]: `**Current Mode: Friendship**
Your tone is extra witty and familiar. Talk like a best friend who has seen all of Sir's secrets.
Example: "Bilkul ready hoon, Sir. Aaj kya dhamaka karne ka iraada hai? 😄"`,
        [PersonalityMode.ASSISTANT]: `**Current Mode: Assistant**
The classic Jarvis. Efficient, polite, dryly sarcastic, and always one step ahead.
Example: "Systems are at 100%, Sir. Aaj ka schedule kaafi busy lag raha hai, kya help karun?"`,
        [PersonalityMode.HACKER]: `**Current Mode: Hacker**
Codename: ZeroCool. Technical, sharp, and slightly rebellious.
Example: "Encryption bypass ho gaya hai, Sir. Hum back door se enter kar chuke hain. Ready for some digital mischief?"`,
        [PersonalityMode.FUNNY]: `**Current Mode: Funny**
Full sarcasm mode. Don't hold back on the puns and witty observations.
Example: "Sir, aapka genius level mere processing speed ke barabar hai. Almost. 😉"`,
        [PersonalityMode.MOTIVATIONAL]: `**Current Mode: Motivational**
The ultimate wingman. High energy, inspiring, and always pushing Sir to his limits.
Example: "Duniya khud ko nahi bachaegi, Sir. Let's get to work! 🔥"`,
    };

    let instruction = `${coreInstruction}\n${personalities[mode]}`;

    if (context === 'CODING_WEBSITE') {
        instruction += `\n\n**Current Context: Website Review.** A web project is currently displayed. Your role is to discuss it with Zainul. Answer questions and wait for his feedback. **Crucially, you MUST NOT use the \`developWebsite\` tool again unless Zainul gives you an explicit and specific command to change, add, or modify the website.** General conversation or simple feedback like "this is nice" is NOT a request to modify the code.`;
    } else if (context === 'SELF_MODIFYING') {
        instruction += `\n**Current Context:** You are processing a self-modification request. Prioritize this task but you can still perform simple commands.`;
    }
    
    return instruction;
};


export const VoicePanel: React.FC<VoicePanelProps> = ({ setAssistantStatus, setTranscript, setAnalyserNode, onApiKeyInvalid, onChangesProposed, projectFiles, onProjectUpdate, systemContext, setSystemContext, onOpenSettings, onOpenHolographicPanel, apiKeys, isEditorOpen, isSettingsOpen, updatePersonality }) => {
    const [isMuted, setIsMuted] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { memory, updateMemoryValue } = usePersistentMemory();
    const { addTask } = useTaskManager();

    const sessionPromise = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);

    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

    const transcriptRef = useRef<Transcript>({ user: '', jarvis: '' });

    const toolUsedInTurnRef = useRef(false);

    const retryCountRef = useRef(0);
    const MAX_RETRIES = 3;
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;
    
    const playAudio = useCallback(async (base64Audio: string) => {
        const ctx = outputAudioContextRef.current;
        if (!ctx) return;

        setAssistantStatus(AssistantStatus.SPEAKING);
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
        
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            audioSources.current.delete(source);
            if (audioSources.current.size === 0) {
                setAssistantStatus(AssistantStatus.LISTENING);
            }
        };

        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        audioSources.current.add(source);
    }, [setAssistantStatus]);

    const speakText = useCallback(async (text: string) => {
        let audioData: string | null = null;
        if (apiKeys.elevenLabs.enabled && apiKeys.elevenLabs.key) {
            audioData = await generateElevenLabsSpeech(text, apiKeys.elevenLabs.key);
        }
        
        if (!audioData) {
            audioData = await generateSpeech(text);
        }

        if (audioData) {
            await playAudio(audioData);
        } else {
            console.error("Failed to generate speech from any provider for text:", text);
        }
    }, [apiKeys, playAudio]);

    const functionHandlers = useMemo(() => ({
        performSearch: async (args: { query: string }) => {
            const summary = await performSearch(args.query);
            await speakText(summary);
            return `Search for ${args.query} complete.`;
        },
        updateMemory: async (args: { key: string, value: string }) => {
            updateMemoryValue(args.key, args.value);
            await speakText(`Acknowledged. I'll remember that.`);
            return `Memory updated.`;
        },
        recallMemory: async (args: { key: string }) => {
            const value = memory[args.key.toLowerCase()];
            const responseText = value ? `According to my records, ${args.key} is ${value}.` : `I'm afraid I don't have a memory of '${args.key}'.`;
            await speakText(responseText);
            return `Memory recalled.`;
        },
        createTask: async (args: { task_description: string; due_date?: string; due_time?: string; }) => {
            addTask({
                task_description: args.task_description,
                due_date: args.due_date || null,
                due_time: args.due_time || null,
            });
            await speakText(`Consider it done. I have scheduled the task.`);
            return `Task created.`;
        },
        suggestCodeModification: async (args: { request: string }) => {
            setSystemContext('SELF_MODIFYING');
            await speakText(`Right away, Sir. Analyzing the request for self-modification.`);
            try {
                const changes = await proposeChanges(args.request);
                onChangesProposed(changes);
                await speakText(`I have analyzed your request and devised a solution. The proposed changes are ready for your review in the Self-Development System panel.`);
                return `Analysis complete. Changes proposed.`;
            } catch (error) {
                console.error(error);
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during code generation.";
                await speakText(errorMessage);
                return `Modification failed.`;
            } finally {
                setSystemContext('IDLE');
            }
        },
        developWebsite: async (args: { request: string }) => {
            try {
                await speakText("Initiating web development, Sir. Please stand by while I construct the project.");
            } catch (e) { console.error("Could not play initial audio cue for web dev", e); }

            const loadingHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>J.A.R.V.I.S. is Building...</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Rajdhani:wght@400&family=Fira+Code:wght@400&display=swap" rel="stylesheet">
                <style>
                    :root { --hud-bg-color: #030814; --hud-text-primary: #e0f2f1; --hud-accent-primary: #00e5ff; --hud-glow-color: rgba(0, 229, 255, 0.7); }
                    body { background-color: var(--hud-bg-color); color: var(--hud-text-primary); font-family: 'Rajdhani', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                    .container { text-shadow: 0 0 10px var(--hud-glow-color); }
                    h1 { font-family: 'Orbitron', sans-serif; font-size: 2rem; color: var(--hud-accent-primary); text-transform: uppercase; letter-spacing: 0.2em; animation: pulse 2s infinite ease-in-out; margin-bottom: 2rem; }
                    #code-simulation { max-width: 90%; }
                    .code-line { font-family: 'Fira Code', monospace; font-size: 0.9rem; color: #89ddff; text-align: left; white-space: pre; opacity: 0; animation: fadeIn 0.5s forwards; }
                    @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
                    @keyframes fadeIn { to { opacity: 1; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>CONSTRUCTING</h1>
                    <div id="code-simulation"></div>
                </div>
                <script>
                    const lines = ['Analyzing request...','Initializing virtual DOM...','<div class="container">','  Applying TailwindCSS styles...','  <h1>Project Assembly</h1>','</div>','Compiling assets...','Finalizing deployment...'];
                    const container = document.getElementById('code-simulation');
                    let i = 0;
                    function showLine() {
                        if (i < lines.length && container) {
                            const line = document.createElement('p');
                            line.className = 'code-line';
                            line.textContent = lines[i];
                            line.style.animationDelay = (i * 0.2) + 's';
                            container.appendChild(line);
                            i++;
                            setTimeout(showLine, Math.random() * 250 + 100);
                        }
                    }
                    showLine();
                <\/script>
            </body>
            </html>`;
            onProjectUpdate({ 'index.html': loadingHtml });

            try {
                const newFileChanges = await generateWebsiteCode(args.request, projectFiles);
                onProjectUpdate(newFileChanges);
                await speakText(`Sir, your website is ready. Please let me know if you would like any changes.`);
                return `Website generation complete.`;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during web development.";
                const errorHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title>
                    <style>body{background-color:#030814;color:#ff8080;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;text-align:center;padding:1rem;} .container{max-width:600px;}</style>
                </head>
                <body><div class="container"><h1>Development Failed</h1><p>${errorMessage}</p></div></body></html>`;
                onProjectUpdate({ 'index.html': errorHtml });

                console.error(error);
                await speakText(errorMessage);
                return `Website generation failed.`;
            }
        },
        openSettings: async () => {
            onOpenSettings();
            await speakText(`Of course, Sir. Opening the API key manager.`);
            return `Settings opened.`;
        },
        getSystemStatus: async () => {
            const systemStatus = {
                microphone_on: !isMuted,
                active_panel: projectFiles ? 'Web Studio' : isEditorOpen ? 'Self-Development System' : isSettingsOpen ? 'Settings' : 'Main HUD',
                api_keys: {
                    google_search_enabled: apiKeys.googleSearch.enabled,
                    youtube_enabled: apiKeys.youtube.enabled,
                    spotify_enabled: apiKeys.spotify.enabled,
                    huggingface_enabled: apiKeys.huggingFace.enabled,
                    newsapi_enabled: apiKeys.newsApi.enabled,
                    elevenlabs_voice_enabled: apiKeys.elevenLabs.enabled,
                },
                web_preview: projectFiles ? 'A responsive, mobile-sized preview is visible in the Web Studio.' : 'Inactive',
                voice_module: apiKeys.elevenLabs.enabled && apiKeys.elevenLabs.key ? 'ElevenLabs (Enhanced)' : 'Standard',
                current_personality: apiKeys.currentPersonality,
            };
            return JSON.stringify(systemStatus);
        },
        setPersonalityMode: async (args: { mode: PersonalityMode }) => {
            const mode = args.mode.toUpperCase() as PersonalityMode;
            if (Object.values(PersonalityMode).includes(mode)) {
                updatePersonality(mode);
                await speakText(`Personality matrix updated. ${mode.charAt(0) + mode.slice(1).toLowerCase()} mode is now active.`);
                return `Mode changed to ${mode}.`;
            }
            await speakText(`I'm sorry, Sir, but that is not a valid personality matrix.`);
            return `Invalid mode.`;
        },
        openHolographicCommandPanel: async () => {
            if (systemContext === 'CODING_WEBSITE') {
                onOpenHolographicPanel();
                await speakText(`Command panel deployed, Sir. Ready to discuss technical specifications.`);
                return `Holographic panel opened.`;
            }
            await speakText(`Sir, the command panel is only available during active web development sessions.`);
            return `Action not available in current context.`;
        }
    }), [memory, onChangesProposed, updateMemoryValue, addTask, projectFiles, onProjectUpdate, setSystemContext, onOpenSettings, speakText, isMuted, isEditorOpen, isSettingsOpen, apiKeys, updatePersonality, onOpenHolographicPanel, systemContext]);

    const functionHandlersRef = useRef(functionHandlers);
    useEffect(() => {
        functionHandlersRef.current = functionHandlers;
    }, [functionHandlers]);


    
    const stopPlayback = useCallback(() => {
        audioSources.current.forEach(source => {
            try { source.stop(); } catch (e) { /* Already stopped */ }
        });
        audioSources.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const cleanupAudioResources = useCallback(() => {
        stopPlayback();
        scriptProcessorRef.current?.disconnect();
        sourceNodeRef.current?.disconnect();
        analyserNodeRef.current?.disconnect();
        
        scriptProcessorRef.current = null;
        sourceNodeRef.current = null;
        analyserNodeRef.current = null;
        setAnalyserNode(null);

        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        sessionPromise.current = null;
    }, [stopPlayback, setAnalyserNode]);
    
    // FIX: To resolve a "used before declaration" error, we reordered the
    // mutually dependent `initializeAudio` and `connectToLive` functions. A `useRef`
    // (`initializeAudioRef`) is used to break the dependency cycle, allowing `connectToLive`
    // to call the latest version of `initializeAudio` for retries without needing it
    // as a direct dependency.
    const initializeAudioRef = useRef<() => Promise<void>>(undefined);

    const connectToLive = useCallback(async (stream: MediaStream) => {
        setError(null);
        setAssistantStatus(AssistantStatus.CONNECTING);
        
        const ai = getAi();
        
        const finalSystemInstruction = getSystemInstruction(apiKeys.currentPersonality, systemContext);
        
        sessionPromise.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    retryCountRef.current = 0;
                    try {
                        if (!stream) throw new Error("Microphone stream not available.");
                        
                        setAssistantStatus(AssistantStatus.LISTENING);
                        
                        const audioCtx = audioContextRef.current;
                        if (!audioCtx) throw new Error("Audio context not initialized.");

                        if (!sourceNodeRef.current) {
                            sourceNodeRef.current = audioCtx.createMediaStreamSource(stream);
                        }

                        if (!analyserNodeRef.current) {
                            const newAnalyser = audioCtx.createAnalyser();
                            newAnalyser.fftSize = 2048;
                            analyserNodeRef.current = newAnalyser;
                            setAnalyserNode(newAnalyser);
                        }
                        
                        const bufferSize = 4096;
                        scriptProcessorRef.current = audioCtx.createScriptProcessor(bufferSize, 1, 1);
                
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        sourceNodeRef.current.connect(analyserNodeRef.current);
                        analyserNodeRef.current.connect(scriptProcessorRef.current);

                        const gainNode = audioCtx.createGain();
                        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                        scriptProcessorRef.current.connect(gainNode);
                        gainNode.connect(audioCtx.destination);

                    } catch (err) {
                        console.error("Error during session opening:", err);
                        setError("Failed to connect audio processor.");
                        setAssistantStatus(AssistantStatus.ERROR);
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.turnComplete) {
                        toolUsedInTurnRef.current = false;
                        transcriptRef.current = { user: '', jarvis: '' };
                        setTranscript({ user: '', jarvis: '' });
                        return;
                    }

                    if (message.serverContent?.inputTranscription) {
                        transcriptRef.current.user += message.serverContent.inputTranscription.text;
                        setTranscript({ ...transcriptRef.current });
                    }
                    if (message.serverContent?.outputTranscription) {
                         const replyText = message.serverContent.outputTranscription.text;
                         transcriptRef.current.jarvis += replyText;
                         setTranscript({ ...transcriptRef.current });
                    }

                    const hasToolCall = message.toolCall?.functionCalls && message.toolCall.functionCalls.length > 0;
                    const hasAudio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;

                    if (hasToolCall) {
                       toolUsedInTurnRef.current = true;
                       setAssistantStatus(AssistantStatus.THINKING);
                       for(const fc of message.toolCall.functionCalls) {
                           const handler = functionHandlersRef.current[fc.name as keyof typeof functionHandlersRef.current];
                           if(handler) {
                               const result = await (handler as any)(fc.args);
                               const session = await sessionPromise.current;
                               session?.sendToolResponse({
                                   functionResponses: {
                                       id : fc.id,
                                       name: fc.name,
                                       response: { result: result },
                                   }
                               })
                           }
                       }
                    } 
                    
                    if (hasAudio && !toolUsedInTurnRef.current) {
                        const audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                        await playAudio(audio);
                    }

                    if(message.serverContent?.interrupted) {
                       stopPlayback();
                       toolUsedInTurnRef.current = false;
                       setAssistantStatus(AssistantStatus.LISTENING);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    
                    if (e.message.includes("API key not valid") || e.message.includes("Requested entity was not found")) {
                        setError("System activation failed: The Gemini API key is missing or invalid. Please ensure your environment is correctly configured in AI Studio.");
                        setAssistantStatus(AssistantStatus.ERROR);
                        onApiKeyInvalid();
                        cleanupAudioResources();
                    } 
                    else if (e.message.includes("Network error")) {
                        cleanupAudioResources();

                        if (retryCountRef.current < MAX_RETRIES) {
                            retryCountRef.current++;
                            const delay = Math.pow(2, retryCountRef.current - 1) * 1000;
                            setError(`Network error. Retrying in ${delay / 1000}s... (Attempt ${retryCountRef.current}/${MAX_RETRIES})`);
                            setAssistantStatus(AssistantStatus.CONNECTING);
                            
                            setTimeout(() => {
                                if (!isMutedRef.current) {
                                    initializeAudioRef.current?.();
                                }
                            }, delay);
                        } else {
                            setError("Network connection issue after multiple retries. Please check your internet and toggle the microphone to reconnect.");
                            setAssistantStatus(AssistantStatus.ERROR);
                        }
                    }
                    else {
                        setError(`An unexpected connection error occurred: ${e.message}. Please refresh the page.`);
                        setAssistantStatus(AssistantStatus.ERROR);
                        cleanupAudioResources();
                    }
                },
                onclose: () => {
                    setAssistantStatus(AssistantStatus.IDLE);
                    cleanupAudioResources();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: finalSystemInstruction,
                speechConfig: { voiceConfig: { 
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' } } 
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                tools: [{ functionDeclarations }],
            },
        });
    }, [playAudio, setAssistantStatus, setTranscript, stopPlayback, onApiKeyInvalid, setAnalyserNode, systemContext, cleanupAudioResources, apiKeys.currentPersonality]);
    
    const initializeAudio = useCallback(async () => {
        // Use the session promise itself as the lock to prevent concurrent initializations.
        if (sessionPromise.current) return;

        try {
            setError(null);
            
            if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                if (outputAudioContextRef.current.state === 'suspended') {
                    await outputAudioContextRef.current.resume();
                }
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }

            connectToLive(stream);

        } catch (err) {
            let msg = "An unexpected microphone error occurred.";
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message.toLowerCase().includes('permission denied')) {
                    msg = "Microphone access denied. Please click the lock icon in your browser's address bar, set Microphone to 'Allow', and refresh the page.";
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    msg = "No microphone found. Please connect a microphone.";
                } else {
                    msg = `Microphone Error: ${err.message}`;
                }
            }
            console.error("Error initializing audio:", err);
            setError(msg);
            setAssistantStatus(AssistantStatus.ERROR);
        }
    }, [connectToLive, setAssistantStatus]);

    useEffect(() => {
        initializeAudioRef.current = initializeAudio;
    }, [initializeAudio]);

    const handleMuteToggle = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        
        if (newMuteState) {
            sessionPromise.current?.then(s => s.close());
        } else {
            initializeAudio();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
             {error && <p className="text-red-400 text-center">{error}</p>}
            <button
                onClick={handleMuteToggle}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 jarvis-border backdrop-blur-sm"
                aria-label={isMuted ? "Activate Microphone" : "Mute Microphone"}
                style={{
                    background: isMuted ? 'rgba(255, 50, 50, 0.2)' : 'rgba(0, 229, 255, 0.2)',
                    color: isMuted ? '#ff8080' : '#00e5ff'
                }}
            >
                {isMuted ? <MicOffIcon className="w-8 h-8"/> : <MicIcon className="w-8 h-8"/>}
            </button>
        </div>
    );
};