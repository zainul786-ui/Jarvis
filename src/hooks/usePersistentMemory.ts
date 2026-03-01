import { useState, useCallback, useEffect } from 'react';

const MEMORY_STORAGE_KEY = 'jarvis_memory_data';

export const usePersistentMemory = () => {
    const [memory, setMemory] = useState<Record<string, string>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedMemory = localStorage.getItem(MEMORY_STORAGE_KEY);
            if (storedMemory) {
                setMemory(JSON.parse(storedMemory));
            }
        } catch (error) {
            console.error("Failed to load persistent memory:", error);
            setMemory({});
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const updateMemoryValue = useCallback((key: string, value: string) => {
        setMemory((prevMemory: Record<string, string>) => {
            const newMemory = { ...prevMemory };
            if (value === "") {
                delete newMemory[key.toLowerCase()];
            } else {
                newMemory[key.toLowerCase()] = value;
            }
            try {
                localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(newMemory));
            } catch (error) {
                console.error("Failed to save persistent memory:", error);
            }
            return newMemory;
        });
    }, []);
    
    const clearMemory = useCallback(() => {
        setMemory({});
        try {
            localStorage.removeItem(MEMORY_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear persistent memory:", error);
        }
    }, []);

    return { memory, isLoaded, updateMemoryValue, clearMemory };
};
