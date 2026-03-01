import { useState, useEffect, useCallback } from 'react';

const MEMORY_KEY = 'jarvis_system_memory';

export const usePersistentMemory = () => {
    const [memory, setMemory] = useState<Record<string, string>>({});

    useEffect(() => {
        const stored = localStorage.getItem(MEMORY_KEY);
        if (stored) {
            try {
                setMemory(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse memory", e);
            }
        }
    }, []);

    const updateMemoryValue = useCallback((key: string, value: string) => {
        setMemory(prev => {
            const next = { ...prev, [key]: value };
            localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { memory, updateMemoryValue };
};
