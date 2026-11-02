"use client";
/**
 * Lite bust stage in plain three.js (ported from RakazaAiTerminal's r3f stage-canvas; no @react-three deps here).
 * Per frame: rig-anim idle (breathe, sway, blink, saccades, analyser mouth) + Talk overlays read from the
 * avatar bus: think = gaze away, listen = head tilt, speak = eyes to camera, emote = soft decaying expression.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { readBands, readLevel } from "@/lib/stage/audio-bus";
import { getStage } from "@/lib/stage/motion-bus";
import { newAnimState, stepRig } from "@/lib/stage/rig-anim";
import { avatar, readEmote } from "@/lib/avatar/bus";

export type StageVariant = "bust" | "panel";
export type StageHandle = { zoom: (dir: 1 | -1) => void; reset: () => void };

type Props = { variant: StageVariant; src: string; visible: boolean; lite?: boolean; onReady: () => void; onFail: (why: string) => void; handleRef: React.RefObject<StageHandle | null> };

const CAM: Record<StageVariant, { cy: number; h: number; w: number; fov: number }> = {
  bust: { cy: 1.4, h: 0.66, w: 0.66, fov: 28 },
  panel: { cy: 0.9, h: 1.74, w: 1.2, fov: 26 },
};
function fitDistance(v: StageVariant, aspect: number) {
  const c = CAM[v];
  const t = Math.tan((c.fov * Math.PI) / 360);
  return Math.max(c.h / 2 / t, c.w / 2 / (t * aspect));
}

export default function StageCanvas({ variant, src, visible, lite, onReady, onFail, handleRef }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const visRef = useRef(visible);
  useEffect(() => { visRef.current = visible; }, [visible]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    const cfg = CAM[variant];
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer(lite ? { alpha: true, antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" } : { alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "default" });
    } catch (e) {
      onFail(e instanceof Error ? e.message : "webgl failed");
      return;
    }
    renderer.setPixelRatio(lite ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y";
    el.appendChild(renderer.domElement);
    const lost = (e: Event) => { e.preventDefault(); onFail("webgl context lost"); };
    renderer.domElement.addEventListener("webglcontextlost", lost);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, lite ? 1.2 : 1.15));
    const key = new THREE.DirectionalLight(0xfff4e8, lite ? 2.0 : 2.1); key.position.set(1.5, 2.5, 2.5); scene.add(key);
    if (!lite) {
    const rimA = new THREE.DirectionalLight(0x9d7bff, 1.1); rimA.position.set(-2, 1.2, -1.5); scene.add(rimA);
    const rimB = new THREE.DirectionalLight(0xff6fb5, 0.8); rimB.position.set(2, 0.4, -2); scene.add(rimB);
    }
    const camera = new THREE.PerspectiveCamera(cfg.fov, 1, 0.1, 30);
    const group = new THREE.Group(); scene.add(group);
    const look = new THREE.Object3D(); scene.add(look);

    const ctl = new OrbitControls(camera, renderer.domElement);
    ctl.enablePan = false; ctl.enableZoom = false; ctl.enableDamping = !lite; ctl.dampingFactor = 0.08; ctl.rotateSpeed = 0.6;
    ctl.minPolarAngle = Math.PI * (variant === "panel" ? 0.25 : 0.32); ctl.maxPolarAngle = Math.PI * (variant === "panel" ? 0.72 : 0.62); ctl.minAzimuthAngle = -Math.PI * 0.5; ctl.maxAzimuthAngle = Math.PI * 0.5;
    let base = 3;
    let fitBox: { cy: number; h: number; w: number } | null = null;
    const fit = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (fitBox) { const t = Math.tan((camera.fov * Math.PI) / 360); base = Math.max(fitBox.h / 2 / t, fitBox.w / 2 / (t * camera.aspect)); }
      else base = fitDistance(variant, camera.aspect);
      ctl.minDistance = base * 0.55; ctl.maxDistance = base * 1.25;
    };
    const reset = () => { const cy = fitBox ? fitBox.cy : cfg.cy; ctl.target.set(0, cy, 0); camera.position.set(0, cy + (fitBox ? 0.02 : 0.04), base); ctl.update(); };
    fit(); reset();
    const ro = new ResizeObserver(() => { fit(); ctl.update(); });
    ro.observe(el);
    handleRef.current = {
      zoom: (dir) => { const v = camera.position.clone().sub(ctl.target).multiplyScalar(dir > 0 ? 0.85 : 1.18); const d = THREE.MathUtils.clamp(v.length(), ctl.minDistance, ctl.maxDistance); camera.position.copy(ctl.target).add(v.setLength(d)); ctl.update(); },
      reset,
    };

    let vrm: VRM | null = null;
    const anim = newAnimState();
    const ov = { tilt: 0, away: 0, emo: 0 };
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    loader.load(src, (gltf) => {
      const v = gltf.userData.vrm as VRM | undefined;
      if (dead) { if (v) VRMUtils.deepDispose(v.scene); return; }
      if (!v) return onFail("not a VRM file");
      // VRM1: skip removeUnnecessaryVertices/combineSkeletons (they can break skinning/humanoid on some VRM1 files)
      if ((v.meta as { metaVersion?: string } | undefined)?.metaVersion !== "1") { VRMUtils.removeUnnecessaryVertices(gltf.scene); VRMUtils.combineSkeletons(gltf.scene); }
      VRMUtils.rotateVRM0(v);
      v.scene.traverse((o) => { o.frustumCulled = false; });
      // relaxed A-pose before the first rig frame: never a T-pose
      // VRM 1.0 (VRMC_vrm): rotateVRM0 is a no-op; it already faces +Z (the camera). Its normalized arm frame needs the flip in rig-anim.
      const isV1 = (v.meta as { metaVersion?: string } | undefined)?.metaVersion === "1" && !window.location.search.includes("rkflip=0");
      anim.vrm1 = isV1;
      const az = isV1 ? -1 : 1;
      const set = (n: Parameters<typeof v.humanoid.getNormalizedBoneNode>[0], x: number, y: number, z: number) => v.humanoid.getNormalizedBoneNode(n)?.rotation.set(x, y, z);
      set("leftUpperArm", 0.05 * az, 0, 1.15 * az); set("rightUpperArm", 0.05 * az, 0, -1.15 * az); set("leftLowerArm", 0, 0, 0.12 * az); set("rightLowerArm", 0, 0, -0.12 * az);
      for (const leg of ["leftUpperLeg", "rightUpperLeg", "leftLowerLeg", "rightLowerLeg", "leftFoot", "rightFoot"] as const) set(leg, 0, 0, 0);
      if (v.lookAt) v.lookAt.target = look;
      group.add(v.scene);
      vrm = v;
      // settle into the natural idle (arms down, feet planted) BEFORE measuring, so the bbox never sees raised arms
      { const h0 = v.humanoid; for (let i = 0; i < 3; i++) stepRig(anim, { dt: 1 / 60, motion: "idle", bold: false, level: 0, low: 0, mid: 0, high: 0, beat: 0, bpm: 100, cam: [camera.position.x, camera.position.y, camera.position.z], energy: 0.6 },
        (n) => h0.getNormalizedBoneNode(n as Parameters<typeof h0.getNormalizedBoneNode>[0]), () => {}, group, look); }
      v.update(0);
      if (lite) (v as unknown as { springBoneManager?: unknown }).springBoneManager = undefined; // springs stall SwiftShader
      // plant feet on y=0 (kills floating), then remeasure
      v.humanoid.update(); group.updateMatrixWorld(true);
      { const b0 = new THREE.Box3().setFromObject(v.scene, true); if (!b0.isEmpty()) { v.scene.position.y -= b0.min.y; group.updateMatrixWorld(true); } }
      if (variant === "panel") {
        // fit the whole figure (hair to feet) from its real bounding box, measured in idle pose
        const box = new THREE.Box3().setFromObject(v.scene, true);
        if (!box.isEmpty()) {
          const sz = box.getSize(new THREE.Vector3());
          fitBox = { cy: (box.min.y + box.max.y) / 2, h: sz.y * 1.06, w: Math.max(sz.x, sz.z) * 1.06 };
          fit(); reset();
        }
      }
      if (window.location.search.includes("rkdebug")) (window as unknown as { __rkVrm?: VRM }).__rkVrm = v;
      onReady();
    }, undefined, (e) => !dead && onFail(e instanceof Error ? e.message : "load failed"));

    const clock = new THREE.Clock();
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    let acc = 0;
    renderer.setAnimationLoop(() => {
      const raw = clock.getDelta();
      if (!visRef.current) return;
      if (lite) { acc += raw; if (acc < 1 / 30) return; }
      const dt = Math.min(lite ? acc : raw, 0.05);
      acc = 0;
      ctl.update();
      if (vrm) {
        const h = vrm.humanoid;
        const em = vrm.expressionManager;
        let level = readLevel();
        const b = { ...readBands() };
        // synthetic voice when speaking but analyser is silent (autoplay-blocked / no analyser)
        if (avatar.state === "speak" && level < 0.05) {
          const tt = clock.elapsedTime;
          level = 0.45 + 0.1 * Math.sin(tt * 9.1) * Math.sin(tt * 3.7);
          b.low = 0.3 + 0.15 * Math.sin(tt * 7.3); b.mid = 0.45 + 0.2 * Math.sin(tt * 11.3); b.high = 0.2 + 0.1 * Math.sin(tt * 13.1);
        }
        stepRig(anim, { dt, motion: "idle", bold: getStage().bold, level, low: b.low, mid: b.mid, high: b.high, beat: 0, bpm: 100, cam: [camera.position.x, camera.position.y, camera.position.z], energy: 0.6 },
          (n) => h.getNormalizedBoneNode(n as Parameters<typeof h.getNormalizedBoneNode>[0]), (n, x) => em?.setValue(n, x), group, look);
        // Talk overlays (additive, eased so state changes never snap)
        const st = avatar.state;
        const k = Math.min(1, dt * 10);
        ov.tilt = lerp(ov.tilt, st === "listen" ? 1 : 0, k);
        ov.away = lerp(ov.away, st === "think" ? 1 : 0, k);
        const head = h.getNormalizedBoneNode("head");
        if (head) { head.rotation.z += ov.tilt * 0.14; head.rotation.y += ov.away * 0.22; head.rotation.x += ov.away * 0.06; }
        if (ov.away > 0.01) look.position.set(look.position.x + ov.away * 0.9, look.position.y + ov.away * 0.35, look.position.z);
        const e = readEmote();
        if (em && e) em.setValue(e.tag, Math.max(em.getValue(e.tag) ?? 0, e.w * 0.85));
        h.update();
        vrm.update(dt);
      }
      renderer.render(scene, camera);
    });

    return () => {
      dead = true;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      ctl.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      if (vrm) { group.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); vrm = null; }
      renderer.dispose();
      renderer.domElement.remove();
      handleRef.current = null;
    };
  }, [variant, src, lite, onReady, onFail, handleRef]);

  return <div ref={host} className="absolute inset-0" aria-hidden="true" />;
}
