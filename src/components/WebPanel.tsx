

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { CodeStudio } from './CodeStudio';
import { X, Monitor, Smartphone, Download, Code } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WebPanelProps {
    files: Record<string, string>;
    onClose: () => void;
}

const getMimeType = (path: string): string => {
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
    if (path.endsWith('.svg')) return 'image/svg+xml';
    if (path.endsWith('.html')) return 'text/html';
    return 'text/plain';
};

export const WebPanel: React.FC<WebPanelProps> = ({ files, onClose }) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'files'>('preview');
    const [selectedFile, setSelectedFile] = useState<string | null>('index.html');
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('desktop');

    useEffect(() => {
        const generatedUrls: string[] = [];

        const generatePreview = () => {
            let htmlContent = files['index.html'];
            if (!htmlContent) {
                setPreviewContent('<div style="color: #e0f2f1; font-family: sans-serif; padding: 2rem; background: #030814; height: 100vh;"><h3>index.html not found</h3><p>An index.html file is required for the live preview.</p></div>');
                return;
            }

            // Inject Tailwind if not present
            if (!htmlContent.includes('tailwindcss.com')) {
                htmlContent = htmlContent.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
            }

            const regex = /(src|href)="(\.?\/?[^"]+)"/g;
            
            htmlContent = htmlContent.replace(regex, (match: string, attribute: string, path: string) => {
                const normalizedPath = path.startsWith('./') ? path.substring(2) : (path.startsWith('/') ? path.substring(1) : path);
                const fileContent = files[normalizedPath];

                if (fileContent) {
                    const mimeType = getMimeType(normalizedPath);
                    const blob = new Blob([fileContent], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    generatedUrls.push(url);
                    return `${attribute}="${url}"`;
                }
                return match;
            });
            
            setPreviewContent(htmlContent);
        };

        generatePreview();

        return () => {
            generatedUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [files]);

    const handleDownload = async () => {
        const zip = new JSZip();
        Object.entries(files).forEach(([path, content]) => {
            zip.file(path, content as string);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'jarvis-project.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };
    
    const filePaths = Object.keys(files).sort();

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full h-full bg-[#030814]/90 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,194,255,0.1)] rounded-2xl flex flex-col font-orbitron overflow-hidden"
        >
            <header className="flex-shrink-0 p-6 border-b border-cyan-400/20 flex justify-between items-center bg-cyan-500/5">
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full border border-cyan-400/50 flex items-center justify-center animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400/30"></div>
                    </div>
                    <div>
                        <h2 className="text-2xl text-cyan-300 jarvis-glow uppercase tracking-wider">Web Studio</h2>
                        <p className="text-xs text-cyan-400/60 font-sans uppercase tracking-[0.2em]">Project: {files['package.json'] ? JSON.parse(files['package.json']).name : 'Unnamed Project'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-cyan-400/20">
                        <button 
                            onClick={() => setViewMode('desktop')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/40 hover:text-cyan-400'}`}
                        >
                            <Monitor size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('mobile')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-400/40 hover:text-cyan-400'}`}
                        >
                            <Smartphone size={18} />
                        </button>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center text-cyan-400 hover:text-white hover:bg-red-500/20 rounded-full transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>
            </header>

            <nav className="flex-shrink-0 flex border-b border-cyan-400/20 bg-black/20">
                <button 
                    className={`px-8 py-4 text-sm uppercase tracking-widest transition-all relative ${activeTab === 'preview' ? 'text-cyan-300' : 'text-cyan-400/50 hover:text-cyan-400'}`}
                    onClick={() => setActiveTab('preview')}
                >
                    <div className="flex items-center space-x-2">
                        <Monitor size={14} />
                        <span>Live Preview</span>
                    </div>
                    {activeTab === 'preview' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,194,255,0.5)]" />}
                </button>
                <button 
                    className={`px-8 py-4 text-sm uppercase tracking-widest transition-all relative ${activeTab === 'files' ? 'text-cyan-300' : 'text-cyan-400/50 hover:text-cyan-400'}`}
                    onClick={() => setActiveTab('files')}
                >
                    <div className="flex items-center space-x-2">
                        <Code size={14} />
                        <span>Source Code</span>
                    </div>
                    {activeTab === 'files' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(0,194,255,0.5)]" />}
                </button>
            </nav>

            <main className="flex-grow p-6 overflow-hidden bg-black/40">
                <AnimatePresence mode="wait">
                    {activeTab === 'preview' ? (
                        <motion.div 
                            key="preview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <div className={`transition-all duration-500 ease-in-out bg-white rounded-2xl shadow-[0_0_100px_rgba(0,194,255,0.1)] overflow-hidden border-8 border-gray-900 ${viewMode === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'}`}>
                                <iframe 
                                    srcDoc={previewContent || ''}
                                    title="Live Preview"
                                    className="w-full h-full bg-white border-none"
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="files"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="h-full flex flex-row space-x-6"
                        >
                            <div className="w-64 h-full overflow-y-auto pr-4 border-r border-cyan-400/10">
                                <p className="text-[10px] text-cyan-400/40 uppercase tracking-[0.2em] mb-4">File Explorer</p>
                                {filePaths.map((path: string) => {
                                    const depth = (path.match(/\//g) || []).length;
                                    const isSelected = selectedFile === path;
                                    return (
                                        <button 
                                            key={path}
                                            onClick={() => setSelectedFile(path)}
                                            className={`w-full text-left font-mono text-xs px-3 py-2 rounded-lg truncate transition-all mb-1 flex items-center space-x-2 ${isSelected ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' : 'text-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-400'}`}
                                            style={{ marginLeft: `${depth * 12}px` }}
                                        >
                                            <Code size={12} className="flex-shrink-0" />
                                            <span>{path.split('/').pop()}</span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex-grow h-full">
                                {selectedFile && files[selectedFile] ? (
                                    <CodeStudio fileName={selectedFile} content={files[selectedFile]} />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-cyan-400/30 space-y-4">
                                        <Code size={48} strokeWidth={1} />
                                        <p className="uppercase tracking-widest text-sm">Select a file to begin review</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <footer className="flex-shrink-0 p-4 border-t border-cyan-400/20 flex justify-between items-center bg-black/40">
                <div className="flex items-center space-x-2 text-[10px] text-cyan-400/40 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>System Online</span>
                    <span className="mx-2">|</span>
                    <span>Files: {filePaths.length}</span>
                </div>
                <button 
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-xl transition-all uppercase tracking-widest text-xs jarvis-glow"
                >
                    <Download size={16} />
                    <span>Export Project</span>
                </button>
            </footer>
        </motion.div>
    );
};
