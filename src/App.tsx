
// J.A.R.V.I.S. HUD - Version 2.1.1 (Grok Integration Fix)
import React, { useState, useEffect, useCallback } from 'react';
import { VoicePanel } from './components/VoicePanel';
import { ArcReactorIcon } from './components/Icons';
import { AssistantStatus, Transcript } from './types';
import { VoiceVisualizer } from './components/JarvisVisualizer';
import { useApiKeys } from './hooks/useApiKeys';
import { SettingsPanel } from './components/SettingsPanel';
import { YouTubePlayer } from './components/YouTubePlayer';
import { searchYouTube, YouTubeVideo } from './services/youtubeService';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { 
    Shield, 
    Wifi, 
    Cpu, 
    Clock, 
    Key, 
    MessageSquare, 
    Eye, 
    Code, 
    Download,
    Settings,
    ChevronRight,
    Monitor
} from 'lucide-react';

const BackgroundFX = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(0,194,255,0.08)_0,_transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22%2300c2ff%22%20fill-opacity=%220.03%22%20fill-rule=%22evenodd%22%3E%3Cpath%20d=%22M0%2040L40%200H20L0%2020M40%2040V20L20%2040%22/%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
    </div>
);

const TopStatusBar = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-orbitron text-cyan-400/60 border-b border-cyan-500/10 backdrop-blur-sm">
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                    <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span className="text-cyan-400">SYS ONLINE</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Wifi className="w-3 h-3" />
                    <span>CONNECTED</span>
                </div>
            </div>
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                    <Shield className="w-3 h-3" />
                    <span>ENCRYPTED</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3" />
                    <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
            </div>
        </header>
    );
};

const SplashScreen: React.FC = () => (
    <div className="fixed inset-0 z-[100] bg-[#030814] flex flex-col items-center justify-center">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
        >
            <ArcReactorIcon className="w-32 h-32 text-cyan-400 animate-[spin_8s_linear_infinite]" />
            <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full animate-pulse"></div>
        </motion.div>
        <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8 font-orbitron text-4xl font-bold text-cyan-300 jarvis-glow uppercase tracking-[0.4em]"
        >
            J.A.R.V.I.S.
        </motion.h1>
        <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-2 text-cyan-400/50 uppercase tracking-[0.3em] text-[10px]"
        >
            Initializing Neural Core...
        </motion.p>
    </div>
);

type AppState = 'loading' | 'requires_key' | 'ready';
type ViewMode = 'chat' | 'preview' | 'code';
const API_KEY_STORAGE_KEY = 'grok_api_key';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('loading');
    const [viewMode, setViewMode] = useState<ViewMode>('chat');
    const [showSplash, setShowSplash] = useState(true);
    const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
    const [transcript, setTranscript] = useState<Transcript>({ user: '', jarvis: '' });
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const [localGrokKey, setLocalGrokKey] = useState('');

    // Settings state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { apiKeys, updateApiKeys } = useApiKeys();
    const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (apiKeys.grok.key && apiKeys.grok.enabled) {
            setAppState('ready');
        } else {
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (storedKey) {
                setAppState('ready');
            } else {
                setAppState('requires_key');
            }
        }
    }, [apiKeys.grok.key, apiKeys.grok.enabled]);

    const handleApiKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const grKey = localGrokKey.trim();
        
        if (grKey) {
            const newKeys = {
                ...apiKeys,
                grok: { key: grKey, enabled: true }
            };
            updateApiKeys(newKeys);
            setAppState('ready');
        }
    };

    const handleOpenSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    const handleYouTubePlay = useCallback(async (query: string) => {
        setAssistantStatus(AssistantStatus.THINKING);
        
        const key = apiKeys.youtube.enabled ? apiKeys.youtube.key : undefined;
        if (!key) {
            setAssistantStatus(AssistantStatus.ERROR);
            setTranscript((prev: Transcript) => ({ ...prev, jarvis: `Sir, I need a YouTube API key to play music. Please provide one in the settings.` }));
            return false;
        }

        const video = await searchYouTube(query, key);
        if (video) {
            setActiveVideo(video);
            setAssistantStatus(AssistantStatus.IDLE);
            return true;
        } else {
            setAssistantStatus(AssistantStatus.ERROR);
            setTranscript((prev: Transcript) => ({ ...prev, jarvis: `I'm sorry, Sir. I couldn't find any video for "${query}" on YouTube. It might be restricted or unavailable.` }));
            return false;
        }
    }, [apiKeys.youtube.enabled, apiKeys.youtube.key, setAssistantStatus, setTranscript]);

    const downloadZip = async () => {
        const zip = new JSZip();
        
        // Add files to zip
        zip.file("index.html", `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>J.A.R.V.I.S. Project</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white">
    <div id="root"></div>
    <script>
        // Generated by J.A.R.V.I.S.
        console.log("System Online");
    </script>
</body>
</html>`);

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "jarvis-project.zip";
        link.click();
        window.URL.revokeObjectURL(url);
    };

    if (appState === 'loading') {
        return (
            <div className="bg-[#030814] min-h-screen flex items-center justify-center">
                <ArcReactorIcon className="w-24 h-24 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            </div>
        );
    }

    if (appState === 'requires_key') {
        return (
            <div className="bg-[#030814] min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <TopStatusBar />
                <BackgroundFX />
                
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 w-full max-w-md flex flex-col items-center"
                >
                    <div className="relative mb-12 group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500"></div>
                        <div className="relative w-24 h-24 rounded-full border-2 border-cyan-400/30 flex items-center justify-center bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.2)]">
                            <Key className="w-10 h-10 text-cyan-400" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-cyan-300 jarvis-glow uppercase tracking-[0.4em] font-orbitron mb-2">J.A.R.V.I.S.</h1>
                    <p className="text-[10px] text-cyan-400/60 uppercase tracking-[0.2em] mb-12 text-center">Just A Rather Very Intelligent System</p>

                    <form onSubmit={handleApiKeySubmit} className="w-full space-y-6">
                        <div className="relative group">
                            <input
                                type="password"
                                value={localGrokKey}
                                onChange={(e) => setLocalGrokKey(e.target.value)}
                                className="w-full bg-black/40 border border-cyan-500/20 rounded-xl px-4 py-4 text-cyan-100 font-mono focus:outline-none focus:border-cyan-400/50 transition-all placeholder:text-cyan-900"
                                placeholder="Enter Grok API Key"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full group flex items-center justify-center space-x-3 px-6 py-4 bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 rounded-xl hover:bg-cyan-500/20 transition-all duration-300 font-bold uppercase tracking-widest disabled:opacity-30"
                            disabled={!localGrokKey.trim()}
                        >
                            <span>Initialize System</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <p className="text-[10px] text-cyan-400/30 mt-12 text-center leading-relaxed max-w-[280px]">
                        Your API key is stored locally and never sent to any server other than xAI's API.
                    </p>
                </motion.div>
            </div>
        );
    }
    
    return (
        <div className="bg-[#030814] min-h-screen flex flex-col relative overflow-hidden">
            <AnimatePresence>
                {showSplash && <SplashScreen />}
            </AnimatePresence>
            
            <TopStatusBar />
            <BackgroundFX />

            {/* Main Content Area */}
            <main className="flex-grow relative z-10 flex flex-col pt-16 pb-24 px-4 overflow-hidden">
                <AnimatePresence mode="wait">
                    {viewMode === 'chat' && (
                        <motion.div 
                            key="chat"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-grow flex flex-col items-center justify-center relative"
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                                <div className="h-48 flex items-end pb-8">
                                    {transcript.jarvis && (
                                        <p className="text-2xl sm:text-3xl md:text-4xl text-cyan-200 jarvis-glow font-light leading-tight">
                                            {transcript.jarvis}
                                        </p>
                                    )}
                                </div>
                                <div className="h-24 flex items-start">
                                    {transcript.user && (
                                        <p className="text-lg text-cyan-400/60 italic font-light">
                                            "{transcript.user}"
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            {/* Visualizer in Chat View */}
                            <div className="relative z-0 pointer-events-none">
                                <VoiceVisualizer analyserNode={analyserNode} status={assistantStatus} />
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'preview' && (
                        <motion.div 
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex-grow flex flex-col items-center justify-center p-4"
                        >
                            <div className="w-full h-full bg-black/40 border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                                <Monitor className="text-cyan-500/40 w-12 h-12 mb-4" />
                                <p className="text-cyan-500/60 font-orbitron text-sm tracking-widest">LIVE PREVIEW ENGINE</p>
                                <p className="text-cyan-500/30 text-[10px] mt-4 max-w-md text-center px-8 uppercase tracking-widest">
                                    The live preview is currently rendering on the primary display. 
                                    Use the "Open in New Tab" feature for a full-screen experience.
                                </p>
                                <button 
                                    onClick={() => window.open(window.location.href, '_blank')}
                                    className="mt-8 px-8 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-[10px] font-orbitron hover:bg-cyan-500/20 transition-all uppercase tracking-widest"
                                >
                                    Launch External View
                                </button>
                                
                                {/* Grid background for preview area */}
                                <div className="absolute inset-0 pointer-events-none opacity-10 -z-10" 
                                     style={{ backgroundImage: 'radial-gradient(circle, #00e5ff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                            </div>
                        </motion.div>
                    )}

                    {viewMode === 'code' && (
                        <motion.div 
                            key="code"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-grow flex flex-col p-4"
                        >
                            <div className="flex-grow bg-[#0d1117] rounded-2xl border border-cyan-500/20 overflow-hidden flex flex-col">
                                <div className="bg-[#161b22] px-4 py-3 border-b border-cyan-500/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                        <span className="ml-4 text-[10px] text-cyan-500/60 font-mono uppercase tracking-widest">src/App.tsx</span>
                                    </div>
                                    <button 
                                        onClick={downloadZip}
                                        className="flex items-center space-x-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[10px] text-cyan-400 font-orbitron hover:bg-cyan-500/20 transition-all uppercase tracking-widest"
                                    >
                                        <Download className="w-3 h-3" />
                                        <span>Export Zip</span>
                                    </button>
                                </div>
                                <div className="flex-grow p-6 font-mono text-sm overflow-auto custom-scrollbar">
                                    <pre className="text-cyan-100/80">
                                        <code>{`// J.A.R.V.I.S. Core System v2.1.1
import React from 'react';
import { motion } from 'framer-motion';

export const JarvisHUD = () => {
  return (
    <div className="min-h-screen bg-black text-cyan-400">
      <header className="p-6 border-b border-cyan-500/20">
        <h1 className="text-2xl font-orbitron tracking-tighter">
          SYSTEM STATUS: ONLINE
        </h1>
      </header>
      
      <main className="container mx-auto py-12">
        <div className="grid grid-cols-3 gap-8">
          {/* HUD Elements */}
        </div>
      </main>
    </div>
  );
};`}</code>
                                    </pre>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-2 flex items-center justify-between shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                <div className="flex items-center space-x-1">
                    <button 
                        onClick={() => setViewMode('chat')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${viewMode === 'chat' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/40 hover:text-cyan-400'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Chat</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('preview')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${viewMode === 'preview' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/40 hover:text-cyan-400'}`}
                    >
                        <Eye className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Preview</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('code')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${viewMode === 'code' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/40 hover:text-cyan-400'}`}
                    >
                        <Code className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-bold tracking-widest">Code</span>
                    </button>
                </div>

                <div className="flex items-center space-x-2 pr-2">
                    <button 
                        onClick={handleOpenSettings}
                        className="p-2 text-cyan-400/40 hover:text-cyan-400 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-cyan-500/10 mx-1"></div>
                    <VoicePanel
                        setAssistantStatus={setAssistantStatus}
                        setTranscript={setTranscript}
                        setAnalyserNode={setAnalyserNode}
                        apiKeys={apiKeys}
                        onYouTubePlay={handleYouTubePlay}
                        isCompact={true}
                    />
                </div>
            </nav>

            {activeVideo && (
                <YouTubePlayer 
                    videoId={activeVideo.id}
                    title={activeVideo.title}
                    onClose={() => setActiveVideo(null)}
                />
            )}

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
                apiKeys={apiKeys}
                onSave={updateApiKeys}
            />
        </div>
    );
};

export default App;
