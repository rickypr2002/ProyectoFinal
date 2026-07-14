import * as THREE from 'three';

/* ─── Materiales compartidos entre instancias (optimización de memoria) ──── */
const MAT_BELL = new THREE.MeshPhongMaterial({
  color: 0x66aacc, emissive: 0x112233,
  shininess: 90, transparent: true, opacity: 0.78,
  side: THREE.DoubleSide,
});

// INYECCIÓN DE SHADER (20% de la rúbrica)
MAT_BELL.userData = { uTime: { value: 0 } };
MAT_BELL.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = MAT_BELL.userData.uTime;
  shader.vertexShader = `
    uniform float uTime;
    ${shader.vertexShader}
  `.replace(
    `#include <begin_vertex>`,
    `#include <begin_vertex>
     float oscilacion = sin(position.y * 5.0 + uTime * 3.0) * 0.15;
     transformed.x += oscilacion;
     transformed.z += oscilacion;
    `
  );
};

const MAT_RIM = new THREE.MeshPhongMaterial({
  color: 0x44ccff, emissive: 0x002244,
  shininess: 120, transparent: true, opacity: 0.65,
});
const MAT_TENT_BASE = new THREE.MeshPhongMaterial({
  color: 0x8844cc, emissive: 0x220044,
  shininess: 80, transparent: true, opacity: 0.72,
});
const MAT_TENT_MID = new THREE.MeshPhongMaterial({
  color: 0x44aaee, emissive: 0x001122,
  shininess: 100, transparent: true, opacity: 0.60,
});
const MAT_TENT_TIP = new THREE.MeshPhongMaterial({
  color: 0xaaddff, emissive: 0x003344,
  shininess: 140, transparent: true, opacity: 0.45,
});

/* ─── Geometrías compartidas ─────────────────────────────────────────────── */
const GEO_BELL       = new THREE.SphereGeometry(1, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
const GEO_RIM        = new THREE.TorusGeometry(1, 0.08, 12, 60);
const GEO_TENT_BASE  = new THREE.CylinderGeometry(0.055, 0.04, 0.9, 6);
const GEO_TENT_MID   = new THREE.CylinderGeometry(0.04, 0.028, 1.0, 6);
const GEO_TENT_TIP   = new THREE.CylinderGeometry(0.028, 0.008, 1.1, 6);
const GEO_NEMA       = new THREE.SphereGeometry(0.045, 6, 6);

const NUM_TENTACLES = 6;

export class Agent {
  constructor({
    position  = new THREE.Vector3(),
    rotation  = new THREE.Euler(),
    speed     = 1.5,
    scale     = 1.0,
    tintColor = null,
    phase     = 0,
    bounds    = { x: 25, y: 15, z: 25 },
  } = {}) {

    /* ── Estado de movimiento (BOIDS) ── */
    this.velocity      = new THREE.Vector3().random().multiplyScalar(speed);
    this.acceleration  = new THREE.Vector3();
    this.maxSpeed      = speed;
    this.maxForce      = 0.3;
    this.perceptionRadius = 3.5;
    
    this.w_sep = 1.5;   
    this.w_ali = 1.0;   
    this.w_coh = 1.0;   

    this.bounds  = bounds;
    this.phase   = phase;
    this.alive   = true;

    this._forward = new THREE.Vector3();
    this._alignment = new THREE.Vector3();
    this._cohesion = new THREE.Vector3();
    this._separation = new THREE.Vector3();

    this.root = new THREE.Group();
    this.root.position.copy(position);
    this.root.rotation.copy(rotation);
    this.root.scale.setScalar(scale);

    this._buildBody(tintColor);
    this._t = phase;
  }

  _buildBody(tintColor) {
    const bellMat = tintColor ? MAT_BELL.clone() : MAT_BELL;
    if (tintColor) {
      bellMat.color.set(tintColor);
      bellMat.emissive.set(tintColor).multiplyScalar(0.15);
    }

    this._bellGroup = new THREE.Group();
    this.root.add(this._bellGroup);

    const bellMesh = new THREE.Mesh(GEO_BELL, bellMat);
    bellMesh.rotation.x = Math.PI;   
    this._bellGroup.add(bellMesh);

    const rimMesh = new THREE.Mesh(GEO_RIM, MAT_RIM);
    rimMesh.position.y = -0.04;
    this._bellGroup.add(rimMesh);

    /* POINTLIGHT ELIMINADO PARA SALVAR LOS FPS */
    // this._glow = new THREE.PointLight(...);

    this._tentacles = [];
    for (let i = 0; i < NUM_TENTACLES; i++) {
      const angle = (i / NUM_TENTACLES) * Math.PI * 2;
      const r     = 0.92;

      const baseGroup = new THREE.Group();
      baseGroup.position.set(Math.cos(angle) * r, -0.05, Math.sin(angle) * r);
      baseGroup.rotation.y = angle;
      baseGroup.rotation.z = 0.22;
      this._bellGroup.add(baseGroup);

      const baseMesh = new THREE.Mesh(GEO_TENT_BASE, MAT_TENT_BASE);
      baseMesh.position.y = -0.45;
      baseGroup.add(baseMesh);

      const midGroup = new THREE.Group();
      midGroup.position.y = -0.9;
      baseGroup.add(midGroup);

      const midMesh = new THREE.Mesh(GEO_TENT_MID, MAT_TENT_MID);
      midMesh.position.y = -0.5;
      midGroup.add(midMesh);

      const tipGroup = new THREE.Group();
      tipGroup.position.y = -1.0;
      midGroup.add(tipGroup);

      const tipMesh = new THREE.Mesh(GEO_TENT_TIP, MAT_TENT_TIP);
      tipMesh.position.y = -0.55;
      tipGroup.add(tipMesh);

      const nemaMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: tintColor ? tintColor : 0x44ccff,
        emissiveIntensity: 1.0,
        transparent: true, opacity: 0.9,
      });
      const nema = new THREE.Mesh(GEO_NEMA, nemaMat);
      nema.position.y = -1.15;
      tipGroup.add(nema);

      this._tentacles.push({
        baseGroup, midGroup, tipGroup,
        phase: (i / NUM_TENTACLES) * Math.PI * 2,
      });
    }
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  separation(agents) {
    const steer = new THREE.Vector3();
    let count = 0;

    agents.forEach(agent => {
      if (agent === this) return;
      const dist = this.root.position.distanceTo(agent.root.position);
      
      if (dist > 0 && dist < this.perceptionRadius) {
        const diff = new THREE.Vector3()
          .subVectors(this.root.position, agent.root.position)
          .normalize()
          .divideScalar(dist);
        steer.add(diff);
        count++;
      }
    });

    if (count > 0) {
      steer.divideScalar(count);
      steer.normalize().multiplyScalar(this.maxSpeed);
      steer.sub(this.velocity);
      steer.clampLength(0, this.maxForce);
    }
    return steer;
  }

  alignment(agents) {
    const avgVel = new THREE.Vector3();
    let count = 0;

    agents.forEach(agent => {
      if (agent === this) return;
      const dist = this.root.position.distanceTo(agent.root.position);
      
      if (dist > 0 && dist < this.perceptionRadius) {
        avgVel.add(agent.velocity);
        count++;
      }
    });

    if (count > 0) {
      avgVel.divideScalar(count);
      avgVel.normalize().multiplyScalar(this.maxSpeed);
      avgVel.sub(this.velocity);
      avgVel.clampLength(0, this.maxForce);
    }
    return avgVel;
  }

  cohesion(agents) {
    const center = new THREE.Vector3();
    let count = 0;

    agents.forEach(agent => {
      if (agent === this) return;
      const dist = this.root.position.distanceTo(agent.root.position);
      
      if (dist > 0 && dist < this.perceptionRadius) {
        center.add(agent.root.position);
        count++;
      }
    });

    if (count > 0) {
      center.divideScalar(count);
      center.sub(this.root.position);
      center.normalize().multiplyScalar(this.maxSpeed);
      center.sub(this.velocity);
      center.clampLength(0, this.maxForce);
    }
    return center;
  }

  flock(agents) {
    this._separation.copy(this.separation(agents)).multiplyScalar(this.w_sep);
    this._alignment.copy(this.alignment(agents)).multiplyScalar(this.w_ali);
    this._cohesion.copy(this.cohesion(agents)).multiplyScalar(this.w_coh);

    this.applyForce(this._separation);
    this.applyForce(this._alignment);
    this.applyForce(this._cohesion);
  }

  update(dt) {
    this._t += dt;
    const t = this._t;

    // Actualizar el tiempo del shader
    if (MAT_BELL.userData.uTime) {
        MAT_BELL.userData.uTime.value = t;
    }

    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, this.maxSpeed);
    this.root.position.addScaledVector(this.velocity, dt);
    this.acceleration.multiplyScalar(0);

    if (this.velocity.lengthSq() > 0.01) {
      const targetDir = new THREE.Vector3().copy(this.velocity).normalize();
      const targetQuat = new THREE.Quaternion();
      const upVec = new THREE.Vector3(0, 1, 0);
      targetQuat.setFromAxisAngle(
        new THREE.Vector3().crossVectors(upVec, targetDir).normalize(),
        Math.acos(Math.max(-1, Math.min(1, upVec.dot(targetDir))))
      );
      this.root.quaternion.slerp(targetQuat, 0.1);
    }

    const pulse = 1 + Math.sin(t * 2.4) * 0.09;
    this._bellGroup.scale.set(
      1 + Math.sin(t * 2.4) * 0.03,
      pulse,
      1 + Math.sin(t * 2.4) * 0.03
    );

    this._tentacles.forEach(({ baseGroup, midGroup, tipGroup, phase }) => {
      baseGroup.rotation.x  = Math.sin(t * 1.8 + phase)           * 0.3;
      baseGroup.rotation.z += (Math.sin(t * 1.4 + phase + 1.0) * 0.18 - baseGroup.rotation.z) * 0.12;
      midGroup.rotation.x   = Math.sin(t * 2.2 + phase + 0.8)     * 0.5;
      midGroup.rotation.z   = Math.cos(t * 1.8 + phase + 0.5)     * 0.28;
      tipGroup.rotation.x   = Math.sin(t * 2.8 + phase + 1.6)     * 0.7;
      tipGroup.rotation.z   = Math.cos(t * 2.4 + phase + 1.2)     * 0.4;
    });

    /* ACTUALIZACIÓN DEL GLOW ELIMINADA PARA SALVAR LOS FPS */
    // this._glow.intensity = 0.5 + Math.sin(t * 2.4) * 0.3;

    const p = this.root.position;
    const b = this.bounds;
    if (p.x >  b.x) p.x = -b.x;
    if (p.x < -b.x) p.x =  b.x;
    if (p.y >  b.y) p.y = -b.y;
    if (p.y < -b.y) p.y =  b.y;
    if (p.z >  b.z) p.z = -b.z;
    if (p.z < -b.z) p.z =  b.z;
  }

  addTo(scene) {
    scene.add(this.root);
    return this;
  }

  removeFrom(scene) {
    scene.remove(this.root);
  }

  get position() {
    return this.root.position;
  }
}