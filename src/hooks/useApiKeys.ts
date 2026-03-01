import { useState, useCallback } from 'react';

export enum PersonalityMode {
    FRIENDSHIP = 'friendship',
    ASSISTANT = 'assistant',
    HACKER = 'hacker',
    FUNNY = 'funny',
    MOTIVATIONAL = 'motivational'
}

export interface ApiKeys {
    googleSearch: { key: string; enabled: boolean };
    youtube: { key: string; enabled: boolean };
    spotify: { key: string; enabled: boolean };
    huggingFace: { key: string; enabled: boolean };
    newsApi: { key: string; enabled: boolean };
    elevenLabs: { key: string; enabled: boolean };
    currentPersonality: PersonalityMode;
}

const initialApiKeys: ApiKeys = {
    googleSearch: { key: '', enabled: false },
    youtube: { key: 'AIzaSyBKOpEDAbtWrtFs-BYE9AnJ5zMiyBQoZlg', enabled: true },
    spotify: { key: '', enabled: false },
    huggingFace: { key: '', enabled: false },
    newsApi: { key: '', enabled: false },
    elevenLabs: { key: '', enabled: false },
    currentPersonality: PersonalityMode.ASSISTANT,
};

export const useApiKeys = () => {
    const [apiKeys, setApiKeys] = useState<ApiKeys>(initialApiKeys);

    const updateApiKeys = useCallback((newKeys: ApiKeys) => {
        setApiKeys(newKeys);
    }, []);

    const updatePersonality = useCallback((mode: PersonalityMode) => {
        setApiKeys(prev => ({ ...prev, currentPersonality: mode }));
    }, []);

    return { apiKeys, updateApiKeys, updatePersonality };
};
