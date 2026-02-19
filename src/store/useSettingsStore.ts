import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  deepseekApiKey: string;
  level: 'Beginner' | 'Normal';
  isSettingsOpen: boolean;
  setDeepseekApiKey: (key: string) => void;
  setLevel: (level: 'Beginner' | 'Normal') => void;
  setSettingsOpen: (isOpen: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      deepseekApiKey: 'sk-5c7272ba139742d783896d6765be8f34',
      level: 'Normal',
      isSettingsOpen: false,
      setDeepseekApiKey: (key) => set({ deepseekApiKey: key }),
      setLevel: (level) => set({ level }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
    }),
    {
      name: 'rocknroll-settings',
      partialize: (state) => ({ deepseekApiKey: state.deepseekApiKey, level: state.level }),
    }
  )
);
