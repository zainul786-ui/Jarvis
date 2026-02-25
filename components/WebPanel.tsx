

import React, { useState, useEffect } from 'react';
import { CodeStudio } from './CodeStudio';

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

    useEffect(() => {
        const generatedUrls: string[] = [];

        const generatePreview = () => {
            let htmlContent = files['index.html'];
            if (!htmlContent) {
                setPreviewContent('<div style="color: #e0f2f1; font-family: sans-serif; padding: 2rem;"><h3>index.html not found</h3><p>An index.html file is required for the live preview.</p></div>');
                return;
            }

            const regex = /(src|href)="(\.?\/?[^"]+)"/g;
            
            htmlContent = htmlContent.replace(regex, (match, attribute, path) => {
                const normalizedPath = path.startsWith('./') ? path.substring(2) : (path.startsWith('/') ? path.substring(1) : path);
                const fileContent = files[normalizedPath];

                if (fileContent) {
                    const mimeType = getMimeType(normalizedPath);
                    const blob = new Blob([fileContent], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    generatedUrls.push(url);
                    return `${attribute}="${url}"`;
                }
                return match; // Keep original if file not found
            });
            
            setPreviewContent(htmlContent);
        };

        generatePreview();

        return () => {
            generatedUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [files]);

    const handleDownload = async () => {
        const zip = new window.JSZip();
        Object.entries(files).forEach(([path, content]) => {
            zip.file(path, content);
        });

        zip.generateAsync({ type: 'blob' }).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'jarvis-project.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    };
    
    const filePaths = Object.keys(files).sort();

    return (
        <div className="w-full h-full bg-[#030814]/50 jarvis-border rounded-lg flex flex-col font-orbitron animate-[fadeIn_0.5s_ease-out]">
            <header className="flex-shrink-0 p-4 border-b border-cyan-400/20 flex justify-between items-center">
                <div>
                    <h2 className="text-xl text-cyan-300 jarvis-glow uppercase tracking-wider">Web Studio</h2>
                    <p className="text-xs text-cyan-400/70">Live Development Environment</p>
                </div>
                 <button onClick={onClose} className="text-3xl text-cyan-400 hover:text-white leading-none p-2">&times;</button>
            </header>
             <nav className="flex-shrink-0 flex border-b border-cyan-400/20">
                <button 
                    className={`px-6 py-3 text-sm uppercase tracking-wider transition-colors ${activeTab === 'preview' ? 'text-cyan-300 bg-cyan-500/10' : 'text-cyan-400/70'}`}
                    onClick={() => setActiveTab('preview')}
                >
                    Live Preview
                </button>
                <button 
                    className={`px-6 py-3 text-sm uppercase tracking-wider transition-colors ${activeTab === 'files' ? 'text-cyan-300 bg-cyan-500/10' : 'text-cyan-400/70'}`}
                    onClick={() => setActiveTab('files')}
                >
                    Files ({filePaths.length})
                </button>
            </nav>
            <main className="flex-grow p-4 overflow-hidden flex items-center justify-center">
                {activeTab === 'preview' && (
                     <div className="w-full h-full max-w-sm mx-auto aspect-[9/16] bg-black rounded-2xl p-2 border-4 border-gray-700 shadow-2xl">
                        <iframe 
                            srcDoc={previewContent || ''}
                            title="Live Preview"
                            className="w-full h-full bg-white rounded-lg border-none"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    </div>
                )}
                {activeTab === 'files' && (
                    <div className="h-full flex flex-row space-x-2">
                        <div className="w-1/3 h-full overflow-y-auto pr-2">
                           {filePaths.map(path => {
                               const depth = (path.match(/\//g) || []).length;
                               const isSelected = selectedFile === path;
                               return (
                                   <button 
                                        key={path}
                                        onClick={() => setSelectedFile(path)}
                                        className={`w-full text-left font-mono text-sm px-2 py-1 rounded truncate transition-colors ${isSelected ? 'bg-cyan-500/20 text-cyan-200' : 'text-cyan-400 hover:bg-cyan-500/10'}`}
                                        style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                   >
                                        {path.split('/').pop()}
                                   </button>
                               )
                           })}
                        </div>
                        <div className="w-2/3 h-full">
                            {selectedFile && files[selectedFile] ? (
                                <CodeStudio fileName={selectedFile} content={files[selectedFile]} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-cyan-400/60">
                                    <p>Select a file to view its content</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
            <footer className="flex-shrink-0 p-2 border-t border-cyan-400/20 flex justify-end">
                <button 
                    onClick={handleDownload}
                    className="px-4 py-2 bg-cyan-500/80 text-white rounded-lg hover:bg-cyan-500 transition-colors uppercase tracking-wider text-sm jarvis-glow"
                >
                    Download ZIP
                </button>
            </footer>
        </div>
    );
};
