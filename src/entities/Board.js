import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { isKeyDown, isSpaceJustPressed } from '../input/keyboard.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const ACCEL = 14;
const FRICTION = 0.99;
const MAX_SPEED = 10;
const TURN_SPEED = 8;
const MIN_SPEED_TO_TURN = 0.3;
const AIR_TURN_SPEED = 5;

const JUMP_DURATION = 0.6;
const MAX_JUMP_HEIGHT = 5;
const FIRST_JUMP_HEIGHT_RATIO = 0.5;
const HEIGHT_DECAY_PER_TAP = 0.6;
const HEIGHT_RECOVERY_RATE = 1.2;

const ROTATION_OFFSET = Math.PI;
const HEIGHT_SMOOTH_SPEED = 5;

const DROP_START_HEIGHT = 12;
const DROP_GRAVITY = 28;
const BOUNCE_RESTITUTION = 0;
const BOUNCE_MIN_VELOCITY = 8;
const BOUNCE_HORIZONTAL_IMPULSE = 1.2;
const BOUNCE_HEADING_JITTER = 0.08;

const SPIN_MULTIPLIER_MIN = 0.6;
const SPIN_MULTIPLIER_MAX = 2.2;

const LANDING_CORRECT_SPEED = 8;

const UPRIGHT_RECOVERY_SPEED = 1.5;

const UPSIDE_DOWN_FRICTION = 0.85;

function angleLerp(current, target, maxDelta) {
  let diff = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  if (diff > maxDelta) diff = maxDelta;
  if (diff < -maxDelta) diff = -maxDelta;
  return current + diff;
}

export class Board {
  constructor(scene, onUpsideDown, onJump, onMeshReady, onLand) {
    this.scene = scene;
    this.mesh = null;
    this.flipPivot = null;
    this.loaded = false;
    this.onUpsideDown = onUpsideDown;
    this.onJump = onJump;
    this.onMeshReady = onMeshReady;
    this.onLand = onLand;

    this.position = new THREE.Vector3(0, DROP_START_HEIGHT, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.dropVelocityY = 0;
    this.heading = 0;

    this.isAirborne = false;
    this.jumpProgress = 0;
    this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.flipRotation = 0;

    this.isUpsideDown = false;
    this.isDropping = true;

    this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO;

    this.spinMultiplier = 1;
    this.isCorrectingLanding = false;
    this.landingTarget = 0;

    this._load();
  }

  _load() {
    const loader = new GLTFLoader();
    loader.load(
      `${import.meta.env.BASE_URL}models/board.glb`,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);
        model.rotation.y = ROTATION_OFFSET;

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x888888,
              metalness: 1,
              roughness: 0.25,
            });
          }
        });

        this.flipPivot = new THREE.Group();
        this.flipPivot.add(model);

        this.mesh = new THREE.Group();
        this.mesh.add(this.flipPivot);

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        this.loaded = true;
        if (this.onMeshReady) this.onMeshReady(this.mesh);
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
    this.spinMultiplier = 1;
    this.isCorrectingLanding = false;
    this.landingTarget = 0;
    if (this.flipPivot) this.flipPivot.rotation.z = 0;
  }

  dropIn() {
    this.position.set(0, DROP_START_HEIGHT, 0);
    this.velocity.set(0, 0, 0);
    this.dropVelocityY = 0;
    this.heading = 0;
    this.isAirborne = false;
    this.jumpProgress = 0;
    this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
    this.flipRotation = 0;
    this.isUpsideDown = false;
    this.isDropping = true;
    this.spinMultiplier = 1;
    this.isCorrectingLanding = false;
    this.landingTarget = 0;
    if (this.flipPivot) this.flipPivot.rotation.z = 0;
  }

  update(dt) {
    if (!this.loaded) return;

    if (this.isDropping) {
      this.dropVelocityY -= DROP_GRAVITY * dt;
      this.position.y += this.dropVelocityY * dt;

      if (this.position.y <= 0) {
        this.position.y = 0;

        if (Math.abs(this.dropVelocityY) > BOUNCE_MIN_VELOCITY) {
          this.dropVelocityY = -this.dropVelocityY * BOUNCE_RESTITUTION;

          const randomAngle = Math.random() * Math.PI * 2;
          const impulse = (Math.random() * 0.6 + 0.4) * BOUNCE_HORIZONTAL_IMPULSE;
          this.velocity.x += Math.cos(randomAngle) * impulse;
          this.velocity.z += Math.sin(randomAngle) * impulse;

          this.heading += (Math.random() * 2 - 1) * BOUNCE_HEADING_JITTER;
        } else {
          this.dropVelocityY = 0;
          this.isDropping = false;
          if (this.onLand) this.onLand();
        }
      }

      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.velocity.x *= FRICTION;
      this.velocity.z *= FRICTION;

      this.mesh.position.copy(this.position);
      this.mesh.rotation.y = this.heading;
      this.flipPivot.rotation.z = this.flipRotation;
      return;
    }

    if (this.isCorrectingLanding) {
      this.flipRotation += (this.landingTarget - this.flipRotation) * Math.min(LANDING_CORRECT_SPEED * dt, 1);
      if (Math.abs(this.flipRotation - this.landingTarget) < 0.02) {
        this.flipRotation = this.landingTarget;
        this.isCorrectingLanding = false;
      }
    }

    if (!this.isUpsideDown) {
      let ix = 0,
        iz = 0;
      if (isKeyDown('ArrowUp')) iz -= 1;
      if (isKeyDown('ArrowDown')) iz += 1;
      if (isKeyDown('ArrowLeft')) ix -= 1;
      if (isKeyDown('ArrowRight')) ix += 1;

      const inputLen = Math.hypot(ix, iz);

      if (!this.isAirborne) {
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
      } else if (inputLen > 0) {
        ix /= inputLen;
        iz /= inputLen;

        const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (currentSpeed > 0.01) {
          const currentAngle = Math.atan2(this.velocity.x, this.velocity.z);
          const inputAngle = Math.atan2(ix, iz);
          const newAngle = angleLerp(currentAngle, inputAngle, AIR_TURN_SPEED * dt);
          this.velocity.x = Math.sin(newAngle) * currentSpeed;
          this.velocity.z = Math.cos(newAngle) * currentSpeed;
        }
      }
    } else {
      this.velocity.x *= UPSIDE_DOWN_FRICTION;
      this.velocity.z *= UPSIDE_DOWN_FRICTION;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.isUpsideDown && speed > MIN_SPEED_TO_TURN) {
      const targetHeading = Math.atan2(this.velocity.x, this.velocity.z);
      this.heading = angleLerp(this.heading, targetHeading, TURN_SPEED * dt);
    }

    if (isSpaceJustPressed()) {
      if (!this.isAirborne) {
        this.isAirborne = true;
        this.jumpProgress = 0;
        this.jumpHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
        this.displayHeightFactor = FIRST_JUMP_HEIGHT_RATIO;
        this.spinMultiplier = SPIN_MULTIPLIER_MIN + Math.random() * (SPIN_MULTIPLIER_MAX - SPIN_MULTIPLIER_MIN);
        if (this.isUpsideDown) {
          this.isUpsideDown = false;
          this.isCorrectingLanding = false;
        }
        if (this.onJump) this.onJump();
      } else if (!this.isUpsideDown) {
        this.jumpHeightFactor *= 1 - HEIGHT_DECAY_PER_TAP;
      }
    }

    if (!this.isAirborne) {
      this.jumpHeightFactor = Math.min(
        FIRST_JUMP_HEIGHT_RATIO,
        this.jumpHeightFactor + HEIGHT_RECOVERY_RATE * dt
      );
    }

    if (this.isAirborne) {
      this.jumpProgress += dt / JUMP_DURATION;
      const jt = Math.min(this.jumpProgress, 1);

      this.displayHeightFactor +=
        (this.jumpHeightFactor - this.displayHeightFactor) *
        Math.min(HEIGHT_SMOOTH_SPEED * dt, 1);

      const actualHeight = MAX_JUMP_HEIGHT * Math.max(this.displayHeightFactor, 0.02);
      this.position.y = Math.sin(jt * Math.PI) * actualHeight;

      this.flipRotation = jt * Math.PI * 2 * this.spinMultiplier;

      if (this.jumpProgress >= 1) {
        this.position.y = 0;
        this.isAirborne = false;
        this.jumpProgress = 0;

        let normalizedSpin = this.flipRotation % (Math.PI * 2);
        if (normalizedSpin < 0) normalizedSpin += Math.PI * 2;

        const isBottomHalf = normalizedSpin < Math.PI / 2 || normalizedSpin > Math.PI * 1.5;

        if (isBottomHalf) {
          this.landingTarget = normalizedSpin > Math.PI ? Math.PI * 2 : 0;
          this.isCorrectingLanding = true;
          this.isUpsideDown = false;
        } else {
          this.landingTarget = Math.PI;
          this.flipRotation = normalizedSpin;
          this.isCorrectingLanding = true;
          this.isUpsideDown = true;
          if (this.onUpsideDown) this.onUpsideDown();
        }
      }
    } else {
      this.position.y = 0;
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.flipPivot.rotation.z = this.flipRotation;
  }
}