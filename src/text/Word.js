import * as THREE from 'three';

const FONT_SIZE_PX = 32;
const PADDING_PX = 2;
const FONT_FAMILY = '"Orbitron", sans-serif';

function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = `${FONT_SIZE_PX}px ${FONT_FAMILY}`;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = FONT_SIZE_PX * 1.2;

  canvas.width = textWidth + PADDING_PX * 2;
  canvas.height = textHeight + PADDING_PX * 2;

  ctx.font = `${FONT_SIZE_PX}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { texture, width: canvas.width, height: canvas.height };
}

const IDLE_COLOR = new THREE.Color('#39FF14');
const HIT_COLOR = new THREE.Color('#1f8c0b');
const DAMPING = 0.985;
const FREE_FLIGHT_DURATION = 0.35;
const PULL_STRENGTH = 0.15;

export class Word {
  constructor(text, worldUnitsPerPixel = 0.02) {
    this.text = text;
    this.worldUnitsPerPixel = worldUnitsPerPixel;

    const { texture, width, height } = createTextTexture(text);

    const planeWidth = width * worldUnitsPerPixel;
    const planeHeight = height * worldUnitsPerPixel;

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: IDLE_COLOR.clone(),
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;

    this.width = planeWidth;
    this.height = planeHeight;

    this.position = new THREE.Vector3(0, 0.01, 0);
    this.basePosition = new THREE.Vector3(0, 0.01, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.isHit = false;
    this.freeFlightTimer = 0;
  }

  registerHit() {
    this.freeFlightTimer = FREE_FLIGHT_DURATION;
  }

  update(dt) {
    if (this.freeFlightTimer > 0) {
      this.freeFlightTimer -= dt;
    } else {
      this.velocity.x *= DAMPING;
      this.velocity.z *= DAMPING;

      this.velocity.x += (this.basePosition.x - this.position.x) * PULL_STRENGTH * dt;
      this.velocity.z += (this.basePosition.z - this.position.z) * PULL_STRENGTH * dt;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    this.mesh.position.copy(this.position);

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = speed > 0.05;

    if (moving !== this.isHit) {
      this.isHit = moving;
      this.mesh.material.color.copy(moving ? HIT_COLOR : IDLE_COLOR);
    }
  }
}