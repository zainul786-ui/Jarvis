import React, { useState, useEffect } from 'react';
import { ApiKeys } from '../types';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    apiKeys: ApiKeys;
    onSave: (newKeys: ApiKeys) => void;
}

const ApiKeyInput: React.FC<{ label: string; value: string; enabled: boolean; onValueChange: (v: string) => void; onToggle: () => void; }> = ({ label, value, enabled, onValueChange, onToggle }) => (
    <div className="flex items-center space-x-4 mb-4">
        <label className="w-48 text-cyan-300/80 text-right">{label}</label>
        <input
            type="password"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            className="flex-grow bg-black/30 border border-cyan-400/30 rounded-md px-3 py-2 text-cyan-200 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Enter API Key / Token"
        />
        <div className="flex items-center">
            <input
                type="checkbox"
                checked={enabled}
                onChange={onToggle}
                className="sr-only peer"
                id={`toggle-${label}`}
            />
            <label
                htmlFor={`toggle-${label}`}
                className="relative w-12 h-6 rounded-full bg-gray-600 peer-checked:bg-cyan-500 transition-colors cursor-pointer"
            >
                <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-6"></span>
            </label>
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
                        <h2 className="text-2xl text-cyan-300 jarvis-glow uppercase tracking-wider">Settings</h2>
                        <p className="text-sm text-cyan-400/70">API Key Manager</p>
                    </div>
                    <button onClick={onClose} className="text-2xl text-cyan-400 hover:text-white">&times;</button>
                </header>
                
                <main className="flex-grow p-6 overflow-y-auto">
                    <p className="text-sm text-cyan-400/60 mb-6 font-sans">
                        Provide API keys for Gemini and YouTube to enable J.A.R.V.I.S.'s core functions.
                    </p>
                    
                    <div className="space-y-6">
                        <ApiKeyInput 
                            label="Gemini API Key"
                            value={localKeys.gemini.key}
                            enabled={localKeys.gemini.enabled}
                            onValueChange={(v) => handleKeyChange('gemini', v)}
                            onToggle={() => handleToggle('gemini')}
                        />
                        <ApiKeyInput 
                            label="YouTube Data API"
                            value={localKeys.youtube.key}
                            enabled={localKeys.youtube.enabled}
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