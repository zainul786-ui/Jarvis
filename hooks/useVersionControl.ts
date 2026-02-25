import { useState, useCallback, useEffect } from 'react';
import { ChangeSet } from '../types';

const HISTORY_STORAGE_KEY = 'jarvis_change_history';

export const useVersionControl = () => {
    const [history, setHistory] = useState<ChangeSet[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load version history:", error);
            setHistory([]);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const addChangeSet = useCallback((changeSet: ChangeSet) => {
        setHistory(prevHistory => {
            const newHistory = [changeSet, ...prevHistory];
            try {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            } catch (error) {
                console.error("Failed to save version history:", error);
            }
            return newHistory;
        });
    }, []);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear version history:", error);
        }
    }, []);

    return { history, isLoaded, addChangeSet, clearHistory };
};
