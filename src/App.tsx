import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Settings, Cpu, Shield, Database, Wifi } from 'lucide-react';
import { VoicePanel, AssistantStatus } from './components/VoicePanel';
import { useApiKeys } from './hooks/useApiKeys';
import { initializeApi } from './services/gemini';
import { YouTubePlayer } from './components/YouTubePlayer';

const BackgroundFX = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
        <div className="scanline" />
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
    </div>
);

const HUDOverlay = () => (
    <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between border-[20px] border-cyan-500/5 rounded-[40px] m-4">
        <div className="flex justify-between items-start">
            <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-3 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 backdrop-blur-md">
                    <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-orbitron">System Status</span>
                        <span className="text-xs font-bold text-cyan-300">SECURE / ACTIVE</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 backdrop-blur-md">
                    <Database className="w-5 h-5 text-cyan-400" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-orbitron">Memory Core</span>
                        <span className="text-xs font-bold text-cyan-300">SYNCED / 100%</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end space-y-4">
                <div className="flex items-center space-x-3 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 backdrop-blur-md">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-orbitron">Network</span>
                        <span className="text-xs font-bold text-cyan-300">ENCRYPTED</span>
                    </div>
                    <Wifi className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/50 font-orbitron">Protocol</p>
                    <p className="text-lg font-black text-cyan-300 jarvis-glow font-orbitron">J.A.R.V.I.S. v2.5</p>
                </div>
            </div>
        </div>
        <div className="flex justify-between items-end">
            <div className="flex space-x-8">
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400/50 font-orbitron">CPU LOAD</span>
                    <div className="w-32 h-1 bg-cyan-900 rounded-full mt-1 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '45%' }}
                            className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                        />
                    </div>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400/50 font-orbitron">THERMAL</span>
                    <div className="w-32 h-1 bg-cyan-900 rounded-full mt-1 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '32%' }}
                            className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                        />
                    </div>
                </div>
            </div>
            <div className="flex space-x-4">
                <div className="w-12 h-12 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-500/5">
                    <Settings className="w-5 h-5 text-cyan-400/70" />
                </div>
                <div className="w-12 h-12 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-500/5">
                    <Terminal className="w-5 h-5 text-cyan-400/70" />
                </div>
            </div>
        </div>
    </div>
);

export default function App() {
    const [assistantStatus, setAssistantStatus] = useState(AssistantStatus.IDLE);
    const [transcript, setTranscript] = useState({ user: '', jarvis: '' });
    const [, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const [activeVideo, setActiveVideo] = useState<{ id: string; title: string } | null>(null);
    const { apiKeys } = useApiKeys();

    useEffect(() => {
        if (process.env.GEMINI_API_KEY) {
            initializeApi(process.env.GEMINI_API_KEY);
        }
    }, []);

    const handleYouTubePlay = useCallback((query: string) => {
        setActiveVideo({ id: 'dQw4w9WgXcQ', title: query });
    }, []);

    return (
        <div className="relative w-screen h-screen bg-[#030814] overflow-hidden flex flex-col items-center justify-center font-sans text-cyan-50">
            <BackgroundFX />
            <HUDOverlay />

            <div className="relative z-20 flex flex-col items-center justify-center">
                <div className="relative w-64 h-64 flex items-center justify-center">
                    <div className="pulse-ring" style={{ animationDelay: '0s' }} />
                    <div className="pulse-ring" style={{ animationDelay: '0.5s' }} />
                    <div className="pulse-ring" style={{ animationDelay: '1s' }} />
                    
                    <motion.div 
                        animate={{ 
                            scale: assistantStatus === AssistantStatus.SPEAKING ? [1, 1.1, 1] : 1,
                            rotate: 360
                        }}
                        transition={{ 
                            scale: { repeat: Infinity, duration: 2 },
                            rotate: { repeat: Infinity, duration: 20, ease: 'linear' }
                        }}
                        className="w-48 h-48 rounded-full border-4 border-cyan-500/40 border-t-cyan-400 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.3)] bg-cyan-500/5 backdrop-blur-sm"
                    >
                        <div className="w-32 h-32 rounded-full border-2 border-cyan-500/20 flex items-center justify-center">
                            <Cpu className={`w-12 h-12 ${assistantStatus === AssistantStatus.SPEAKING ? 'text-cyan-400 animate-pulse' : 'text-cyan-600'}`} />
                        </div>
                    </motion.div>
                </div>
                
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={assistantStatus}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-8 text-center"
                    >
                        <h1 className="text-3xl font-black uppercase tracking-[0.4em] jarvis-glow font-orbitron text-cyan-300">
                            {assistantStatus === AssistantStatus.IDLE ? 'Standby' : assistantStatus}
                        </h1>
                        <p className="text-xs text-cyan-400/60 uppercase tracking-widest mt-2 font-orbitron">
                            {assistantStatus === AssistantStatus.IDLE ? 'Awaiting Command' : 'Processing Interface'}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8 z-20">
                <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-cyan-500/20 max-h-32 overflow-y-auto font-mono text-xs scrollbar-hide">
                    {transcript.jarvis && (
                        <div className="text-cyan-300 mb-2">
                            <span className="text-cyan-500/70 font-bold mr-2">JARVIS:</span>
                            {transcript.jarvis}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-12 z-30">
                <VoicePanel 
                    setAssistantStatus={setAssistantStatus}
                    setTranscript={setTranscript}
                    setAnalyserNode={setAnalyserNode}
                    onYouTubePlay={handleYouTubePlay}
                    apiKeys={apiKeys}
                />
            </div>

            {activeVideo && (
                <YouTubePlayer 
                    videoId={activeVideo.id}
                    title={activeVideo.title}
                    onClose={() => setActiveVideo(null)}
                />
            )}
        </div>
    );
}
