'use client';

import { useEffect, useRef, useState } from 'react';

interface WebGLFluidBackgroundProps {
  className?: string;
}

export default function WebGLFluidBackground({ className = '' }: WebGLFluidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  const timeRef = useRef(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.log('WebGL not supported, falling back to canvas');
      return;
    }

    console.log('WebGL Fluid Background initializing...');

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Shader sources
    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec2 u_velocity;
      uniform vec2 u_resolution;
      varying vec2 v_uv;

      // Simple noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 uv = v_uv;
        vec2 mouse = u_mouse;
        
        // Mouse distance and influence
        float dist = distance(uv, mouse);
        float influence = exp(-dist * 3.0);
        
        // Velocity-based wake effect
        float wakeStrength = length(u_velocity) * influence;
        
        // Fluid motion using noise
        float scale = 4.0;
        vec2 offset = vec2(
          noise(uv * scale + u_time * 0.1),
          noise(uv * scale + u_time * 0.1 + 100.0)
        );
        
        // Mouse-influenced flow
        vec2 mouseForce = normalize(uv - mouse) * influence * 0.3;
        vec2 flowUV = uv + offset * 0.02 + mouseForce * 0.05;
        
        // Multiple noise layers for complexity
        float layer1 = noise(flowUV * 3.0 + u_time * 0.05);
        float layer2 = noise(flowUV * 6.0 - u_time * 0.08);
        float layer3 = noise(flowUV * 12.0 + u_time * 0.03);
        
        float fluidMask = (layer1 + layer2 * 0.5 + layer3 * 0.25) / 1.75;
        fluidMask = smoothstep(0.2, 0.8, fluidMask);
        
        // Colors
        vec3 purple = vec3(0.58, 0.2, 0.92);
        vec3 blue = vec3(0.23, 0.51, 0.96);
        vec3 cyan = vec3(0.2, 0.8, 0.9);
        
        // Color mixing
        float colorMix = sin(fluidMask * 3.14159 + u_time) * 0.5 + 0.5;
        vec3 color = mix(purple, blue, colorMix);
        
        // Add wake highlights
        color = mix(color, cyan, wakeStrength);
        
        // Final alpha
        float alpha = fluidMask * 0.3 + wakeStrength * 0.4;
        alpha *= (1.0 - smoothstep(0.0, 0.6, dist)) * 0.3 + 0.15;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Create and compile shader
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // Create program
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      console.error('Failed to create shaders');
      return;
    }

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    // Get locations
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const velocityLocation = gl.getUniformLocation(program, 'u_velocity');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Create buffer
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      
      // Calculate velocity
      const vx = (x - mouseRef.current.x) * 20;
      const vy = (y - mouseRef.current.y) * 20;
      
      mouseRef.current = { x, y, vx, vy };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      timeRef.current += 0.016;

      // Decay velocity
      mouseRef.current.vx *= 0.9;
      mouseRef.current.vy *= 0.9;

      // Clear and setup
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      
      // Set uniforms
      gl.uniform1f(timeLocation, timeRef.current);
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y);
      gl.uniform2f(velocityLocation, mouseRef.current.vx, mouseRef.current.vy);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

      // Set up attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Enable blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    console.log('WebGL Fluid Animation started');

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      console.log('WebGL Fluid cleanup');
    };
  }, [isClient]);

  if (!isClient) {
    return (
      <div
        className={`fixed inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ 
          zIndex: 1,
          background: 'radial-gradient(circle at center, #0a0a0a 0%, #1a1a2e 30%, #0a0a0a 100%)'
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ 
        zIndex: 1,
        background: 'radial-gradient(circle at center, #0a0a0a 0%, #1a1a2e 30%, #0a0a0a 100%)'
      }}
    />
  );
} 