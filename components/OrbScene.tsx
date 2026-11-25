"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function Orb() {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.12;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.08;
    }
    if (halo.current) halo.current.rotation.z -= delta * 0.08;
  });

  return (
    <group>
      <Float speed={1.2} rotationIntensity={0.18} floatIntensity={0.3}>
        <mesh ref={mesh}>
          <sphereGeometry args={[1.18, 64, 64]} />
          <meshPhysicalMaterial
            color="#243b9a"
            roughness={0.25}
            metalness={0.25}
            clearcoat={1}
            clearcoatRoughness={0.12}
            emissive="#1b2c9b"
            emissiveIntensity={0.48}
          />
        </mesh>
        <mesh scale={1.025}>
          <sphereGeometry args={[1.18, 48, 48]} />
          <meshBasicMaterial
            color="#6b74ff"
            wireframe
            transparent
            opacity={0.035}
          />
        </mesh>
      </Float>
      <mesh ref={halo} rotation={[1.05, 0.25, -0.25]} scale={[1.7, 1.7, 0.28]}>
        <torusGeometry args={[1.18, 0.008, 8, 160]} />
        <meshBasicMaterial color="#7777ff" transparent opacity={0.42} />
      </mesh>
      <mesh rotation={[1.05, 0.25, 0.18]} scale={[2.0, 2.0, 0.28]}>
        <torusGeometry args={[1.18, 0.004, 8, 160]} />
        <meshBasicMaterial color="#378cff" transparent opacity={0.24} />
      </mesh>
      <pointLight
        position={[-2, 2, 2]}
        color="#4bcaff"
        intensity={7}
        distance={8}
      />
      <pointLight
        position={[2, -1, 1]}
        color="#7855ff"
        intensity={5}
        distance={7}
      />
      <Sparkles
        count={55}
        scale={5.4}
        size={2.1}
        speed={0.28}
        color="#8da8ff"
        opacity={0.62}
      />
    </group>
  );
}

export default function OrbScene() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[-20px] h-[270px] w-[340px] -translate-x-1/2 opacity-90 sm:top-[-34px] sm:h-[310px] sm:w-[410px]">
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.55} />
        <Orb />
      </Canvas>
    </div>
  );
}
