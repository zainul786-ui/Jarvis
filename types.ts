// This file contains type definitions for the J.A.R.V.I.S. application.

declare global {
    interface AIStudio {
        project?: {
            tree(): Promise<string[]>;
            readFile(path: string): Promise<string>;
            update(options: { files: { path: string; content: string | null }[] }): Promise<void>;
        };
    }
    interface Window {
        aistudio?: AIStudio;
        JSZip: any;
    }
}

export enum PersonalityMode {
    ASSISTANT = 'ASSISTANT',
    FRIENDSHIP = 'FRIENDSHIP',
    HACKER = 'HACKER',
    FUNNY = 'FUNNY',
    MOTIVATIONAL = 'MOTIVATIONAL',
}


export interface ApiKeyEntry {
    key: string;
    enabled: boolean;
}

export interface ApiKeys {
    googleSearch: ApiKeyEntry;
    youtube: ApiKeyEntry;
    spotify: ApiKeyEntry;
    huggingFace: ApiKeyEntry;
    newsApi: ApiKeyEntry;
    elevenLabs: ApiKeyEntry;
    currentPersonality: PersonalityMode;
}


export enum AssistantStatus {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    LISTENING = 'LISTENING',
    THINKING = 'THINKING',
    SPEAKING = 'SPEAKING',
    ERROR = 'ERROR',
}

export interface Transcript {
    user: string;
    jarvis: string;
}

export type CodeChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface CodeChange {
    file: string;
    content: string | null; // null for DELETE
    description: string;
    type: CodeChangeType;
}

export interface ChangeSet {
    id: string;
    timestamp: number;
    summary: string;
    changes: CodeChange[];
}

export interface Task {
    id: string;
    task_description: string;
    due_date: string | null;
    due_time: string | null;
    status: 'pending' | 'completed';
    createdAt: number;
}

export type SystemContext = 'IDLE' | 'CODING_WEBSITE' | 'SELF_MODIFYING';
