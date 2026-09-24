"use client";

/**
 * Silk — a living fabric background.
 *
 * Adapted from the React-Bits Silk shader and rebuilt as dependency-free
 * raw WebGL: one fullscreen triangle, one fragment shader. Slow ink-blue
 * silk folds with fine thread striations and filmic grain — the field
 * breathes on its own and leans gently toward the cursor like real
 * fabric, then melts into the page canvas at the bottom edge.
 *
 * Citizenship:
 *  - renders only while on screen (IntersectionObserver) and tab visible
 *  - `prefers-reduced-motion` → a single static frame, no loop, no pointer
 *  - DPR capped at 2 / 2400px backing width, `low-power` GPU hint
 *  - WebGL unavailable → renders nothing (the hero stands on its own)
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform vec3  uShadow;        /* fabric valleys — just below canvas   */
uniform vec3  uMid;           /* fabric body — deep ink navy          */
uniform vec3  uCrest;         /* fold ridges — electric blue family   */
uniform vec3  uSpec;          /* sheen on the strongest threads       */
uniform float uSpecStrength;
uniform vec3  uCanvas;        /* page canvas — the melt target        */
uniform vec2  uPointer;       /* uv space, y-up                       */
uniform float uPointerEnergy; /* eased 0..1 presence                  */

const float E = 2.71828182845904523536;

float hash(vec2 texCoord) {
  float G = E;
  vec2 r = G * sin(G * texCoord);
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c) * uv;
}

void main() {
  float rnd = hash(gl_FragCoord.xy);

  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float t = uSpeed * uTime;

  /* fabric breathing */
  tex.y += 0.03 * sin(8.0 * tex.x - t);

  /* pointer — the field bulges around the cursor + quiet ripple rings */
  vec2 d = vUv - uPointer;
  float dist = length(d);
  float warp = uPointerEnergy * 0.09 * exp(-dist * 2.6);
  tex += d * warp;
  float ripple = sin(dist * 18.0 - uTime * 2.4) * exp(-dist * 4.0) * uPointerEnergy;

  /* the silk signature — broad folds + fine parallel threads */
  float pattern = 0.6
    + 0.4 * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * t))
    + sin(20.0 * (tex.x + tex.y - 0.1 * t))
    + ripple * 0.25;

  /* map the fabric into the LOCATE ink-blue range */
  float fold  = smoothstep(-0.55, 0.90, pattern);
  float crest = smoothstep(0.78, 1.45, pattern);
  float spec  = smoothstep(1.12, 1.62, pattern);

  vec3 col = mix(uShadow, uMid, fold);
  col = mix(col, uCrest, crest);
  col += uSpec * (spec * uSpecStrength);

  /* filmic grain */
  col -= vec3(rnd / 15.0 * uNoiseIntensity);

  /* faint crest-colored pooling under the cursor */
  col += uCrest * (uPointerEnergy * 0.35 * exp(-dist * 3.2));

  /* melt into the page canvas over the bottom 16% */
  float fade = smoothstep(0.0, 0.16, vUv.y);
  vec3 outCol = uCanvas + (col - uCanvas) * fade;

  gl_FragColor = vec4(clamp(outCol, 0.0, 1.0), 1.0);
}
`;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const STATIC_FRAME_TIME = 17.0;

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export type SilkProps = {
  className?: string;
  /** flow speed of the fabric (default 1.3 — slow, expensive) */
  speed?: number;
  /** feature scale of the folds (default 1.08) */
  scale?: number;
  /** fold direction in radians (default -0.42 — gentle diagonal) */
  rotation?: number;
  /** filmic grain strength (default 1.3) */
  noiseIntensity?: number;
  /** fabric valley color (default #06070A) */
  shadowColor?: string;
  /** fabric body color (default #0D1018) */
  midColor?: string;
  /** fold ridge color (default #10204E) */
  crestColor?: string;
  /** sheen color on the strongest threads (default #7D9BFF) */
  specColor?: string;
  /** sheen strength 0..1 (default 0.28) */
  specStrength?: number;
  /** the page canvas color the field melts into (default #0A0A0A) */
  canvasColor?: string;
};

export function Silk({
  className,
  speed = 1.3,
  scale = 1.08,
  rotation = -0.42,
  noiseIntensity = 1.3,
  shadowColor = "#06070A",
  midColor = "#0D1018",
  crestColor = "#10204E",
  specColor = "#7D9BFF",
  specStrength = 0.28,
  canvasColor = "#0A0A0A",
}: SilkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* uniform values that can change after setup */
  const propsRef = useRef({
    speed,
    scale,
    rotation,
    noiseIntensity,
    shadowColor,
    midColor,
    crestColor,
    specColor,
    specStrength,
    canvasColor,
  });
  propsRef.current = {
    speed,
    scale,
    rotation,
    noiseIntensity,
    shadowColor,
    midColor,
    crestColor,
    specColor,
    specStrength,
    canvasColor,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    }) as WebGLRenderingContext | null;
    if (!gl) return;

    /* ---- program ---- */
    const compile = (type: number, src: string): WebGLShader | null => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    /* ---- fullscreen triangle ---- */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      time: gl.getUniformLocation(program, "uTime"),
      speed: gl.getUniformLocation(program, "uSpeed"),
      scale: gl.getUniformLocation(program, "uScale"),
      rotation: gl.getUniformLocation(program, "uRotation"),
      noise: gl.getUniformLocation(program, "uNoiseIntensity"),
      shadow: gl.getUniformLocation(program, "uShadow"),
      mid: gl.getUniformLocation(program, "uMid"),
      crest: gl.getUniformLocation(program, "uCrest"),
      spec: gl.getUniformLocation(program, "uSpec"),
      specStrength: gl.getUniformLocation(program, "uSpecStrength"),
      canvas: gl.getUniformLocation(program, "uCanvas"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      energy: gl.getUniformLocation(program, "uPointerEnergy"),
    };

    /* ---- sizing (DPR-capped) ---- */
    let backingW = 0;
    let backingH = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const maxW = 2400;
      let w = Math.round(canvas.clientWidth * dpr);
      let h = Math.round(canvas.clientHeight * dpr);
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      if (w !== backingW || h !== backingH) {
        backingW = w;
        backingH = h;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();

    const ro = new ResizeObserver(() => {
      resize();
      drawOnce();
    });
    ro.observe(canvas);

    /* ---- uniforms from current props ---- */
    const applyProps = () => {
      const p = propsRef.current;
      gl.uniform1f(u.speed, p.speed);
      gl.uniform1f(u.scale, p.scale);
      gl.uniform1f(u.rotation, p.rotation);
      gl.uniform1f(u.noise, p.noiseIntensity);
      gl.uniform3fv(u.shadow, hexToRgb(p.shadowColor));
      gl.uniform3fv(u.mid, hexToRgb(p.midColor));
      gl.uniform3fv(u.crest, hexToRgb(p.crestColor));
      gl.uniform3fv(u.spec, hexToRgb(p.specColor));
      gl.uniform1f(u.specStrength, p.specStrength);
      gl.uniform3fv(u.canvas, hexToRgb(p.canvasColor));
    };
    applyProps();

    /* ---- pointer state ---- */
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, energy: 0, target: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (e.clientX - rect.left) / rect.width;
      const py = 1 - (e.clientY - rect.top) / rect.height;
      const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1;
      if (inside) {
        pointer.tx = px;
        pointer.ty = py;
        pointer.target = 1;
      } else {
        pointer.target = 0;
      }
    };
    const onPointerLeave = () => {
      pointer.target = 0;
    };

    /* ---- render ---- */
    let raf = 0;
    let time = 0;
    let last = performance.now();
    let visible = true;
    let hidden = document.hidden;
    let running = false;

    const drawOnce = (t = time) => {
      gl.uniform1f(u.time, t);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.energy, pointer.energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || hidden) return;

      time += dt;
      pointer.x += (pointer.tx - pointer.x) * 0.09;
      pointer.y += (pointer.ty - pointer.y) * 0.09;
      pointer.energy += (pointer.target - pointer.energy) * 0.06;
      drawOnce();
    };

    const startLoop = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !hidden) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) stopLoop();
      else if (visible) startLoop();
    };

    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = reducedMq.matches;

    const drawStatic = () => {
      pointer.energy = 0;
      drawOnce(STATIC_FRAME_TIME);
    };

    if (reduced) {
      drawStatic();
    } else {
      startLoop();
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerLeave);
    }

    const onReducedChange = () => {
      const next = reducedMq.matches;
      if (next === reduced) return;
      reduced = next;
      if (reduced) {
        stopLoop();
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerleave", onPointerLeave);
        drawStatic();
      } else {
        startLoop();
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        document.addEventListener("pointerleave", onPointerLeave);
      }
    };
    reducedMq.addEventListener("change", onReducedChange);

    document.addEventListener("visibilitychange", onVisibility);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      stopLoop();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
      reducedMq.removeEventListener("change", onReducedChange);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none block h-full w-full", className)}
    />
  );
}
