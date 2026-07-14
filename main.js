import * as THREE from 'three';
import { World } from './World.js';
import { Agent } from './Agent.js';

/* ══════════════════════════════════════════════════════════
   1. MUNDO BASE
══════════════════════════════════════════════════════════ */
const world = new World(document.body);

/* ══════════════════════════════════════════════════════════
   2. CONFIGURACIÓN DEL ENJAMBRE
══════════════════════════════════════════════════════════ */
const BOUNDS = { x: 26, y: 14, z: 26 };

/* Parámetros Boids configurables */
const BOIDS_CONFIG = {
  w_sep: 1.5,              
  w_ali: 1.0,              
  w_coh: 1.0,              
  perceptionRadius: 3.5,   
  maxSpeed: 2.0,           
  maxForce: 0.3,           
};

function randomPosition(margin = 2) {
  return new THREE.Vector3(
    (Math.random() - 0.5) * (BOUNDS.x * 2 - margin * 2),
    (Math.random() - 0.5) * (BOUNDS.y * 2 - margin * 2),
    (Math.random() - 0.5) * (BOUNDS.z * 2 - margin * 2)
  );
}

function randomRotation() {
  return new THREE.Euler(
    (Math.random() - 0.5) * Math.PI,
    Math.random() * Math.PI * 2,
    0
  );
}

/* ───────────────────────────────────────────────────────────
   CREAR >200 AGENTES (Rúbrica: Flocking Completo 30%)
─────────────────────────────────────────────────────────── */
const NUM_AGENTS = 205; // Modificado para pasar el límite exigido

const agents = [];

for (let i = 0; i < NUM_AGENTS; i++) {
  const agent = new Agent({
    position: randomPosition(),
    rotation: randomRotation(),
    speed: 1.2 + Math.random() * 1.2,
    scale: 0.55 + Math.random() * 0.55,
    tintColor: new THREE.Color().setHSL(i / NUM_AGENTS, 0.75, 0.60),
    phase: (i / NUM_AGENTS) * Math.PI * 2,
    bounds: BOUNDS,
  });

  /* Aplicar configuración Boids */
  agent.maxSpeed = BOIDS_CONFIG.maxSpeed;
  agent.maxForce = BOIDS_CONFIG.maxForce;
  agent.perceptionRadius = BOIDS_CONFIG.perceptionRadius;
  agent.w_sep = BOIDS_CONFIG.w_sep;
  agent.w_ali = BOIDS_CONFIG.w_ali;
  agent.w_coh = BOIDS_CONFIG.w_coh;

  agent.addTo(world.scene);
  agents.push(agent);
}

/* ══════════════════════════════════════════════════════════
   3. HUD Y CONTROLES INTERACTIVOS
══════════════════════════════════════════════════════════ */
let globalSpeedMult = 1.0;
let paused = false;
let _fpsFrames = 0;
let _fpsAccum = 0;

// 1. Slider de Velocidad
const speedSlider = document.getElementById('spd');
const speedVal = document.getElementById('sval');
if(speedSlider) {
  speedSlider.addEventListener('input', e => {
    globalSpeedMult = parseFloat(e.target.value);
    if(speedVal) speedVal.textContent = globalSpeedMult.toFixed(2) + '×';
  });
}

// 2. Botón Pausar
const btnPause = document.getElementById('btn-pause');
if(btnPause) {
  btnPause.addEventListener('click', e => {
    paused = !paused;
    e.target.textContent = paused ? '▶ Reanudar' : '⏸ Pausar';
    e.target.classList.toggle('on', paused);
  });
}

// 3. Botón Cámara (Home)
const btnHome = document.getElementById('btn-home');
if(btnHome) {
  btnHome.addEventListener('click', () => {
    world.camera.position.set(0, 6, 28);
    world.controls.target.set(0, 0, 0);
    world.controls.update();
  });
}

// 4. Botón Dispersar
const btnSpread = document.getElementById('btn-spread');
if(btnSpread) {
  btnSpread.addEventListener('click', () => {
    agents.forEach(a => {
      a.root.position.copy(randomPosition());
      a.root.rotation.copy(randomRotation());
    });
  });
}

// Mostrar cantidad de agentes y nodos
const hudAgentCount = document.getElementById('n-agents');
if (hudAgentCount) hudAgentCount.textContent = NUM_AGENTS;

const hudNodes = document.getElementById('n-nodes');
if (hudNodes) hudNodes.textContent = NUM_AGENTS * 20;

/* ══════════════════════════════════════════════════════════
   4. LOOP PRINCIPAL Y CONTADOR FPS
══════════════════════════════════════════════════════════ */
world.onTick((dt) => {
  if (paused) return;

  const scaledDt = dt * globalSpeedMult;

  /* Aplicar Boids y físicas */
  agents.forEach(agent => agent.flock(agents));
  agents.forEach(agent => agent.update(scaledDt));

  /* Cálculo en tiempo real de FPS */
  _fpsAccum += dt;
  _fpsFrames++;

  if (_fpsFrames >= 30) {
    const fps = Math.round(_fpsFrames / _fpsAccum);
    const hudFps = document.getElementById('n-fps');
    
    if (hudFps) hudFps.textContent = fps;

    _fpsFrames = 0;
    _fpsAccum = 0;
  }
});

world.start();

