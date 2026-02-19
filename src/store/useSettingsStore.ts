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
      deepseekApiKey: 'sk-bda482370d494bb4aa62eeab480f2129',
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
