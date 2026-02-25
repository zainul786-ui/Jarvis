import { useState, useCallback, useEffect } from 'react';
import { ApiKeys, PersonalityMode } from '../types';

const API_KEYS_STORAGE_KEY = 'jarvis_api_keys';

const initialApiKeys: ApiKeys = {
    googleSearch: { key: '', enabled: false },
    youtube: { key: '', enabled: false },
    spotify: { key: '', enabled: false },
    huggingFace: { key: '', enabled: false },
    newsApi: { key: '', enabled: false },
    elevenLabs: { key: '', enabled: false },
    currentPersonality: PersonalityMode.ASSISTANT,
};

export const useApiKeys = () => {
    const [apiKeys, setApiKeys] = useState<ApiKeys>(initialApiKeys);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
            if (storedKeys) {
                // Merge with initial keys to ensure all keys are present even if storage is outdated
                const parsedKeys = JSON.parse(storedKeys);
                setApiKeys({ ...initialApiKeys, ...parsedKeys });
            }
        } catch (error) {
            console.error("Failed to load API keys:", error);
            setApiKeys(initialApiKeys);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    const saveKeys = (keys: ApiKeys) => {
        try {
            // NOTE: In a production application, API keys should NEVER be stored in localStorage.
            // This is a simplified approach for a self-contained example.
            // A secure backend with encryption at rest would be required.
            localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
        } catch (error) {
            console.error("Failed to save API keys:", error);
        }
    };

    const updateApiKeys = useCallback((newKeys: ApiKeys) => {
        setApiKeys(newKeys);
        saveKeys(newKeys);
    }, []);
    
    const updatePersonality = useCallback((mode: PersonalityMode) => {
        setApiKeys(prev => {
            const newKeys = { ...prev, currentPersonality: mode };
            saveKeys(newKeys);
            return newKeys;
        });
    }, []);

    return { apiKeys, isLoaded, updateApiKeys, updatePersonality };
};