import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isKeyDown, isSpaceJustPressed } from '../input/keyboard.js';

const ACCEL = 14;
const FRICTION = 0.99;
const MAX_SPEED = 10;
const TURN_SPEED = 8;
const MIN_SPEED_TO_TURN = 0.3;

const JUMP_DURATION = 1;
const MAX_JUMP_HEIGHT = 4;
const FIRST_JUMP_HEIGHT_RATIO = 0.5;
const HEIGHT_DECAY_PER_TAP = 0.6;
const HEIGHT_RECOVERY_RATE = 1.2;

const ROTATION_OFFSET = 0;
const HEIGHT_SMOOTH_SPEED = 5;

function angleLerp(current, target, maxDelta) {
  let diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (diff > maxDelta) diff = maxDelta;
  if (diff < -maxDelta) diff = -maxDelta;
  return current + diff;
}

export class Board {
  constructor(scene, onUpsideDown) {
    this.scene = scene;
    this.mesh = null;
    this.flipPivot = null;
    this.loaded = false;
    this.onUpsideDown = onUpsideDown;

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.heading = 0;

    this.isAirborne = false;
    this.jumpProgress = 0;
    this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.flipRotation = 0;

    this.isUpsideDown = false;

    this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO;

    this._load();

    
  }

  _load() {
    const loader = new GLTFLoader();
    loader.load(
      '/models/board.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.rotation.y = ROTATION_OFFSET;

        this.flipPivot = new THREE.Group();
        this.flipPivot.add(model);

        this.mesh = new THREE.Group();
        this.mesh.add(this.flipPivot);

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        this.loaded = true;
      },
      undefined,
      (error) => console.error('Failed to load board.glb:', error)
    );
  }

  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.heading = 0;
    this.isAirborne = false;
    this.jumpProgress = 0;
    this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.flipRotation = 0;
    this.isUpsideDown = false;
    if (this.flipPivot) this.flipPivot.rotation.z = 0;
  }

  update(dt) {
    if (!this.loaded) return;

    // --- 1. 입력 -> 가속도 (뒤집힌 상태여도 계속 조작 가능) ---
    let ix = 0,
      iz = 0;
    if (isKeyDown('ArrowUp')) iz -= 1;
    if (isKeyDown('ArrowDown')) iz += 1;
    if (isKeyDown('ArrowLeft')) ix -= 1;
    if (isKeyDown('ArrowRight')) ix += 1;

    const inputLen = Math.hypot(ix, iz);
    if (inputLen > 0) {
      ix /= inputLen;
      iz /= inputLen;
      this.velocity.x += ix * ACCEL * dt;
      this.velocity.z += iz * ACCEL * dt;
    }

    this.velocity.x *= FRICTION;
    this.velocity.z *= FRICTION;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > MAX_SPEED) {
      this.velocity.x = (this.velocity.x / speed) * MAX_SPEED;
      this.velocity.z = (this.velocity.z / speed) * MAX_SPEED;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // --- 2. heading: 속도 벡터를 목표로 점진적 회전 ---
    if (speed > MIN_SPEED_TO_TURN) {
      const targetHeading = Math.atan2(this.velocity.x, this.velocity.z);
      this.heading = angleLerp(this.heading, targetHeading, TURN_SPEED * dt);
    }

    // --- 3. 스페이스바: 새 점프 시작 또는 점프 높이 감쇠 ---
    if (isSpaceJustPressed()) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.jumpProgress = 0;
        this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
        this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO; // 추가
      } else {
        this.jumpHeightFactor *= 1 - HEIGHT_DECAY_PER_TAP;
      }
    }

    if (!this.isAirborne) {
      this.jumpHeightFactor = Math.min(
        FIRST_JUMP_HEIGHT_RATIO,
        this.jumpHeightFactor + HEIGHT_RECOVERY_RATE * dt
      );
    }

    // --- 4. 공중 상태 진행 ---
    if (this.isAirborne) {
        this.jumpProgress += dt / JUMP_DURATION;
        const jt = Math.min(this.jumpProgress, 1);

        // displayHeightFactor가 jumpHeightFactor(목표)를 향해 부드럽게 따라감
        this.displayHeightFactor +=
            (this.jumpHeightFactor - this.displayHeightFactor) *
            Math.min(HEIGHT_SMOOTH_SPEED * dt, 1);

        const actualHeight = MAX_JUMP_HEIGHT * Math.max(this.displayHeightFactor, 0.02);
        this.position.y = Math.sin(jt * Math.PI) * actualHeight;

        this.flipRotation = jt * Math.PI * 2;

        if (this.jumpProgress >= 1) {
            this.position.y = 0;
            this.isAirborne = false;
            this.jumpProgress = 0;

            const normalizedSpin = this.flipRotation % (Math.PI * 2);
            const isCleanLanding =
            normalizedSpin < 0.15 || normalizedSpin > Math.PI * 2 - 0.15;

            if (isCleanLanding) {
            this.flipRotation = 0;
            this.isUpsideDown = false;
            } else {
            this.isUpsideDown = true;
            if (this.onUpsideDown) this.onUpsideDown();
            }
        }
        } else {
        this.position.y = 0;
        }

    // --- 5. 반영 ---
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.flipPivot.rotation.z = this.flipRotation;
  }
}