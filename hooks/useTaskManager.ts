import { useState, useCallback, useEffect } from 'react';
import { Task } from '../types';

const TASK_STORAGE_KEY = 'jarvis_task_manager';

export const useTaskManager = () => {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        try {
            const storedTasks = localStorage.getItem(TASK_STORAGE_KEY);
            if (storedTasks) {
                setTasks(JSON.parse(storedTasks));
            }
        } catch (error) {
            console.error("Failed to load tasks:", error);
            setTasks([]);
        }
    }, []);

    const addTask = useCallback((newTaskData: Omit<Task, 'id' | 'status' | 'createdAt'>) => {
        const newTask: Task = {
            ...newTaskData,
            id: `task-${Date.now()}`,
            status: 'pending',
            createdAt: Date.now(),
        };
        setTasks(prevTasks => {
            const updatedTasks = [newTask, ...prevTasks];
            try {
                localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
            } catch (error) {
                console.error("Failed to save tasks:", error);
            }
            return updatedTasks;
        });
    }, []);

    const completeTask = useCallback((taskId: string) => {
        setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => 
                task.id === taskId ? { ...task, status: 'completed' as const } : task
            );
            try {
                localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
            } catch (error) {
                console.error("Failed to save tasks:", error);
            }
            return updatedTasks;
        });
    }, []);

    return { tasks, addTask, completeTask };
};
