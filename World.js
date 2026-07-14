/**
 * World.js  —  T3 · Swarm Project
 * ─────────────────────────────────────────────────────────────
 * Configura el entorno base derivado de T1:
 *   • Renderer con shadowMap
 *   • PerspectiveCamera con FOV / clipping planes correctos
 *   • HemisphereLight + DirectionalLight (sombras)
 *   • OrbitControls con update() en loop
 *   • Resize handler
 *   • Fondo abismal + partículas + neblina volumétrica
 * ─────────────────────────────────────────────────────────────
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class World {
  /**
   * @param {HTMLElement} container  Elemento donde se monta el canvas
   */
  constructor(container = document.body) {
    this.container = container;
    this._callbacks = [];   // funciones a ejecutar en el loop

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initControls();
    this._initLights();
    this._initEnvironment();
    this._initResize();
  }

  /* ─────────────────────────────────────────────────────────
     RENDERER
  ───────────────────────────────────────────────────────── */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  /* ─────────────────────────────────────────────────────────
     SCENE
  ───────────────────────────────────────────────────────── */
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x010814);
    this.scene.fog = new THREE.FogExp2(0x010814, 0.028);
  }

  /* ─────────────────────────────────────────────────────────
     CAMERA  (requisito T1)
     FOV, aspect ratio, near/far clipping planes correctos
  ───────────────────────────────────────────────────────── */
  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      52,                                       // FOV
      window.innerWidth / window.innerHeight,   // aspect ratio dinámico
      0.1,                                      // near clipping plane
      300                                       // far clipping plane
    );
    this.camera.position.set(0, 8, 32);
  }

  /* ─────────────────────────────────────────────────────────
     ORBIT CONTROLS  (requisito T1)
  ───────────────────────────────────────────────────────── */
  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping  = true;
    this.controls.dampingFactor  = 0.06;
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance    = 5;
    this.controls.maxDistance    = 120;
    // controls.update() se llama en el loop (ver start())
  }

  /* ─────────────────────────────────────────────────────────
     LUCES  (requisito T1)
     HemisphereLight + DirectionalLight con sombras
  ───────────────────────────────────────────────────────── */
  _initLights() {
    /* Hemisférica — simula "cielo abismal" azul + suelo oscuro */
    this.hemi = new THREE.HemisphereLight(0x0a1a3a, 0x050a0f, 0.7);
    this.scene.add(this.hemi);

    /* Direccional principal — proyecta sombras */
    this.sun = new THREE.DirectionalLight(0x88ccff, 1.6);
    this.sun.position.set(10, 20, 10);
    this.sun.castShadow                = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near        = 0.5;
    this.sun.shadow.camera.far         = 80;
    this.sun.shadow.camera.left        = -30;
    this.sun.shadow.camera.right       =  30;
    this.sun.shadow.camera.top         =  30;
    this.sun.shadow.camera.bottom      = -30;
    this.sun.shadow.bias               = -0.001;
    this.scene.add(this.sun);

    /* Relleno lateral */
    const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
    fill.position.set(-8, 5, -10);
    this.scene.add(fill);

    /* Luz de fondo (rim) azul profundo */
    const rim = new THREE.DirectionalLight(0x002255, 0.6);
    rim.position.set(0, -5, -15);
    this.scene.add(rim);
  }

  /* ─────────────────────────────────────────────────────────
     ENTORNO
     Suelo + partículas + objetos decorativos del abismo
  ───────────────────────────────────────────────────────── */
  _initEnvironment() {
    /* ── Plano de suelo marino ── */
    const floorTex = this._makeProceduralTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.95,
      metalness: 0.05,
      color: 0x0a1420,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120, 24, 24), floorMat);
    floor.rotation.x    = -Math.PI / 2;
    floor.position.y    = -16;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /* ── Cúpula de fondo (cielo invertido abismal) ── */
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x010510,
      side: THREE.BackSide,
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 16, 16), domeMat));

    /* ── Partículas de agua / bioluminiscencia ambiental ── */
    const COUNT = 1200;
    const pos   = new Float32Array(COUNT * 3);
    const col   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      // Color entre azul tenue y cian
      const mix    = Math.random();
      col[i * 3]   = 0.05 + mix * 0.1;
      col[i * 3 + 1] = 0.2 + mix * 0.3;
      col[i * 3 + 2] = 0.4 + mix * 0.5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this.particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    }));
    this.scene.add(this.particles);

    /* ── Rocas decorativas (geometrías del T1 reutilizadas) ── */
    this._addRocks();

    /* ── Columnas de luz volumétrica (decorativo) ── */
    this._addLightShafts();
  }

  _makeProceduralTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a1420';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(20,50,80,${Math.random() * 0.4})`;
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  _addRocks() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x0d1a24, roughness: 0.95, metalness: 0.0 });
    const positions = [
      [-12, -16, -8], [10, -16, -12], [-5, -16, 10],
      [18, -16, 5],   [-18, -16, 3],  [0, -16, -15],
    ];
    positions.forEach(([x, y, z], i) => {
      const s = 0.8 + Math.random() * 1.4;
      const geo = i % 2 === 0
        ? new THREE.DodecahedronGeometry(s, 0)
        : new THREE.OctahedronGeometry(s, 0);
      const mesh = new THREE.Mesh(geo, rockMat);
      mesh.position.set(x, y + s * 0.5, z);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      mesh.receiveShadow = true;
      mesh.castShadow    = true;
      this.scene.add(mesh);
    });
  }

  _addLightShafts() {
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      const mat = new THREE.MeshBasicMaterial({
        color: 0x113355,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(3, 0.5, 30, 6, 1, true), mat);
      cone.position.set(x, 8, z);
      this.scene.add(cone);
    }
  }

  /* ─────────────────────────────────────────────────────────
     RESIZE  (requisito T1)
  ───────────────────────────────────────────────────────── */
  _initResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  /* ─────────────────────────────────────────────────────────
     LOOP
  ───────────────────────────────────────────────────────── */
  /** Registrar callback a llamar en cada frame */
  onTick(fn) {
    this._callbacks.push(fn);
  }

  /** Arrancar el render loop con requestAnimationFrame */
  start() {
    const clock = new THREE.Clock();
    const loop  = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05); // cap a 50 ms (evita saltos)
      const t  = clock.getElapsedTime();

      /* Animar partículas de agua (drift suave) */
      this.particles.rotation.y = t * 0.006;

      /* Parpadeo de la luz hemisférica (corrientes de luz) */
      this.hemi.intensity = 0.65 + Math.sin(t * 0.2) * 0.08;

      /* Ejecutar todos los callbacks registrados */
      this._callbacks.forEach(fn => fn(dt, t));

      /* OrbitControls.update() — OBLIGATORIO con damping */
      this.controls.update();

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}
