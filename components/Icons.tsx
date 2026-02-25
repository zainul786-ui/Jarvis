import React from 'react';

export const IconProps = {
  className: 'w-6 h-6'
};

export const ArcReactorIcon = ({ className = IconProps.className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="50" cy="50" r="45" strokeOpacity="0.5"/>
        <circle cx="50" cy="50" r="30" strokeOpacity="0.8"/>
        <circle cx="50" cy="50" r="15"/>
        <path d="M50 5 L50 25 M95 50 L75 50 M50 95 L50 75 M5 50 L25 50" strokeWidth="2"/>
        <path d="M67.68 32.32 L60.6 39.4 M32.32 67.68 L39.4 60.6 M32.32 32.32 L39.4 39.4 M67.68 67.68 L60.6 60.6" strokeWidth="2"/>
    </svg>
);

export const MicIcon = ({ className = IconProps.className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
    </svg>
);

export const MicOffIcon = ({ className = IconProps.className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
    </svg>
);
