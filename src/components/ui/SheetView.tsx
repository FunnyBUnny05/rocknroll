import { useAppStore } from '../../store/useAppStore';

export function SheetView() {
    const { song } = useAppStore();

    if (!song) return null;

    const renderContent = (content: string, type: 'chord' | 'tab') => {
        if (type === 'tab') {
            return <pre className="font-mono text-[13px] leading-tight overflow-x-auto p-5 bg-gray-50/80 rounded-xl border border-gray-100 text-gray-800 shadow-inner">{content}</pre>;
        }

        // Chord mode: Highlight bracketed chords
        const lines = content.split('\n');
        return (
            <div className="space-y-1.5 font-sans text-[15px] text-gray-700">
                {lines.map((line, idx) => {
                    if (!line.trim()) return <div key={idx} className="h-4" />; // Empty lines

                    const parts = line.split(/\[(.*?)\]/g);
                    return (
                        <div key={idx} className="leading-relaxed tracking-wide">
                            {parts.map((part, i) =>
                                i % 2 === 1
                                    ? <span key={i} className="text-indigo-800 font-bold bg-indigo-50/80 px-1.5 py-0.5 rounded mx-0.5 inline-block border border-indigo-100 shadow-sm transform -translate-y-px">{part}</span>
                                    : <span key={i}>{part}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const timeSigStr = song.timeSignature
        ? `${song.timeSignature[0]}/${song.timeSignature[1]}`
        : '4/4';

    return (
        <div className="w-full max-w-[850px] bg-white shadow-2xl rounded-sm min-h-[1100px] p-12 lg:p-16 border border-gray-200 printable-sheet flex flex-col relative" id="sheet-container">

            {/* Document Header */}
            <header className="border-b-2 border-gray-100 pb-8 mb-8 flex flex-col">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">{song.metadata.name}</h1>
                <div className="flex justify-between items-end">
                    <h2 className="text-xl font-medium text-gray-600 italic">By {song.metadata.artist}</h2>

                    <div className="flex gap-4 text-sm font-semibold text-gray-500 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                        <div>Key: <span className="text-gray-900 ml-1">{song.metadata.originalKey}</span></div>
                        <div className="w-px h-4 bg-gray-300 self-center"></div>
                        <div>BPM: <span className="text-gray-900 ml-1">{song.bpm}</span></div>
                        <div className="w-px h-4 bg-gray-300 self-center"></div>
                        <div>Time: <span className="text-gray-900 ml-1">{timeSigStr}</span></div>
                    </div>
                </div>

                {/* Scale display */}
                {song.metadata.scale && song.metadata.scale.length > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                        Scale: <span className="text-gray-700 font-medium">{song.metadata.scale.join(' - ')}</span>
                    </div>
                )}
            </header>

            {/* Chords Used + Voicings Section */}
            {song.chordsUsed && song.chordsUsed.length > 0 && (
                <div className="mb-10 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                        Chords Dictionary
                    </h3>
                    <div className="flex gap-4 flex-wrap">
                        {song.chordsUsed.map(chord => (
                            <div key={chord} className="min-w-20 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col items-center justify-center hover:border-indigo-300 transition-colors">
                                <span className="font-bold text-gray-800 text-lg">{chord}</span>
                                {song.voicings[chord] && (
                                    <span className="text-xs text-gray-400 font-mono mt-1">{song.voicings[chord]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 space-y-10">
                {song.sections.map((section, index) => (
                    <section key={index} className="song-section">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 ml-2 border-l-4 border-indigo-200 pl-3">
                            {section.name}
                        </h4>
                        <div className="pl-4">
                            {renderContent(section.content, song.type)}
                        </div>
                    </section>
                ))}
            </div>

            {/* Uncertainties Section */}
            {song.uncertainties && song.uncertainties.length > 0 && (
                <div className="mt-10 p-5 bg-amber-50/50 rounded-xl border border-amber-200/60">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        Transcription Uncertainties
                    </h3>
                    <ul className="space-y-2 text-sm text-amber-800">
                        {song.uncertainties.slice(0, 10).map((u, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5 shrink-0">-</span>
                                <div>
                                    <span className="font-medium">{u.location}:</span>{' '}
                                    <span className="text-amber-700">{u.message}</span>
                                    {u.candidates.length > 0 && (
                                        <span className="text-amber-500 ml-1">
                                            [{u.candidates.join(' / ')}]
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                        {song.uncertainties.length > 10 && (
                            <li className="text-amber-500 italic pl-5">
                                ...and {song.uncertainties.length - 10} more
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* Footer stamp */}
            <div className="mt-16 pt-8 border-t border-gray-100 text-center text-xs text-gray-400 font-medium">
                Generated by Audio Analysis Engine + DeepSeek AI • Confidence: {Math.round(song.metadata.confidence * 100)}% • {new Date(song.metadata.transcribedAt).toLocaleDateString()}
            </div>
        </div>
    );
}
