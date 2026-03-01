import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface HolographicPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HolographicPanel: React.FC<HolographicPanelProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
            <div className="w-full max-w-4xl h-[80vh] bg-[#030814]/90 border border-cyan-500/30 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,194,255,0.2)]">
                <header className="p-6 border-b border-cyan-500/20 flex justify-between items-center">
                    <h2 className="text-2xl text-cyan-400 font-orbitron tracking-widest jarvis-glow">Holographic Command Interface</h2>
                    <button onClick={onClose} className="text-cyan-400 hover:text-white transition-colors">
                        <X size={32} />
                    </button>
                </header>
                <main className="flex-grow p-8 flex items-center justify-center">
                    <div className="text-center space-y-6">
                        <div className="w-32 h-32 border-4 border-cyan-500/30 rounded-full mx-auto animate-spin flex items-center justify-center">
                            <div className="w-24 h-24 border-2 border-cyan-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-cyan-300 font-mono text-lg animate-pulse">INITIALIZING HOLOGRAPHIC MATRIX...</p>
                        <p className="text-cyan-500/60 max-w-md mx-auto">This interface is currently being calibrated for advanced project manipulation.</p>
                    </div>
                </main>
            </div>
        </motion.div>
            )}
        </AnimatePresence>
    );
};
