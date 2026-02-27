import React, { useState } from 'react';
import { CodeChange, ChangeSet } from '../types';

interface SelfEditorPanelProps {
    isOpen: boolean;
    proposedChanges: CodeChange[];
    history: ChangeSet[];
    onApprove: () => void;
    onReject: () => void;
    onRollback: (changeSetId: string) => void;
}

const ChangeItem: React.FC<{ change: CodeChange }> = ({ change }) => {
    const colorMap = {
        CREATE: 'text-green-400 border-green-400/50',
        UPDATE: 'text-yellow-400 border-yellow-400/50',
        DELETE: 'text-red-400 border-red-400/50',
    };
    const bgMap = {
        CREATE: 'bg-green-500/10',
        UPDATE: 'bg-yellow-500/10',
        DELETE: 'bg-red-500/10',
    };
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`border-l-4 ${colorMap[change.type]} ${bgMap[change.type]} rounded-r-md mb-2`}>
            <div 
                className="flex justify-between items-center p-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <span className={`font-bold text-sm px-2 py-1 rounded-md ${colorMap[change.type]} border`}>{change.type}</span>
                    <span className="ml-3 font-mono text-cyan-200">{change.file}</span>
                </div>
                <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>{'>'}</span>
            </div>
            {isExpanded && (
                <div className="p-3 border-t border-cyan-400/20">
                    <p className="text-cyan-300/80 italic mb-3 text-sm">"{change.description}"</p>
                    <pre className="bg-black/30 p-3 rounded-md max-h-80 overflow-auto text-sm">
                        <code className="font-mono text-cyan-300 whitespace-pre-wrap">
                            {change.content ?? '[FILE DELETED]'}
                        </code>
                    </pre>
                </div>
            )}
        </div>
    );
};

export const SelfEditorPanel: React.FC<SelfEditorPanelProps> = ({ isOpen, proposedChanges, history, onApprove, onReject, onRollback }) => {
    const [activeTab, setActiveTab] = useState<'changes' | 'history'>('changes');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-2 sm:p-6">
            <div className="w-full max-w-6xl h-[95vh] bg-[#030814]/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,194,255,0.2)] rounded-2xl flex flex-col font-orbitron overflow-hidden">
                <header className="flex-shrink-0 p-6 border-b border-cyan-400/20 flex justify-between items-center bg-cyan-500/5">
                    <div>
                        <h2 className="text-2xl text-cyan-300 jarvis-glow uppercase tracking-wider">Self-Development System</h2>
                        <p className="text-sm text-cyan-400/70">Awaiting Directive</p>
                    </div>
                    <button onClick={onReject} className="text-2xl text-cyan-400 hover:text-white">&times;</button>
                </header>
                
                <nav className="flex-shrink-0 flex border-b border-cyan-400/20">
                    <button 
                        className={`px-6 py-3 text-lg uppercase tracking-wider transition-colors ${activeTab === 'changes' ? 'text-cyan-300 bg-cyan-500/10' : 'text-cyan-400/70'}`}
                        onClick={() => setActiveTab('changes')}
                    >
                        Proposed Changes ({proposedChanges.length})
                    </button>
                    <button 
                        className={`px-6 py-3 text-lg uppercase tracking-wider transition-colors ${activeTab === 'history' ? 'text-cyan-300 bg-cyan-500/10' : 'text-cyan-400/70'}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History ({history.length})
                    </button>
                </nav>

                <main className="flex-grow p-4 overflow-y-auto">
                    {activeTab === 'changes' && (
                        <div>
                            {proposedChanges.length === 0 ? (
                                <p className="text-center text-cyan-300/80 py-8">No changes have been proposed.</p>
                            ) : (
                                proposedChanges.map((change, index) => <ChangeItem key={index} change={change} />)
                            )}
                        </div>
                    )}
                    {activeTab === 'history' && (
                         <div>
                            {history.length === 0 ? (
                                <p className="text-center text-cyan-300/80 py-8">No changes have been recorded.</p>
                            ) : (
                                history.map((changeSet) => (
                                    <div key={changeSet.id} className="mb-4 p-3 jarvis-border bg-black/20 rounded-md">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-cyan-200">{changeSet.summary}</p>
                                                <p className="text-xs text-cyan-400/60 font-sans">{new Date(changeSet.timestamp).toLocaleString()}</p>
                                            </div>
                                            <button 
                                                onClick={() => alert("Rollback not yet implemented.")}
                                                className="px-3 py-1 bg-red-500/30 text-red-300 rounded-md text-sm hover:bg-red-500/50 disabled:opacity-50"
                                                disabled={true} // TODO: Implement rollback
                                            >
                                                Rollback
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>

                {activeTab === 'changes' && proposedChanges.length > 0 && (
                     <footer className="flex-shrink-0 p-4 border-t border-cyan-400/20 flex justify-end space-x-4">
                        <button 
                            onClick={onReject}
                            className="px-6 py-3 bg-red-500/30 text-red-300 rounded-lg hover:bg-red-500/50 transition-colors uppercase tracking-wider"
                        >
                            Reject
                        </button>
                        <button 
                            onClick={onApprove}
                            className="px-6 py-3 bg-cyan-500/80 text-white rounded-lg hover:bg-cyan-500 transition-colors uppercase tracking-wider jarvis-glow"
                        >
                            Approve & Apply
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};
