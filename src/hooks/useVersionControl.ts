import { useState, useCallback, useEffect } from 'react';
import { CodeChange, ChangeSet } from '../types';

const HISTORY_STORAGE_KEY = 'jarvis_change_history';

export const useVersionControl = () => {
    const [proposedChanges, setProposedChanges] = useState<CodeChange[]>([]);
    const [changeHistory, setChangeHistory] = useState<ChangeSet[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
            try {
                setChangeHistory(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const addChangeSet = useCallback((changeSet: ChangeSet) => {
        setChangeHistory((prev: ChangeSet[]) => {
            const updated = [changeSet, ...prev];
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return { proposedChanges, setProposedChanges, history: changeHistory, addChangeSet };
};
