import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import './FaceScanModel.css';

export const FaceScanModel = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 2.35);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'face-scan-model-canvas';
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D face model. Drag to rotate.');
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xd8f5e0, 0x111715, 2));
    const keyLight = new THREE.DirectionalLight(0xe9ffe8, 3);
    keyLight.position.set(2, 3, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8dffad, 2);
    rimLight.position.set(-3, 1, -2);
    scene.add(rimLight);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const rotationTarget = { x: 0, y: 0 };
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let animationFrame = 0;
    let lastFrameTime = 0;
    let disposed = false;
    let modelRoot: THREE.Object3D | undefined;

    const render = (time: number) => {
      animationFrame = 0;
      if (disposed) return;

      const delta = lastFrameTime === 0 ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 0.05);
      lastFrameTime = time;
      const easing = 1 - Math.exp(-12 * delta);
      pivot.rotation.x += (rotationTarget.x - pivot.rotation.x) * easing;
      pivot.rotation.y += (rotationTarget.y - pivot.rotation.y) * easing;
      renderer.render(scene, camera);

      if (
        Math.abs(rotationTarget.x - pivot.rotation.x) > 0.001 ||
        Math.abs(rotationTarget.y - pivot.rotation.y) > 0.001
      ) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const scheduleRender = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      scheduleRender();
    });
    resizeObserver.observe(container);

    const canvas = renderer.domElement;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      activePointerId = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.classList.add('is-dragging');
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;

      const rect = canvas.getBoundingClientRect();
      const deltaX = (event.clientX - lastPointerX) / rect.width;
      const deltaY = (event.clientY - lastPointerY) / rect.height;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      rotationTarget.y = THREE.MathUtils.clamp(rotationTarget.y + deltaX * Math.PI * 1.5, -1.2, 1.2);
      rotationTarget.x = THREE.MathUtils.clamp(rotationTarget.x + deltaY * Math.PI, -0.65, 0.65);
      scheduleRender();
    };

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      activePointerId = null;
      canvas.classList.remove('is-dragging');
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    const loader = new GLTFLoader();
    loader.load(
      '/aivora-face.glb',
      (gltf) => {
        if (disposed) {
          gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach((material) => material.dispose());
            }
          });
          return;
        }

        modelRoot = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(modelRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const scale = 1.15 / size.y;
        modelRoot.position.sub(center);
        pivot.scale.setScalar(scale);

        modelRoot.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = false;
          object.receiveShadow = false;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.color.set(object.name.toLowerCase().includes('eye') ? '#52675a' : '#34403b');
              material.emissive.set(object.name.toLowerCase().includes('eye') ? '#102518' : '#080e0c');
              material.roughness = 0.82;
              material.needsUpdate = true;
            }
          });
        });

        pivot.add(modelRoot);
        scheduleRender();
      },
      undefined,
      (error) => {
        if (disposed) return;
        console.error('Failed to load the Aivora face model.', error);
        setLoadError(true);
      }
    );

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      if (modelRoot) {
        modelRoot.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="face-scan-model">
      {loadError && (
        <p className="face-scan-model-error" role="alert">
          The 3D face model could not be loaded.
        </p>
      )}
    </div>
  );
};
