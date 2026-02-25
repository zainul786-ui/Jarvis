import React from 'react';

interface HolographicPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const PanelStyles: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) perspective(1000px) rotateX(20deg) rotateY(0deg)',
    width: '60vw',
    maxWidth: '800px',
    height: '70vh',
    maxHeight: '600px',
    background: 'rgba(3, 8, 20, 0.5)',
    border: '1px solid rgba(0, 194, 255, 0.3)',
    borderRadius: '12px',
    boxShadow: '0 0 30px rgba(0, 229, 255, 0.3), inset 0 0 20px rgba(0, 194, 255, 0.2)',
    color: '#e0f2f1',
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Orbitron', sans-serif",
    backdropFilter: 'blur(10px)',
    transformStyle: 'preserve-3d',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
};

const HeaderStyles: React.CSSProperties = {
    padding: '1rem',
    borderBottom: '1px solid rgba(0, 194, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    textAlign: 'center',
    textShadow: '0 0 8px rgba(0, 229, 255, 0.7)',
};

const ContentStyles: React.CSSProperties = {
    flexGrow: 1,
    padding: '1.5rem',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    fontSize: '1.2rem',
    lineHeight: '1.6',
    color: 'rgba(224, 242, 241, 0.8)',
};

const ScanlineOverlay: React.CSSProperties = {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0, 25, 30, 0.2) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.02), rgba(0,0,255,0.03))',
    backgroundSize: '100% 4px, 6px 100%',
    pointerEvents: 'none',
    zIndex: 1,
    animation: 'glitch 0.5s infinite alternate',
};

const GlowBar: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '2px',
    background: '#00e5ff',
    boxShadow: '0 0 10px #00e5ff',
    animation: 'scan 4s linear infinite',
};

export const HolographicPanel: React.FC<HolographicPanelProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 animate-[fadeIn_0.5s_ease-out]">
            <style>
                {`
                    @keyframes scan {
                        0% { top: 0; }
                        100% { top: 100%; }
                    }
                    @keyframes glitch {
                        0% { transform: translate(0, 0); }
                        25% { transform: translate(2px, -1px); }
                        50% { transform: translate(-1px, 1px); }
                        75% { transform: translate(1px, -2px); }
                        100% { transform: translate(0, 0); }
                    }
                `}
            </style>
            <div style={PanelStyles}>
                <div style={ScanlineOverlay}></div>
                <div style={GlowBar}></div>
                <header style={HeaderStyles}>
                    <h2 className="text-xl">Holographic Command Panel</h2>
                </header>
                <main style={ContentStyles}>
                    <div>
                        <p className="jarvis-glow">SYSTEM INTERFACE ONLINE</p>
                        <p className="text-sm font-sans mt-2 text-cyan-400/70">Ready to receive technical specifications for the current web project.</p>
                    </div>
                </main>
                 <button 
                    onClick={onClose} 
                    className="absolute top-2 right-2 text-3xl text-cyan-400 hover:text-white leading-none p-2 z-10"
                    aria-label="Close Panel"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};
