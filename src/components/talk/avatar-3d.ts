import type { TalkState } from "@/lib/avatar/bus";

export type Stage3D = { setState(s: TalkState): void; dispose(): void };

/** Lazy 3D stage. Loaded via dynamic import only after 18+ + "Start talk". */
export async function mountAvatar3D(host: HTMLElement, onDemote: (why: string) => void): Promise<Stage3D> {
  const THREE = await import("three");
  const w = host.clientWidth || 360, h = host.clientHeight || 260;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "default" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h);
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 20);
  cam.position.set(0, 1.35, 2.6); cam.lookAt(0, 1.25, 0);
  const light = new THREE.DirectionalLight(0xffffff, 2.4); light.position.set(1, 2, 2); scene.add(light);
  scene.add(new THREE.HemisphereLight(0xc9b8ff, 0x2a1a40, 0.9)); // ambient fill (non-shadowed)

  const root = new THREE.Group(); scene.add(root);
  const disposables: { dispose(): void }[] = [];
  const mat = (c: number) => { const m = new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.7 }); disposables.push(m); return m; };
  const geo = <G extends { dispose(): void }>(g: G) => { disposables.push(g); return g; };
  let mouth: import("three").Object3D | null = null;
  let eyes: import("three").Object3D[] = [];
  let head: import("three").Object3D = root;
  let vrm: { update(dt: number): void; expressionManager?: { setValue(n: string, v: number): void } | null } | null = null;

  let loaded = false;
  try {
    const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([import("three/examples/jsm/loaders/GLTFLoader.js"), import("@pixiv/three-vrm")]);
    const loader = new GLTFLoader(); loader.register((p) => new VRMLoaderPlugin(p));
    const gltf = await loader.loadAsync("/avatar/rakaza.vrm"); // GET directly; no HEAD (static hosts may reject HEAD)
    const v = gltf.userData.vrm;
    if (v) {
      VRMUtils.removeUnnecessaryVertices?.(gltf.scene); VRMUtils.rotateVRM0(v); root.add(v.scene); vrm = v;
      head = v.humanoid?.getNormalizedBoneNode("head") ?? root;
      // Full-body framing consistent with Stage "panel".
      const hp = new THREE.Vector3(); v.scene.updateMatrixWorld(true);
      (v.humanoid?.getNormalizedBoneNode("head") ?? v.scene).getWorldPosition(hp);
      const hy = hp.y > 0.5 ? hp.y : 1.35;
      cam.fov = 26; { const cy = hy * 0.62, d = (hy + 0.25) / 2 / Math.tan((26 * Math.PI) / 360) * 1.08; cam.position.set(0, cy, d); cam.lookAt(0, cy, 0); } cam.updateProjectionMatrix();
      loaded = true;
    }
  } catch (e) { console.warn("[talk] VRM load failed, using proxy", e); }
  if (!loaded) {

    // Procedural proxy: violet bob, skin head, honey streak, torso.
    const torso = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.28, 0.38, 0.7, 7)), mat(0x5b3fd0)); torso.position.y = 0.75; root.add(torso);
    const hg = new THREE.Group(); hg.position.y = 1.32; root.add(hg); head = hg;
    hg.add(new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.24, 1)), mat(0xf3d2c1)));
    const hair = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.28, 1)), mat(0x7a4dff)); hair.scale.set(1, 0.85, 0.95); hair.position.set(0, 0.05, -0.05); hg.add(hair);
    const streak = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.2, 0.05)), mat(0xffb84d)); streak.position.set(0.14, 0.12, 0.2); hg.add(streak);
    const eg = geo(new THREE.SphereGeometry(0.03, 6, 4)), em = mat(0x1a1030);
    eyes = [-0.08, 0.08].map((x) => { const e = new THREE.Mesh(eg, em); e.position.set(x, 0.02, 0.22); hg.add(e); return e; });
    mouth = new THREE.Mesh(geo(new THREE.BoxGeometry(0.08, 0.02, 0.02)), mat(0xd94c7a)); mouth.position.set(0, -0.09, 0.22); hg.add(mouth);
  }

  let disposed = false;
  const mountedAt = performance.now();
  let state: TalkState = "idle", raf = 0, t0 = performance.now(), slow = 0, last = t0, blinkAt = t0 + 2500;
  const tick = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = (now - last) / 1000; last = now;
    slow = dt > 1 / 30 ? slow + dt : 0;
    // 4s grace after mount: VRM upload/compile can stall early frames.
    if (now - mountedAt < 4000) slow = 0;
    if (slow > 2) { cancelAnimationFrame(raf); if (!disposed) onDemote("low fps"); return; }
    const t = (now - t0) / 1000;
    root.position.y = Math.sin(t * 1.6) * 0.015; // idle breathe
    head.rotation.y = state === "listen" ? 0.18 : Math.sin(t * 0.5) * 0.08;
    head.rotation.x = state === "think" ? -0.15 : 0;
    const open = state === "speak" ? 0.3 + 0.7 * Math.abs(Math.sin(t * 14) * Math.sin(t * 5.3)) : 0; // proxy amplitude
    if (mouth) mouth.scale.y = 1 + open * 4;
    const blink = now > blinkAt ? 0.1 : 1; if (now > blinkAt + 120) blinkAt = now + 2500 + Math.random() * 2500;
    eyes.forEach((e) => (e.scale.y = blink));
    if (vrm) { vrm.expressionManager?.setValue("aa", open); vrm.expressionManager?.setValue("blink", 1 - blink); vrm.update(dt); }
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(tick);
  renderer.domElement.addEventListener("webglcontextlost", (ev) => {
    ev.preventDefault();
    if (disposed) return; // our own teardown, ignore
    onDemote("context lost");
  });

  return {
    setState(s) { state = s; },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      disposables.forEach((d) => d.dispose());
      renderer.dispose(); renderer.domElement.remove(); // no forceContextLoss: it breaks remounts
    },
  };
}
