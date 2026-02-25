import React from 'react';

interface CodeStudioProps {
    fileName: string;
    content: string;
}

export const CodeStudio: React.FC<CodeStudioProps> = ({ fileName, content }) => {
    return (
        <div className="h-full flex flex-col bg-black/30 rounded-md overflow-hidden jarvis-border">
            <header className="flex-shrink-0 bg-black/40 px-4 py-2 border-b border-cyan-400/20">
                <p className="font-mono text-cyan-300">{fileName}</p>
            </header>
            <main className="flex-grow overflow-auto p-4">
                <pre className="text-sm">
                    <code className="font-mono text-cyan-200 whitespace-pre-wrap">
                        {content}
                    </code>
                </pre>
            </main>
        </div>
    );
};
