import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fingerPosition } from '../../engine/fretboardGeometry';
import { useGhostStore } from '../../store/useGhostStore';

/** Colors for each finger */
const FINGER_COLORS: Record<number, string> = {
  0: '#9333ea', // thumb
  1: '#8b5cf6', // index
  2: '#7c3aed', // middle
  3: '#6d28d9', // ring
  4: '#5b21b6', // pinky
};

/** Finger segment lengths (knuckle, middle phalanx, tip) relative to base size */
const FINGER_SEGMENTS: Record<number, number[]> = {
  0: [0.07, 0.05],           // thumb: 2 segments
  1: [0.08, 0.06, 0.04],     // index
  2: [0.09, 0.07, 0.045],    // middle (longest)
  3: [0.085, 0.065, 0.04],   // ring
  4: [0.065, 0.05, 0.035],   // pinky (shortest)
};

/** Procedural finger with bone-driven segments */
function ProceduralFinger({
  position,
  fingerIndex,
  isActive,
  curlAngle,
}: {
  position: [number, number, number];
  fingerIndex: number;
  isActive: boolean;
  curlAngle: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(...position));

  const color = FINGER_COLORS[fingerIndex] ?? FINGER_COLORS[1];
  const segments = FINGER_SEGMENTS[fingerIndex] ?? FINGER_SEGMENTS[1];

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    targetPos.current.set(...position);
    groupRef.current.position.lerp(targetPos.current, 1 - Math.pow(0.001, delta));

    // Subtle breathing animation
    const breathe = isActive ? 1 + Math.sin(Date.now() * 0.003) * 0.03 : 0.9;
    groupRef.current.scale.setScalar(breathe);
  });

  const opacity = isActive ? 0.8 : 0.25;
  const emissiveIntensity = isActive ? 0.5 : 0.05;

  return (
    <group ref={groupRef} position={position}>
      {/* Fingertip sphere (presses the string) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Glow ring around fingertip */}
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[0.06, 0.09, 20]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isActive ? 0.4 : 0}
          emissive={color}
          emissiveIntensity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Finger bone segments extending upward (away from fretboard) */}
      {segments.map((length, i) => {
        const segZ = 0.06 + segments.slice(0, i).reduce((a, b) => a + b, 0) + length / 2;
        const segAngle = curlAngle * (i + 1) * 0.3;
        const segX = Math.sin(segAngle) * length * 0.5;
        const radius = 0.04 - i * 0.008;

        return (
          <mesh
            key={`seg-${i}`}
            position={[segX, 0, segZ]}
            rotation={[0, 0, segAngle]}
          >
            <capsuleGeometry args={[Math.max(radius, 0.015), length, 4, 8]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={opacity * 0.7}
              emissive={color}
              emissiveIntensity={emissiveIntensity * 0.5}
            />
          </mesh>
        );
      })}

      {/* Knuckle joint spheres */}
      {segments.slice(0, -1).map((_, i) => {
        const jointZ = 0.06 + segments.slice(0, i + 1).reduce((a, b) => a + b, 0);
        return (
          <mesh key={`joint-${i}`} position={[0, 0, jointZ]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={opacity * 0.5}
              emissive={color}
              emissiveIntensity={emissiveIntensity * 0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Palm mesh connecting the fingers */
function GhostPalm({
  positions,
  isActive,
}: {
  positions: [number, number, number][];
  isActive: boolean;
}) {
  const palmRef = useRef<THREE.Group>(null);

  const center = useMemo(() => {
    if (positions.length === 0) return [0, 0, 0] as [number, number, number];
    const avg: [number, number, number] = [0, 0, 0];
    for (const p of positions) {
      avg[0] += p[0];
      avg[1] += p[1];
      avg[2] += p[2];
    }
    return avg.map((v) => v / positions.length) as [number, number, number];
  }, [positions]);

  const palmWidth = useMemo(() => {
    if (positions.length < 2) return 0.2;
    const ys = positions.map((p) => p[1]);
    return Math.max(Math.abs(Math.max(...ys) - Math.min(...ys)) * 0.6, 0.15);
  }, [positions]);

  useFrame((_state, delta) => {
    if (!palmRef.current) return;
    const target = new THREE.Vector3(center[0], center[1], center[2] + 0.2);
    palmRef.current.position.lerp(target, 1 - Math.pow(0.001, delta));
  });

  if (positions.length === 0) return null;

  return (
    <group ref={palmRef} position={[center[0], center[1], center[2] + 0.2]}>
      {/* Palm body */}
      <mesh>
        <boxGeometry args={[0.12, palmWidth, 0.15]} />
        <meshStandardMaterial
          color="#7c3aed"
          transparent
          opacity={isActive ? 0.3 : 0.08}
          emissive="#7c3aed"
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>
      {/* Wrist extension */}
      <mesh position={[0, 0, 0.12]}>
        <capsuleGeometry args={[palmWidth * 0.35, 0.1, 4, 8]} />
        <meshStandardMaterial
          color="#6d28d9"
          transparent
          opacity={isActive ? 0.2 : 0.05}
          emissive="#6d28d9"
          emissiveIntensity={isActive ? 0.15 : 0}
        />
      </mesh>
    </group>
  );
}

/**
 * GhostHand - 3D procedural hand visualization.
 *
 * Each finger is built from capsule-geometry bone segments with
 * sphere joints, creating a realistic skeletal hand appearance.
 * Fingers smoothly animate between chord positions via lerp.
 */
export function GhostHand() {
  const activeHandPose = useGhostStore((s) => s.activeHandPose);

  const fingerData = useMemo(() => {
    if (!activeHandPose) return [];
    return activeHandPose.placements.map((p) => ({
      position: fingerPosition(p.string, p.fret),
      fingerIndex: p.finger,
      curlAngle: p.fret === 0 ? 0.8 : 0.4 + (p.fret / 12) * 0.3,
    }));
  }, [activeHandPose]);

  const positions = fingerData.map((f) => f.position);
  const isActive = !!activeHandPose;

  return (
    <group>
      {fingerData.map((f, i) => (
        <ProceduralFinger
          key={`finger-${i}`}
          position={f.position}
          fingerIndex={f.fingerIndex}
          isActive={isActive}
          curlAngle={f.curlAngle}
        />
      ))}
      <GhostPalm positions={positions} isActive={isActive} />
    </group>
  );
}
