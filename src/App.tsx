
import JSZip from 'jszip';
import React, { useState, useEffect, useCallback } from 'react';
import { VoicePanel } from './components/VoicePanel';
import { ArcReactorIcon, SettingsIcon } from './components/Icons';
import { AssistantStatus, Transcript, CodeChange, ChangeSet, SystemContext } from './types';
import { VoiceVisualizer } from './components/JarvisVisualizer';
import { SelfEditorPanel } from './components/SelfEditorPanel';
import { WebPanel } from './components/WebPanel';
import { useVersionControl } from './hooks/useVersionControl';
import { getProjectSourceCode } from './utils/sourceCode';
import { useApiKeys } from './hooks/useApiKeys';
import { SettingsPanel } from './components/SettingsPanel';
import { HolographicPanel } from './components/HolographicPanel';
import { initializeApi } from './services/gemini';
import { YouTubePlayer } from './components/YouTubePlayer';
import { searchYouTube, YouTubeVideo } from './services/youtubeService';

const BackgroundFX = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(0,194,255,0.1)_0,_transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%2width=%2240%22%20height=%2240%22%20viewBox=%220%200%2040%2040%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill=%22%2300c2ff%22%20fill-opacity=%220.05%22%20fill-rule=%22evenodd%22%3E%3Cpath%20d=%22M0%2040L40%200H20L0%2020M40%2040V20L20%2040%22/%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
    </div>
);

type AppState = 'loading' | 'requires_key' | 'ready';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('loading');
    const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
    const [transcript, setTranscript] = useState<Transcript>({ user: '', jarvis: '' });
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const [projectFiles, setProjectFiles] = useState<Record<string, string> | null>(null);
    const [systemContext, setSystemContext] = useState<SystemContext>('IDLE');
    const [localGeminiKey, setLocalGeminiKey] = useState('');
    const [localYouTubeKey, setLocalYouTubeKey] = useState('');

    // Self-development state
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [proposedChanges, setProposedChanges] = useState<CodeChange[]>([]);
    const { history, addChangeSet } = useVersionControl();
    
    // Settings state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHolographicPanelOpen, setIsHolographicPanelOpen] = useState(false);
    const { apiKeys, updateApiKeys, updatePersonality } = useApiKeys();
    const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

    useEffect(() => {
        if (apiKeys.gemini.key && apiKeys.gemini.enabled) {
            initializeApi(apiKeys.gemini.key);
            setAppState('ready');
        }
    }, [apiKeys.gemini.key, apiKeys.gemini.enabled]);

    useEffect(() => {
        // The platform provides the Gemini API key in process.env.GEMINI_API_KEY.
        // We initialize with it if it's available.
        if (process.env.GEMINI_API_KEY) {
            initializeApi(process.env.GEMINI_API_KEY);
            setAppState('ready');
        } else {
            // Fallback for local development or if the key is missing.
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (storedKey) {
                initializeApi(storedKey);
                setAppState('ready');
            } else if (!apiKeys.gemini.key) {
                setAppState('requires_key');
            }
        }
    }, []);

    const handleApiKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const gKey = localGeminiKey.trim();
        const yKey = localYouTubeKey.trim();
        
        if (gKey) {
            const newKeys = {
                ...apiKeys,
                gemini: { key: gKey, enabled: true },
                youtube: { key: yKey, enabled: !!yKey }
            };
            updateApiKeys(newKeys);
            initializeApi(gKey);
            setAppState('ready');
        }
    };

    const handleApiKeyInvalid = useCallback(() => {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setAppState('requires_key');
    }, []);

    const handleChangesProposed = useCallback((changes: CodeChange[]) => {
        setProposedChanges(changes);
        setIsEditorOpen(true);
    }, []);

    const handleProjectUpdate = useCallback((files: Record<string, string>) => {
        setProjectFiles(files);
        setSystemContext('CODING_WEBSITE');
    }, []);
    
    const handleCloseWebStudio = useCallback(() => {
        setProjectFiles(null);
        setSystemContext('IDLE');
        setIsHolographicPanelOpen(false); // Also close holo panel
    }, []);

    const handleOpenSettings = useCallback(() => {
        setIsSettingsOpen(true);
    }, []);

    const handleCloseSettings = useCallback(() => {
        setIsSettingsOpen(false);
    }, []);

    const handleOpenHolographicPanel = useCallback(() => {
        if (systemContext === 'CODING_WEBSITE') {
            setIsHolographicPanelOpen(true);
        }
    }, [systemContext]);

    const downloadChangesAsZip = useCallback(async () => {
        if (proposedChanges.length === 0) return;
        try {
            const currentSource = await getProjectSourceCode();
            const newSource = { ...currentSource };
    
            for (const change of proposedChanges) {
                if (change.type === 'DELETE') {
                    delete newSource[change.file];
                } else { // CREATE or UPDATE
                    if (change.content !== null) {
                        newSource[change.file] = change.content;
                    }
                }
            }
            
            const zip = new JSZip();
            Object.entries(newSource).forEach(([path, content]) => {
                zip.file(path, content);
            });
    
            const blob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'jarvis-update.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            const newChangeSet: ChangeSet = {
                id: `cs-${Date.now()}`,
                timestamp: Date.now(),
                summary: proposedChanges.map((c: CodeChange) => c.description).join(', ') || "System Update",
                changes: proposedChanges,
            };
            addChangeSet(newChangeSet);
            
            setProposedChanges([]);
            setIsEditorOpen(false);
            alert("The self-update API is not available. The update has been downloaded as 'jarvis-update.zip'. Please apply the changes manually and reload the application.");
        } catch (error) {
            console.error("Failed to package changes:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during code generation.";
            alert(`An error occurred while packaging the changes: ${errorMessage}`);
        }
    }, [proposedChanges, addChangeSet]);

    const handleApproveChanges = useCallback(async () => {
        if (proposedChanges.length === 0) return;
        
        const canSelfUpdate = typeof (window as any).aistudio?.project?.update === 'function';

        if (canSelfUpdate && (window as any).aistudio?.project) {
            try {
                const filesToUpdate = proposedChanges.map((change: CodeChange) => ({
                    path: change.file,
                    content: change.content,
                }));

                await (window as any).aistudio.project.update({ files: filesToUpdate });

                const newChangeSet: ChangeSet = {
                    id: `cs-${Date.now()}`,
                    timestamp: Date.now(),
                    summary: proposedChanges.map((c: CodeChange) => c.description).join(', ') || "System Update",
                    changes: proposedChanges,
                };
                addChangeSet(newChangeSet);
                
                setProposedChanges([]);
                setIsEditorOpen(false);
                alert("J.A.R.V.I.S. has been successfully updated. The application will now reload to apply the changes.");
                window.location.reload();
            } catch (error) {
                console.error("Self-update failed, falling back to download:", error);
                await downloadChangesAsZip();
            }
        } else {
            console.warn("Self-update API not found, falling back to download.");
            await downloadChangesAsZip();
        }
    }, [proposedChanges, addChangeSet, downloadChangesAsZip]);
    
    const handleRejectChanges = useCallback(() => {
        setProposedChanges([]);
        setIsEditorOpen(false);
    }, []);
    
    const handleRollback = useCallback((changeSetId: string) => {
        // TODO: Implement rollback logic
        alert(`Rollback for ${changeSetId} is not yet implemented.`);
    }, []);

    const handleYouTubePlay = useCallback(async (query: string) => {
        setAssistantStatus(AssistantStatus.THINKING);
        const video = await searchYouTube(query, apiKeys.youtube.enabled ? apiKeys.youtube.key : undefined);
        if (video) {
            setActiveVideo(video);
            setAssistantStatus(AssistantStatus.IDLE);
        } else {
            setAssistantStatus(AssistantStatus.ERROR);
            setTranscript((prev: Transcript) => ({ ...prev, jarvis: `I'm sorry, I couldn't find any video for "${query}" on YouTube.` }));
        }
    }, [apiKeys.youtube.enabled, apiKeys.youtube.key, setAssistantStatus, setTranscript]);

    if (appState === 'loading') {
        return (
            <div className="bg-[#030814] min-h-screen flex items-center justify-center">
                <ArcReactorIcon className="w-24 h-24 text-cyan-400 animate-[spin_4s_linear_infinite]" />
            </div>
        );
    }

    if (appState === 'requires_key') {
        return (
            <div className="bg-[#030814] min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <BackgroundFX />
                <div className="relative z-10 jarvis-border bg-[#030814]/80 backdrop-blur-sm p-8 rounded-lg max-w-lg">
                    <div className="flex items-center space-x-4 mb-6 justify-center">
                        <ArcReactorIcon className="w-12 h-12 text-cyan-400" />
                        <div>
                            <h1 className="text-2xl font-bold text-cyan-300 jarvis-glow uppercase tracking-widest font-orbitron">J.A.R.V.I.S.</h1>
                            <p className="text-sm text-cyan-400/70">System Activation</p>
                        </div>
                    </div>
                    <p className="text-cyan-300/80 mb-6">
                      Please enter your API keys to activate J.A.R.V.I.S.
                    </p>
                    <form onSubmit={handleApiKeySubmit} className="flex flex-col space-y-4">
                        <div className="space-y-1 text-left">
                            <label className="text-xs text-cyan-400/70 uppercase tracking-widest ml-1">Gemini API Key (Required)</label>
                            <input
                                type="password"
                                value={localGeminiKey}
                                onChange={(e) => setLocalGeminiKey(e.target.value)}
                                className="w-full bg-black/30 border border-cyan-400/30 rounded-md px-3 py-2 text-cyan-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="Enter Gemini Key"
                                required
                            />
                        </div>
                        <div className="space-y-1 text-left">
                            <label className="text-xs text-cyan-400/70 uppercase tracking-widest ml-1">YouTube API Key (Optional)</label>
                            <input
                                type="password"
                                value={localYouTubeKey}
                                onChange={(e) => setLocalYouTubeKey(e.target.value)}
                                className="w-full bg-black/30 border border-cyan-400/30 rounded-md px-3 py-2 text-cyan-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                placeholder="Enter YouTube Key"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full px-6 py-3 bg-cyan-500/80 text-white rounded-lg hover:bg-cyan-500 transition-all duration-300 font-bold uppercase tracking-wider jarvis-glow disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            disabled={!localGeminiKey.trim()}
                        >
                            Activate System
                        </button>
                    </form>
                    <p className="text-xs text-cyan-500/60 mt-4">
                        Your key is stored locally and used only for API requests.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`bg-[#030814] min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 transition-opacity duration-1000 opacity-100`}>
            <BackgroundFX />

            {/* Main Content Area */}
            <main className="relative z-10 w-full h-[calc(100vh-1rem)] max-w-7xl mx-auto flex flex-col flex-grow pb-28">
                 {projectFiles ? (
                    <WebPanel files={projectFiles} onClose={handleCloseWebStudio} />
                 ) : (
                    <>
                        <header className="flex-shrink-0 p-4 flex justify-between items-start">
                            <button 
                                onClick={handleOpenSettings}
                                className="p-2 rounded-full jarvis-border bg-[#030814]/50 text-cyan-400 hover:text-white transition-all duration-300 pointer-events-auto"
                                title="Settings"
                            >
                                <SettingsIcon className="w-6 h-6" />
                            </button>
                            <div className="text-right">
                                <h1 className="font-orbitron text-2xl font-bold text-cyan-300 jarvis-glow uppercase tracking-widest">J.A.R.V.I.S.</h1>
                                <p className="text-sm text-cyan-400/70">HUD Active</p>
                            </div>
                        </header>
                        <div className="flex-grow flex flex-col items-center justify-center relative">
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                                <div className="h-40 flex items-end">
                                    {transcript.jarvis && (
                                        <p className="text-2xl sm:text-3xl md:text-4xl text-cyan-200 jarvis-glow font-light animate-[fadeIn_0.5s_ease-out]">
                                            {transcript.jarvis}
                                        </p>
                                    )}
                                </div>
                                <div className="h-40 flex items-start pt-8">
                                    {transcript.user && (
                                        <p className="text-lg sm:text-xl text-cyan-400/80 italic animate-[fadeIn_0.5s_ease-out]">
                                            {transcript.user}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                 )}
            </main>

            {/* Global Visualizer - always in the center */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-20">
                 <VoiceVisualizer analyserNode={analyserNode} status={assistantStatus} />
            </div>

            {/* Global Voice Panel - always at the bottom */}
            <footer className="fixed bottom-0 left-0 right-0 z-30 flex justify-center p-4">
                 <VoicePanel
                    setAssistantStatus={setAssistantStatus}
                    setTranscript={setTranscript}
                    setAnalyserNode={setAnalyserNode}
                    onApiKeyInvalid={handleApiKeyInvalid}
                    onChangesProposed={handleChangesProposed}
                    projectFiles={projectFiles}
                    onProjectUpdate={handleProjectUpdate}
                    systemContext={systemContext}
                    setSystemContext={setSystemContext}
                    onOpenSettings={handleOpenSettings}
                    onOpenHolographicPanel={handleOpenHolographicPanel}
                    apiKeys={apiKeys}
                    isEditorOpen={isEditorOpen}
                    isSettingsOpen={isSettingsOpen}
                    updatePersonality={updatePersonality}
                    onYouTubePlay={handleYouTubePlay}
                />
            </footer>

            {activeVideo && (
                <YouTubePlayer 
                    videoId={activeVideo.id}
                    title={activeVideo.title}
                    onClose={() => setActiveVideo(null)}
                />
            )}

            <SelfEditorPanel 
                isOpen={isEditorOpen}
                proposedChanges={proposedChanges}
                history={history}
                onApprove={handleApproveChanges}
                onReject={handleRejectChanges}
                onRollback={handleRollback}
            />

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={handleCloseSettings}
                apiKeys={apiKeys}
                onSave={updateApiKeys}
            />

            <HolographicPanel 
                isOpen={isHolographicPanelOpen}
                onClose={() => setIsHolographicPanelOpen(false)}
            />
        </div>
    );
};

export default App;
