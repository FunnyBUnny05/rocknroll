import { useSettingsStore } from '../../store/useSettingsStore';

export function SettingsModal() {
    const {
        deepseekApiKey,
        level,
        isSettingsOpen,
        setDeepseekApiKey,
        setLevel,
        setSettingsOpen
    } = useSettingsStore();

    if (!isSettingsOpen) return null;

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
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">
                            DeepSeek API Key
                        </label>
                        <input
                            type="password"
                            value={deepseekApiKey}
                            onChange={(e) => setDeepseekApiKey(e.target.value)}
                            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                            placeholder="sk-..."
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Stored locally in your browser to power the Musical Brain.
                        </p>
                    </div>

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
                            Changes the generated instructions from DeepSeek.
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
