import * as THREE from 'three';

const FONT_SIZE_PX = 64; // 캔버스에 그릴 때 폰트 크기 (해상도용, 클수록 선명)
const PADDING_PX = 12;

function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  ctx.font = `${FONT_SIZE_PX}px sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = FONT_SIZE_PX * 1.2;

  canvas.width = textWidth + PADDING_PX * 2;
  canvas.height = textHeight + PADDING_PX * 2;

  // 캔버스 리사이즈하면 font 설정이 초기화되므로 다시 설정
  ctx.font = `${FONT_SIZE_PX}px sans-serif`;
  ctx.fillStyle = '#5fa8e0';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return { texture, width: canvas.width, height: canvas.height };
}

export class Word {
  constructor(text, worldUnitsPerPixel = 0.02) {
    this.text = text;

    const { texture, width, height } = createTextTexture(text);

    const planeWidth = width * worldUnitsPerPixel;
    const planeHeight = height * worldUnitsPerPixel;

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);

    // 바닥에 눕히기: 기본 Plane은 XY 평면에 서 있으므로 X축 기준 -90도 회전해서 XZ 평면(바닥)에 눕힘
    this.mesh.rotation.x = -Math.PI / 2;

    this.width = planeWidth;
    this.height = planeHeight;

    // 물리 상태 (다음 단계에서 충돌에 사용)
    this.position = new THREE.Vector3(0, 0.01, 0); // 바닥보다 살짝 띄움 (z-fighting 방지)
    this.basePosition = new THREE.Vector3(0, 0.01, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
  }

  update(dt) {
    this.mesh.position.copy(this.position);
  }
}