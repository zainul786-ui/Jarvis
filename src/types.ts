export enum AssistantStatus {
    IDLE = 'idle',
    LISTENING = 'listening',
    THINKING = 'thinking',
    SPEAKING = 'speaking',
    CONNECTING = 'connecting',
    ERROR = 'error'
}

export interface Task {
    id: string;
    task_description: string;
    due_date: string | null;
    due_time: string | null;
    status: 'pending' | 'completed';
    createdAt: number;
}

export enum PersonalityMode {
    FRIENDSHIP = 'friendship',
    ASSISTANT = 'assistant',
    HACKER = 'hacker',
    FUNNY = 'funny',
    MOTIVATIONAL = 'motivational'
}

export interface ApiKeyEntry {
    key: string;
    enabled: boolean;
}

export interface ApiKeys {
    youtube: ApiKeyEntry;
    grok: ApiKeyEntry;
    currentPersonality: PersonalityMode;
}

export interface Transcript {
    user: string;
    jarvis: string;
}
