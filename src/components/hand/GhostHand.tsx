import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fingerPosition } from '../../engine/fretboardGeometry';
import { useGhostStore } from '../../store/useGhostStore';

/** Colors for each finger */
const FINGER_COLORS: Record<number, string> = {
  0: '#9333ea', // thumb - purple
  1: '#8b5cf6', // index - violet
  2: '#7c3aed', // middle - deep violet
  3: '#6d28d9', // ring - purple
  4: '#5b21b6', // pinky - dark purple
};

/** A single ghost finger sphere with glow effect */
function GhostFinger({
  position,
  fingerIndex,
  isActive,
}: {
  position: [number, number, number];
  fingerIndex: number;
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3(...position));

  // Smooth animation toward target position
  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    targetPos.current.set(...position);

    meshRef.current.position.lerp(targetPos.current, 1 - Math.pow(0.001, delta));

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
    }

    // Pulse effect when active
    const scale = isActive ? 1 + Math.sin(Date.now() * 0.005) * 0.08 : 0.8;
    meshRef.current.scale.setScalar(scale);
  });

  const color = FINGER_COLORS[fingerIndex] ?? FINGER_COLORS[1];

  return (
    <group>
      {/* Main finger sphere */}
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isActive ? 0.85 : 0.3}
          emissive={color}
          emissiveIntensity={isActive ? 0.6 : 0.1}
        />
      </mesh>
      {/* Glow halo */}
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isActive ? 0.25 : 0}
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

/** Connecting line between fingers (simulating hand/palm) */
function HandConnections({
  positions,
}: {
  positions: [number, number, number][];
}) {
  const geometry = useMemo(() => {
    if (positions.length < 2) return null;
    const points = positions.map((p) => new THREE.Vector3(...p));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [positions]);

  if (!geometry) return null;

  return (
    <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.3,
    }))} />
  );
}

/**
 * GhostHand - The 3D semi-transparent hand visualization.
 *
 * Renders finger spheres at correct fretboard positions based on
 * the active hand pose from the store. Fingers smoothly animate
 * between positions using lerp interpolation.
 */
export function GhostHand() {
  const activeHandPose = useGhostStore((s) => s.activeHandPose);

  const fingerData = useMemo(() => {
    if (!activeHandPose) return [];
    return activeHandPose.placements.map((p) => ({
      position: fingerPosition(p.string, p.fret),
      fingerIndex: p.finger,
    }));
  }, [activeHandPose]);

  const positions = fingerData.map((f) => f.position);

  return (
    <group>
      {fingerData.map((f, i) => (
        <GhostFinger
          key={`finger-${i}`}
          position={f.position}
          fingerIndex={f.fingerIndex}
          isActive={!!activeHandPose}
        />
      ))}
      <HandConnections positions={positions} />
    </group>
  );
}
