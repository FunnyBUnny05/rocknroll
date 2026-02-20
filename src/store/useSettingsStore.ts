import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AiProvider = 'deepseek' | 'claude';

interface SettingsState {
  aiProvider: AiProvider;
  deepseekApiKey: string;
  claudeApiKey: string;
  level: 'Beginner' | 'Normal';
  isSettingsOpen: boolean;
  setAiProvider: (provider: AiProvider) => void;
  setDeepseekApiKey: (key: string) => void;
  setClaudeApiKey: (key: string) => void;
  setLevel: (level: 'Beginner' | 'Normal') => void;
  setSettingsOpen: (isOpen: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiProvider: 'deepseek',
      deepseekApiKey: import.meta.env.VITE_DEEPSEEK_API_KEY ?? '',
      claudeApiKey: import.meta.env.VITE_CLAUDE_API_KEY ?? '',
      level: 'Normal',
      isSettingsOpen: false,
      setAiProvider: (provider) => set({ aiProvider: provider }),
      setDeepseekApiKey: (key) => set({ deepseekApiKey: key }),
      setClaudeApiKey: (key) => set({ claudeApiKey: key }),
      setLevel: (level) => set({ level }),
      setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
    }),
    {
      name: 'rocknroll-settings',
      partialize: (state) => ({
        aiProvider: state.aiProvider,
        deepseekApiKey: state.deepseekApiKey,
        claudeApiKey: state.claudeApiKey,
        level: state.level,
      }),
    }
  )
);
