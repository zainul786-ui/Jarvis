import React, { useState, useEffect } from 'react';
import { ApiKeys } from '../types';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    apiKeys: ApiKeys;
    onSave: (newKeys: ApiKeys) => void;
}

const ApiKeyInput: React.FC<{ label: string; value: string; enabled: boolean; onValueChange: (v: string) => void; onToggle: () => void; }> = ({ label, value, enabled, onValueChange, onToggle }) => (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
        <label className="sm:w-48 text-cyan-300/80 sm:text-right text-sm uppercase tracking-wider">{label}</label>
        <div className="flex-grow flex items-center space-x-3">
            <input
                type="password"
                value={value || ''}
                onChange={(e) => onValueChange(e.target.value)}
                className="flex-grow bg-black/30 border border-cyan-400/30 rounded-md px-3 py-2 text-cyan-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                placeholder={`Enter ${label}...`}
            />
            <div className="flex items-center flex-shrink-0">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={onToggle}
                    className="sr-only peer"
                    id={`toggle-${label.replace(/\s+/g, '-')}`}
                />
                <label
                    htmlFor={`toggle-${label.replace(/\s+/g, '-')}`}
                    className="relative w-10 h-5 rounded-full bg-gray-600 peer-checked:bg-cyan-500 transition-colors cursor-pointer"
                >
                    <span className="absolute left-1 top-1 w-3 h-3 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
                </label>
            </div>
        </div>
    </div>
);


export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, apiKeys, onSave }) => {
    const [localKeys, setLocalKeys] = useState<ApiKeys>(apiKeys);

    useEffect(() => {
        setLocalKeys(apiKeys);
    }, [apiKeys, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localKeys);
        onClose();
        alert("API settings saved successfully.");
    };
    
    const handleKeyChange = (keyName: keyof ApiKeys, value: string) => {
        const entry = localKeys[keyName];
        if (typeof entry === 'object' && entry !== null && 'key' in entry) {
            setLocalKeys((prev: ApiKeys) => ({ ...prev, [keyName]: { ...entry, key: value } }));
        }
    };

    const handleToggle = (keyName: keyof ApiKeys) => {
        const entry = localKeys[keyName];
        if (typeof entry === 'object' && entry !== null && 'enabled' in entry) {
            setLocalKeys((prev: ApiKeys) => ({ ...prev, [keyName]: { ...entry, enabled: !entry.enabled } }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
            <div className="w-full max-w-3xl h-auto bg-[#030814]/90 jarvis-border rounded-lg flex flex-col font-orbitron">
                <header className="flex-shrink-0 p-4 border-b border-cyan-400/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl text-cyan-300 jarvis-glow uppercase tracking-wider">Settings <span className="text-[10px] opacity-50">v2.1</span></h2>
                        <p className="text-sm text-cyan-400/70">API Key Manager (Grok Enabled)</p>
                    </div>
                    <button onClick={onClose} className="text-2xl text-cyan-400 hover:text-white">&times;</button>
                </header>
                
                <main className="flex-grow p-6 overflow-y-auto">
                    <p className="text-sm text-cyan-400/60 mb-6 font-sans">
                        Provide API keys for Grok and YouTube to enable J.A.R.V.I.S.'s core functions.
                    </p>
                    
                    <div className="space-y-6">
                        <div className="p-5 border-2 border-cyan-400/50 rounded-xl bg-cyan-400/10 mb-8 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                            <h3 className="text-cyan-300 font-bold mb-4 uppercase tracking-[0.2em] flex items-center text-lg">
                                <span className="w-3 h-3 bg-cyan-400 rounded-full mr-3 animate-pulse shadow-[0_0_10px_#00e5ff]"></span>
                                Grok (xAI) Neural Core
                            </h3>
                            <ApiKeyInput 
                                label="Grok API Key"
                                value={localKeys.grok?.key || ''}
                                enabled={localKeys.grok?.enabled ?? true}
                                onValueChange={(v) => handleKeyChange('grok', v)}
                                onToggle={() => handleToggle('grok')}
                            />
                            <p className="text-[10px] text-cyan-400/50 mt-2 italic">
                                * Handles general knowledge, conversation, and strategic reasoning.
                            </p>
                        </div>

                        <ApiKeyInput 
                            label="YouTube Data API"
                            value={localKeys.youtube?.key || ''}
                            enabled={localKeys.youtube?.enabled ?? true}
                            onValueChange={(v) => handleKeyChange('youtube', v)}
                            onToggle={() => handleToggle('youtube')}
                        />
                    </div>
                </main>

                <footer className="flex-shrink-0 p-4 border-t border-cyan-400/20 flex justify-end space-x-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/50 transition-colors uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-3 bg-cyan-500/80 text-white rounded-lg hover:bg-cyan-500 transition-colors uppercase tracking-wider jarvis-glow"
                    >
                        Save & Close
                    </button>
                </footer>
            </div>
        </div>
    );
};