'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const FluidBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const materialRef = useRef<THREE.ShaderMaterial>();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });

    sceneRef.current = scene;
    rendererRef.current = renderer;

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Fluid simulation shader
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      varying vec2 vUv;

      // Noise function for fluid simulation
      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec2 mod289(vec2 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec3 permute(vec3 x) {
        return mod289(((x*34.0)+1.0)*x);
      }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                           -0.577350269189626,
                            0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
              + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // Fluid dynamics simulation
      vec2 fluidFlow(vec2 pos, vec2 mouse, float time) {
        vec2 mouseInfluence = mouse - pos;
        float mouseDist = length(mouseInfluence);
        
        // Mouse attraction/repulsion
        vec2 mouseForce = normalize(mouseInfluence) * (0.3 / (mouseDist * mouseDist + 0.1));
        
        // Turbulence
        vec2 turbulence = vec2(
          snoise(pos * 3.0 + time * 0.5),
          snoise(pos * 3.0 + time * 0.5 + 100.0)
        ) * 0.1;
        
        // Fluid curl
        float curl = snoise(pos * 2.0 + time * 0.3) * 0.2;
        vec2 curlForce = vec2(-sin(curl), cos(curl)) * 0.1;
        
        return mouseForce + turbulence + curlForce;
      }

      void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        uv.x *= aspect.x;
        
        vec2 mouse = uMouse * aspect;
        
        // Multiple fluid layers
        vec2 flow1 = fluidFlow(uv + vec2(0.1, 0.0), mouse, uTime);
        vec2 flow2 = fluidFlow(uv + vec2(-0.1, 0.1), mouse, uTime * 0.8);
        vec2 flow3 = fluidFlow(uv + vec2(0.0, -0.1), mouse, uTime * 1.2);
        
        // Distort UV coordinates based on fluid flow
        vec2 distortedUV1 = uv + flow1 * 0.3;
        vec2 distortedUV2 = uv + flow2 * 0.4;
        vec2 distortedUV3 = uv + flow3 * 0.2;
        
        // Create gradient blobs
        float blob1 = smoothstep(0.6, 0.0, length(distortedUV1 - vec2(0.3, 0.3)));
        float blob2 = smoothstep(0.8, 0.0, length(distortedUV2 - vec2(0.7, 0.6)));
        float blob3 = smoothstep(0.7, 0.0, length(distortedUV3 - vec2(0.2, 0.8)));
        
        // Mouse proximity blob
        float mouseDist = length(uv - mouse);
        float mouseBlob = smoothstep(0.5, 0.0, mouseDist) * 0.8;
        
        // Color mixing
        vec3 purple1 = vec3(0.37, 0.0, 1.0); // #5e00ff
        vec3 purple2 = vec3(0.54, 0.0, 1.0); // #8a00ff
        vec3 deepBlue = vec3(0.1, 0.04, 0.24); // #1a0a3d
        vec3 darkBase = vec3(0.0, 0.0, 0.0); // #000000
        
        // Blend colors based on blob intensities
        vec3 color = darkBase;
        color = mix(color, purple1, blob1 * 0.6);
        color = mix(color, purple2, blob2 * 0.5);
        color = mix(color, deepBlue, blob3 * 0.7);
        color = mix(color, purple1 * 1.5, mouseBlob);
        
        // Add subtle glow
        float glow = (blob1 + blob2 + blob3 + mouseBlob) * 0.3;
        color += vec3(glow * 0.1, glow * 0.05, glow * 0.2);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
    });

    materialRef.current = material;

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX / window.innerWidth;
      mouseRef.current.y = 1.0 - (event.clientY / window.innerHeight);
    };

    // Resize handler
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
    };

    // Event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value += 0.01;
        materialRef.current.uniforms.uMouse.value.set(
          mouseRef.current.x,
          mouseRef.current.y
        );
      }
      
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default FluidBackground;