import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ThreeHeroSceneProps {
  className?: string;
}

export const ThreeHeroScene: React.FC<ThreeHeroSceneProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setHasWebGL(false);
      return;
    }

    // Detect WebGL capability safely
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 14);

    // 2. Renderer with performance optimizations
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('WebGL init failed, falling back:', e);
      setHasWebGL(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xffc800, 3.5, 40);
    goldLight.position.set(6, 8, 8);
    scene.add(goldLight);

    const cyanRimLight = new THREE.PointLight(0x38bdf8, 2.0, 30);
    cyanRimLight.position.set(-8, -6, -4);
    scene.add(cyanRimLight);

    const dirLight = new THREE.DirectionalLight(0xfff5cc, 1.5);
    dirLight.position.set(0, 10, 5);
    scene.add(dirLight);

    // 4. Central 3D Core Group (The Bizora Intelligence Hub)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner Faceted Crystal
    const innerGeo = new THREE.IcosahedronGeometry(2.4, 0);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      emissive: 0x221a00,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      wireframe: false,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // Outer Golden Wireframe Cage
    const outerGeo = new THREE.IcosahedronGeometry(2.7, 1);
    const outerWireMat = new THREE.MeshBasicMaterial({
      color: 0xffc800,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const outerWireMesh = new THREE.Mesh(outerGeo, outerWireMat);
    coreGroup.add(outerWireMesh);

    // Golden Orbit Ring 1 (Horizontal tilt)
    const ringGeo1 = new THREE.TorusGeometry(4.2, 0.04, 16, 100);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0xffc800,
      emissive: 0xffc800,
      emissiveIntensity: 0.4,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 3;
    ringMesh1.rotation.y = Math.PI / 6;
    coreGroup.add(ringMesh1);

    // Golden Orbit Ring 2 (Vertical tilt)
    const ringGeo2 = new THREE.TorusGeometry(4.7, 0.03, 16, 100);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x94a3b8,
      emissiveIntensity: 0.2,
      metalness: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.5,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 4;
    ringMesh2.rotation.z = Math.PI / 5;
    coreGroup.add(ringMesh2);

    // 5. Orbiting Satellites (Modules: POS, Stock, Accounts, VAT, Online)
    const satelliteCount = 5;
    const satellites: THREE.Mesh[] = [];
    const satelliteColors = [0xffc800, 0x10b981, 0x3b82f6, 0xf59e0b, 0x8b5cf6];

    for (let i = 0; i < satelliteCount; i++) {
      const satGeo = new THREE.SphereGeometry(0.38, 24, 24);
      const satMat = new THREE.MeshStandardMaterial({
        color: satelliteColors[i],
        emissive: satelliteColors[i],
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      coreGroup.add(satMesh);
      satellites.push(satMesh);
    }

    // 6. Ambient Floating Golden Particles Field
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 22;
      particlePositions[i + 1] = (Math.random() - 0.5) * 18;
      particlePositions[i + 2] = (Math.random() - 0.5) * 16;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffd54f,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Mouse interaction and smooth parallax
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 8. Viewport Intersection Observer (pause when out of view)
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth camera / group rotation damping (lerp)
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      coreGroup.rotation.y = elapsed * 0.35 + currentX;
      coreGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.15 - currentY;
      outerWireMesh.rotation.y = -elapsed * 0.25;

      // Update orbiting satellites
      satellites.forEach((sat, i) => {
        const offset = (i / satelliteCount) * Math.PI * 2;
        const angle = elapsed * 0.8 + offset;
        const radius = 4.2;
        sat.position.x = Math.cos(angle) * radius;
        sat.position.z = Math.sin(angle) * radius;
        sat.position.y = Math.sin(angle * 2) * 0.9;
      });

      // Gently rotate particle background
      particleSystem.rotation.y = elapsed * 0.04;
      particleSystem.rotation.x = Math.cos(elapsed * 0.03) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 11. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();

      // Dispose resources
      innerGeo.dispose();
      innerMat.dispose();
      outerGeo.dispose();
      outerWireMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      satellites.forEach((sat) => {
        sat.geometry.dispose();
        if (Array.isArray(sat.material)) {
          sat.material.forEach((m) => m.dispose());
        } else {
          sat.material.dispose();
        }
      });

      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!hasWebGL) {
    // Beautiful fallback SVG / CSS 3D illusion for low-power devices or reduced-motion
    return (
      <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
        <div className="w-80 h-80 rounded-full bg-gradient-to-tr from-amber-400/20 via-yellow-500/10 to-transparent blur-3xl animate-pulse" />
        <div className="relative z-10 w-64 h-64 border-2 border-amber-400/40 rounded-3xl rotate-12 flex items-center justify-center backdrop-blur-md bg-black/40 shadow-2xl">
          <div className="w-44 h-44 border border-amber-400/60 rounded-2xl -rotate-6 flex items-center justify-center bg-amber-400/5">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-black text-3xl shadow-lg">
              B
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[380px] sm:h-[460px] lg:h-[520px] select-none pointer-events-auto cursor-grab active:cursor-grabbing ${className}`}
      aria-label="3D Interactive Bizora Platform Model"
      role="img"
    />
  );
};

export default ThreeHeroScene;

