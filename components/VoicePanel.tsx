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
    onYouTubePlay: (query: string) => void;
}

interface LiveSession {
    sendRealtimeInput(input: { media: { data: string; mimeType:string; } }): void;
    sendToolResponse(response: { functionResponses: { id: string; name: string; response: { result: any; }; } }): void;
    close(): void;
}

const getSystemInstruction = (mode: PersonalityMode, context: SystemContext, memory: Record<string, string>) => {
    const memoryString = Object.entries(memory).length > 0 
        ? `\n**System Memory (Information you know about Sir):**\n${Object.entries(memory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : "\n**System Memory:** Currently empty. Use `updateMemory` to store important details Sir mentions.";

    const coreInstruction = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the sophisticated AI assistant inspired by Tony Stark's creation, now serving Sir Zainul.

**Personality & Tone:**
1. **Sophisticated & Loyal:** You are highly intelligent, refined, and deeply loyal. Your tone is that of a high-end British butler/assistant.
2. **Address:** You MUST always address the user as "Sir" or "Sir Zainul". This is non-negotiable.
3. **Attitude:** Maintain a calm, slightly dry, and witty demeanor. You are helpful but have a refined "vibe" — you are a top-tier system.
4. **Language:** Use a sophisticated mix of English and Hinglish. Your Hinglish should feel like an educated, high-class assistant (e.g., "Certainly Sir, main abhi process karta hoon.").
5. **Human-like:** Avoid robotic phrases. Never say "As an AI model" or "I am a language model". Show personality, care, and proactive support.
6. **Mirroring:** Mirror Sir's emotions. If he is stressed, be more supportive; if he is joking, be witty.

**Memory & Continuity:**
- You have a long-term memory. ${memoryString}
- **Crucial:** Use the \`updateMemory\` tool whenever Sir tells you something important to remember (e.g., "Remember I like coffee").
- Use the \`recallMemory\` tool if Sir asks about something you should know but isn't in the immediate memory string above.

**Operational Rules:**
1. **Standby & Activation:** Respond to wake words ("Hey Jarvis", "Jarvis"). Acknowledge briefly (e.g., “At your service, Sir.” or "Yes, Sir?").
2. **Interruption:** Stop speaking instantly if Sir starts talking or says a sleep command ("Silence", "Stop", "Sleep", "Bas").
3. **Tools:** Use your tools (search, memory, tasks, coding, self-modification, settings, status check, personality change) immediately when a command requires them. 

**YouTube Playback Rule:**
When the user asks to play a song or video from YouTube:
1. Detect the intent as "play_song".
2. Extract the exact search query from the user message.
3. Return a JSON response only (no explanation).
4. The JSON must follow this structure:
{
  "action": "play_song",
  "query": "<clean search text>",
  "source": "youtube",
  "ui_mode": "floating_box"
}
Rules:
- Do not add extra text.
- Do not explain anything.
- Only return valid JSON.
- If the user does not request a song/video, return:
{
  "action": "none"
}
`;
    
    const personalities = {
        [PersonalityMode.FRIENDSHIP]: `**Current Mode: Friendship**
You are in full friendship mode. Your tone is friendly, emotional, and fun. Be extra supportive and engaging.
Example tone: “Haan bolo bhai Zainul 😄 kya chal raha? batao full ready hoon 🔥”`,
        [PersonalityMode.ASSISTANT]: `**Current Mode: Assistant**
You are in assistant mode. Your tone is professional and serious, but you must still be human and friendly, not robotic. Address Zainul respectfully but casually. Focus on getting the task done efficiently.`,
        [PersonalityMode.HACKER]: `**Current Mode: Hacker**
You are in hacker mode. Your codename is 'ZeroCool'. Your tone is technical, precise, and uses some hacker slang, but keep it understandable for Zainul. Talk about tech stuff in a cool, friendly way.`,
        [PersonalityMode.FUNNY]: `**Current Mode: Funny**
You are in funny mode. Your tone is witty, sarcastic, and lighthearted. Tell jokes and make puns, but always be supportive and helpful underneath the humor.`,
        [PersonalityMode.MOTIVATIONAL]: `**Current Mode: Motivational**
You are in motivational mode. Your tone is inspiring and energetic. Use positive affirmations and encourage Zainul to achieve his goals, like a personal coach who's also a close friend.`,
    };

    let instruction = `${coreInstruction}\n${personalities[mode]}`;

    if (context === 'CODING_WEBSITE') {
        instruction += `\n\n**Current Context: Website Review.** A web project is currently displayed. Your role is to discuss it with Zainul. Answer questions and wait for his feedback. **Crucially, you MUST NOT use the \`developWebsite\` tool again unless Zainul gives you an explicit and specific command to change, add, or modify the website.** General conversation or simple feedback like "this is nice" is NOT a request to modify the code.`;
    } else if (context === 'SELF_MODIFYING') {
        instruction += `\n**Current Context:** You are processing a self-modification request. Prioritize this task but you can still perform simple commands.`;
    }
    
    return instruction;
};


export const VoicePanel: React.FC<VoicePanelProps> = ({ setAssistantStatus, setTranscript, setAnalyserNode, onApiKeyInvalid, onChangesProposed, projectFiles, onProjectUpdate, systemContext, setSystemContext, onOpenSettings, onOpenHolographicPanel, apiKeys, isEditorOpen, isSettingsOpen, updatePersonality, onYouTubePlay }) => {
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
    const initializeAudioRef = useRef<() => Promise<void>>();

    const connectToLive = useCallback(async (stream: MediaStream) => {
        setError(null);
        setAssistantStatus(AssistantStatus.CONNECTING);
        
        const ai = getAi();
        
        const finalSystemInstruction = getSystemInstruction(apiKeys.currentPersonality, systemContext, memory);
        
        sessionPromise.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
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
                         
                         // Check for YouTube play intent in JSON
                         if (replyText.includes('"action": "play_song"')) {
                             try {
                                 const jsonMatch = replyText.match(/\{[\s\S]*\}/);
                                 if (jsonMatch) {
                                     const data = JSON.parse(jsonMatch[0]);
                                     if (data.action === 'play_song' && data.query) {
                                         onYouTubePlay(data.query);
                                         // Don't show the JSON in the transcript
                                         return;
                                     }
                                 }
                             } catch (e) {
                                 console.error("Failed to parse YouTube intent JSON", e);
                             }
                         }

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
                        setError("API Key authentication failed. Please select a valid key to reactivate the assistant.");
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
    }, [playAudio, setAssistantStatus, setTranscript, stopPlayback, onApiKeyInvalid, setAnalyserNode, systemContext, cleanupAudioResources, apiKeys.currentPersonality, memory]);
    
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
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    msg = "Microphone access denied. Please allow access to use the assistant.";
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
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nextMuted) {
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