import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Fretboard3D } from './Fretboard3D';
import { GhostHand } from '../hand/GhostHand';
import { useGhostStore } from '../../store/useGhostStore';
import type { ViewMode } from '../../store/useGhostStore';
import { ChordOverlay } from '../ui/ChordOverlay';
import { TabOverlay } from '../ui/TabOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';

/** Logs lifecycle from inside the R3F Canvas */
function SceneLogger() {
  useEffect(() => {
    console.log('[GhostGuitar] 3D scene mounted - WebGL context active');
    return () => {
      console.log('[GhostGuitar] 3D scene unmounted');
    };
  }, []);
  return null;
}

/**
 * GhostFretboard - Main visualization component.
 *
 * Combines the 3D fretboard, Ghost Hand, and either Chord or Tab overlay
 * based on the current view mode. Wrapped in ErrorBoundary so a WebGL
 * failure doesn't kill the entire app.
 */
export function GhostFretboard() {
  const viewMode = useGhostStore((s) => s.viewMode);
  const setViewMode = useGhostStore((s) => s.setViewMode);
  const activeEvent = useGhostStore((s) => s.activeEvent);

  useEffect(() => {
    console.log('[GhostGuitar] GhostFretboard mounted');
  }, []);

  return (
    <div className="relative w-full">
      {/* Mode Toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-1 rounded-lg bg-gray-900/80 p-1 backdrop-blur-sm">
        <ModeButton
          label="Chord"
          mode="chord"
          current={viewMode}
          onClick={setViewMode}
        />
        <ModeButton
          label="Tab"
          mode="tab"
          current={viewMode}
          onClick={setViewMode}
        />
      </div>

      {/* 3D Canvas - wrapped in ErrorBoundary for WebGL failures */}
      <ErrorBoundary label="3D Fretboard">
        <div className="h-[400px] w-full rounded-xl border border-gray-800 bg-gradient-to-b from-gray-900 to-black">
          <Canvas
            camera={{ position: [5, 0, 4], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={() => {
              console.log('[GhostGuitar] Canvas WebGL context created');
            }}
          >
            <SceneLogger />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <pointLight
              position={[3, 0, 2]}
              intensity={0.6}
              color="#8b5cf6"
            />

            <Suspense fallback={null}>
              <Fretboard3D />
              <GhostHand />
            </Suspense>

            <OrbitControls
              enablePan={false}
              minDistance={3}
              maxDistance={12}
              target={[4, 0, 0]}
            />
          </Canvas>
        </div>
      </ErrorBoundary>

      {/* Overlay - switches based on mode */}
      <div className="mt-4">
        {viewMode === 'chord' && activeEvent?.chord && (
          <ChordOverlay chord={activeEvent.chord} />
        )}
        {viewMode === 'tab' && activeEvent?.notes && (
          <TabOverlay notes={activeEvent.notes} />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  label,
  mode,
  current,
  onClick,
}: {
  label: string;
  mode: ViewMode;
  current: ViewMode;
  onClick: (mode: ViewMode) => void;
}) {
  const isActive = mode === current;
  return (
    <button
      onClick={() => onClick(mode)}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
        isActive
          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
