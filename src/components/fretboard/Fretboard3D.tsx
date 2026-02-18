import { useMemo } from 'react';
import * as THREE from 'three';
import {
  FRETBOARD,
  fretX,
  stringY,
  fretPositions,
} from '../../engine/fretboardGeometry';

/** Single guitar string rendered as a line */
function GuitarString({ stringNum }: { stringNum: number }) {
  const y = stringY(stringNum);
  const thickness = 0.005 + (stringNum - 1) * 0.003;

  return (
    <mesh position={[FRETBOARD.LENGTH / 2, y, FRETBOARD.DEPTH + 0.01]}>
      <cylinderGeometry args={[thickness, thickness, FRETBOARD.LENGTH, 8]} />
      <meshStandardMaterial
        color="#c0c0c0"
        metalness={0.9}
        roughness={0.2}
      />
    </mesh>
  );
}

/** Fret wire */
function FretWire({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, FRETBOARD.DEPTH + 0.005]}>
      <boxGeometry args={[0.02, FRETBOARD.WIDTH * 0.85, 0.03]} />
      <meshStandardMaterial
        color="#d4d4d8"
        metalness={0.95}
        roughness={0.1}
      />
    </mesh>
  );
}

/** Fret position marker (dot) */
function FretMarker({ fretNum }: { fretNum: number }) {
  const x = (fretX(fretNum) + fretX(fretNum - 1)) / 2;
  const isDouble = (FRETBOARD.DOUBLE_MARKERS as readonly number[]).includes(fretNum);

  return (
    <group>
      <mesh position={[x, isDouble ? 0.25 : 0, FRETBOARD.DEPTH + 0.005]}>
        <circleGeometry args={[0.05, 16]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>
      {isDouble && (
        <mesh position={[x, -0.25, FRETBOARD.DEPTH + 0.005]}>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial color="#fafafa" />
        </mesh>
      )}
    </group>
  );
}

/**
 * 3D Fretboard rendering.
 * Includes the neck, fret wires, strings, and position markers.
 */
export function Fretboard3D() {
  const frets = useMemo(() => fretPositions(), []);

  // Rotate strings to lie horizontally
  const stringRotation = useMemo(
    () => new THREE.Euler(0, 0, Math.PI / 2),
    []
  );

  return (
    <group>
      {/* Neck body */}
      <mesh position={[FRETBOARD.LENGTH / 2, 0, 0]}>
        <boxGeometry
          args={[FRETBOARD.LENGTH, FRETBOARD.WIDTH, FRETBOARD.DEPTH]}
        />
        <meshStandardMaterial color="#4a3728" roughness={0.8} />
      </mesh>

      {/* Fretboard surface (rosewood) */}
      <mesh position={[FRETBOARD.LENGTH / 2, 0, FRETBOARD.DEPTH / 2 + 0.01]}>
        <boxGeometry
          args={[FRETBOARD.LENGTH, FRETBOARD.WIDTH * 0.95, 0.02]}
        />
        <meshStandardMaterial color="#2d1810" roughness={0.6} />
      </mesh>

      {/* Nut */}
      <mesh position={[0, 0, FRETBOARD.DEPTH + 0.01]}>
        <boxGeometry args={[0.04, FRETBOARD.WIDTH * 0.85, 0.04]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.3} />
      </mesh>

      {/* Fret wires */}
      {frets.map((x, i) => (
        <FretWire key={`fret-${i}`} x={x} />
      ))}

      {/* Strings */}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <group key={`string-${s}`} rotation={stringRotation}>
          <GuitarString stringNum={s} />
        </group>
      ))}

      {/* Fret markers */}
      {FRETBOARD.MARKERS.map((fretNum) => (
        <FretMarker key={`marker-${fretNum}`} fretNum={fretNum} />
      ))}
    </group>
  );
}
