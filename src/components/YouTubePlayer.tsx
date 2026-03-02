
import React, { useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Minimize2, Music, Youtube } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface YouTubePlayerProps {
    videoId: string;
    title: string;
    onClose: () => void;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, title, onClose }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const onPlayerReady: YouTubeProps['onReady'] = (event) => {
        setIsReady(true);
        event.target.playVideo();
    };

    const opts: YouTubeProps['opts'] = {
        height: isMinimized ? '0' : '240',
        width: isMinimized ? '0' : '400',
        playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
        },
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={cn(
                    "fixed bottom-32 right-8 z-50 overflow-hidden rounded-xl border border-cyan-500/30 bg-[#030814]/90 backdrop-blur-md shadow-2xl transition-all duration-300",
                    isMinimized ? "w-64 h-16" : "w-[400px] h-[300px]"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between bg-cyan-500/10 px-4 py-2 border-b border-cyan-500/20">
                    <div className="flex items-center space-x-2 overflow-hidden">
                        <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-cyan-300 truncate max-w-[180px]">
                            {title || "Playing from YouTube"}
                        </span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <button 
                            onClick={() => setIsMinimized(!isMinimized)}
                            className="p-1 hover:bg-white/10 rounded-md transition-colors text-cyan-400"
                        >
                            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-1 hover:bg-red-500/20 rounded-md transition-colors text-red-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Player Content */}
                <div className={cn("relative bg-black", isMinimized ? "hidden" : "block")}>
                    {!isReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#030814]">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                    <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} className="aspect-video w-full" />
                </div>

                {/* Minimized View */}
                {isMinimized && (
                    <div className="flex items-center px-4 h-10 space-x-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
                            <Music className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Now Playing</p>
                            <p className="text-xs text-white truncate">{title}</p>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
