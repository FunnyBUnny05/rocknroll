import { useSettingsStore } from '../../store/useSettingsStore';
import type { AiProvider } from '../../store/useSettingsStore';

export function SettingsModal() {
    const {
        aiProvider,
        deepseekApiKey,
        claudeApiKey,
        level,
        isSettingsOpen,
        setAiProvider,
        setDeepseekApiKey,
        setClaudeApiKey,
        setLevel,
        setSettingsOpen
    } = useSettingsStore();

    if (!isSettingsOpen) return null;

    const providers: { value: AiProvider; label: string }[] = [
        { value: 'deepseek', label: 'DeepSeek' },
        { value: 'claude', label: 'Claude' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button
                        onClick={() => setSettingsOpen(false)}
                        className="text-gray-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    {/* AI Provider Toggle */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                            AI Provider
                        </label>
                        <div className="flex rounded-lg border border-gray-700 bg-gray-950 p-1">
                            {providers.map(p => (
                                <button
                                    key={p.value}
                                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${aiProvider === p.value ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setAiProvider(p.value)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Choose which AI model powers the transcription engine.
                        </p>
                    </div>

                    {/* API Key — conditional on provider */}
                    {aiProvider === 'deepseek' ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                DeepSeek API Key
                            </label>
                            <input
                                type="password"
                                value={deepseekApiKey}
                                onChange={(e) => setDeepseekApiKey(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                placeholder="sk-..."
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Stored locally in your browser. Used with DeepSeek Chat model.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-300">
                                Claude API Key
                            </label>
                            <input
                                type="password"
                                value={claudeApiKey}
                                onChange={(e) => setClaudeApiKey(e.target.value)}
                                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                                placeholder="sk-ant-..."
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Stored locally in your browser. Used with Claude Sonnet 4.5.
                            </p>
                        </div>
                    )}

                    {/* Difficulty Level */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                            Difficulty Level
                        </label>
                        <div className="flex rounded-lg border border-gray-700 bg-gray-950 p-1">
                            <button
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${level === 'Beginner' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setLevel('Beginner')}
                            >
                                Beginner
                            </button>
                            <button
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${level === 'Normal' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setLevel('Normal')}
                            >
                                Normal
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            Beginner mode simplifies chords to open shapes.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={() => setSettingsOpen(false)}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500 transition-colors"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
}
