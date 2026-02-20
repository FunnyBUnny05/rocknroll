import { useMemo } from 'react';
import { useSpotifyStore } from '../../store/useSpotifyStore';
import { useAppStore } from '../../store/useAppStore';
import type { SongEvent } from '../../types/song';

export function TabRoll({ events }: { events: SongEvent[] }) {
    const positionMs = useSpotifyStore((s) => s.positionMs);
    const song = useAppStore((s) => s.song);
    const positionSec = positionMs / 1000;

    // Dynamically calculate speed based on BPM (e.g. 100 pixels per beat)
    const bpm = song?.bpm || 120;
    const PIXELS_PER_BEAT = 100;
    const PIXELS_PER_SECOND = (bpm / 60) * PIXELS_PER_BEAT;

    // Only render events that are within a reasonable window of the playhead to save DOM nodes
    const visibleEvents = useMemo(() => {
        // 5 seconds behind, 10 seconds ahead
        return events.filter(e => e.time >= positionSec - 5 && e.time <= positionSec + 10);
    }, [events, positionSec]);

    return (
        <div className="relative w-full h-56 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 font-mono text-sm shadow-inner shadow-black/50">

            {/* Background String Lines */}
            <div className="absolute inset-y-0 left-0 right-0 flex flex-col justify-around py-6 pointer-events-none opacity-20">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-px w-full bg-white shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                ))}
                {/* String Labels (Left Edge) */}
                <div className="absolute left-2 inset-y-0 flex flex-col justify-around py-6 text-[10px] text-gray-500 font-bold font-sans">
                    <span>e</span>
                    <span>B</span>
                    <span>G</span>
                    <span>D</span>
                    <span>A</span>
                    <span>E</span>
                </div>
            </div>

            {/* Fixed Playhead (Center) */}
            <div
                className="absolute top-0 bottom-0 w-[2px] bg-green-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                style={{ left: '30%' }}
            />

            {/* Sliding Tab Canvas */}
            <div
                className="absolute inset-y-0 will-change-transform"
                style={{
                    // Center is at 30% width. We translate the timeline container leftwards.
                    transform: `translateX(calc(30% - ${positionSec * PIXELS_PER_SECOND}px))`
                }}
            >
                {/* Render Only Visible Events */}
                {visibleEvents.map((evt, i) => {
                    const x = evt.time * PIXELS_PER_SECOND;

                    if (evt.type === 'tab') {
                        return (
                            <div key={`tab-${evt.time}-${i}`} className="absolute inset-y-[24px] flex flex-col justify-between py-1 z-10 w-6 -ml-3" style={{ left: x }}>
                                {[...Array(6)].map((_, stringIdx) => {
                                    const stringNum = stringIdx + 1; // 1 to 6
                                    const note = evt.notes?.find(n => n.string === stringNum);
                                    return (
                                        <div key={stringIdx} className="w-full flex items-center justify-center font-bold text-green-400 bg-gray-950/80 rounded" style={{ height: '22px' }}>
                                            {note ? note.fret : <span className="text-gray-700 opacity-50">-</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    if (evt.type === 'chord' && evt.chord) {
                        return (
                            <div key={`chord-${evt.time}-${i}`} className="absolute inset-y-[24px] flex flex-col justify-between py-1 z-10 w-8 -ml-4" style={{ left: x }}>
                                {/* Chord Name Header */}
                                <div className="absolute -top-6 w-full text-center text-green-300 font-bold bg-gray-900/80 rounded px-1 whitespace-nowrap shadow border border-green-900/30">
                                    {evt.chord.symbol}
                                </div>

                                {[...Array(6)].map((_, stringIdx) => {
                                    const stringNum = stringIdx + 1; // 1 to 6
                                    const isMuted = evt.chord?.mutedStrings.includes(stringNum);
                                    const note = evt.chord?.placements.find(n => n.string === stringNum);

                                    return (
                                        <div key={stringIdx} className="w-full flex items-center justify-center font-bold text-gray-200 bg-gray-900/90 rounded border border-gray-800" style={{ height: '22px' }}>
                                            {isMuted ? <span className="text-red-500">x</span> : (note ? note.fret : '0')}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}
