import * as THREE from 'three';

const ROLL_MIN_SPEED = 0.5;
const ROLL_MAX_SPEED = 8;

const AUDIO_REF_DISTANCE = 6;
const AUDIO_ROLLOFF_FACTOR = 1;
const AUDIO_MAX_DISTANCE = 50;

export class BoardAudio {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.rollSound = null;
    this.rollAttached = false;
    this.rollLoaded = false;
    this.rollBuffer = null;
    this.rollBaseVolume = 0;

    this.jumpBuffers = [];
    this.jumpSounds = [];
    this.jumpAttached = false;

    this.landBuffers = [];
    this.landSounds = [];
    this.landAttached = false;

    const loader = new THREE.AudioLoader();

    loader.load(
      '/sounds/roll.mp3',
      (buffer) => {
        this.rollBuffer = buffer;
        this.rollLoaded = true;
        this._tryStartRoll();
      },
      undefined,
      (error) => console.error('roll.mp3 load FAILED:', error)
    );

    const jumpFiles = ['/sounds/jump1.mp3', '/sounds/jump2.mp3'];
    jumpFiles.forEach((path, i) => {
      loader.load(
        path,
        (buffer) => {
          this.jumpBuffers[i] = buffer;
        },
        undefined,
        (error) => console.error(`${path} load FAILED:`, error)
      );
    });

    const landFiles = ['/sounds/land1.mp3', '/sounds/land2.mp3', '/sounds/land3.mp3'];
    landFiles.forEach((path, i) => {
      loader.load(
        path,
        (buffer) => {
          this.landBuffers[i] = buffer;
        },
        undefined,
        (error) => console.error(`${path} load FAILED:`, error)
      );
    });
  }

  attachToBoard(boardMesh) {
    if (this.rollAttached) return;

    this.rollSound = new THREE.PositionalAudio(this.listener);
    this.rollSound.setRefDistance(6);
    this.rollSound.setRolloffFactor(1.5);
    this.rollSound.setMaxDistance(30);
    this.rollSound.setDistanceModel('inverse');
    boardMesh.add(this.rollSound);
    this.rollAttached = true;
    this._tryStartRoll();

    for (let i = 0; i < 2; i++) {
      const sound = new THREE.PositionalAudio(this.listener);
      sound.setRefDistance(6);
      sound.setRolloffFactor(1.5);
      sound.setMaxDistance(30);
      sound.setDistanceModel('inverse');
      boardMesh.add(sound);
      this.jumpSounds.push(sound);
    }
    this.jumpAttached = true;

    for (let i = 0; i < 3; i++) {
      const sound = new THREE.PositionalAudio(this.listener);
      sound.setRefDistance(AUDIO_REF_DISTANCE);
      sound.setRolloffFactor(AUDIO_ROLLOFF_FACTOR);
      sound.setMaxDistance(AUDIO_MAX_DISTANCE);
      sound.setDistanceModel('inverse');
      boardMesh.add(sound);
      this.landSounds.push(sound);
    }
    this.landAttached = true;
  }

  _tryStartRoll() {
    if (!this.rollAttached || !this.rollLoaded) return;
    if (this.rollSound.isPlaying) return;

    this.rollSound.setBuffer(this.rollBuffer);
    this.rollSound.setLoop(true);
    this.rollSound.setVolume(0);
    this.rollSound.play();
  }

  playJump() {
    if (!this.jumpAttached) return;

    const readyIndices = this.jumpBuffers
      .map((buf, i) => (buf ? i : -1))
      .filter((i) => i >= 0);
    if (readyIndices.length === 0) return;

    const pick = readyIndices[Math.floor(Math.random() * readyIndices.length)];
    const sound = this.jumpSounds[pick];

    if (!sound.buffer) {
      sound.setBuffer(this.jumpBuffers[pick]);
    }
    if (sound.isPlaying) sound.stop();
    sound.play();
  }

  playLand() {
    if (!this.landAttached) return;

    const readyIndices = this.landBuffers
      .map((buf, i) => (buf ? i : -1))
      .filter((i) => i >= 0);
    if (readyIndices.length === 0) return;

    const pick = readyIndices[Math.floor(Math.random() * readyIndices.length)];
    const sound = this.landSounds[pick];

    if (!sound.buffer) {
      sound.setBuffer(this.landBuffers[pick]);
    }
    if (sound.isPlaying) sound.stop();
    sound.play();
  }

  update(board) {
    if (!this.rollAttached || !this.rollSound || !this.rollSound.buffer) return;

    const speed = Math.hypot(board.velocity.x, board.velocity.z);

    let speedFactor = 0;
    if (!board.isUpsideDown && !board.isAirborne) {
      speedFactor = THREE.MathUtils.clamp(
        (speed - ROLL_MIN_SPEED) / (ROLL_MAX_SPEED - ROLL_MIN_SPEED),
        0,
        1
      );
    }

    this.rollBaseVolume += (speedFactor - this.rollBaseVolume) * 0.15;
    this.rollSound.setVolume(this.rollBaseVolume);
  }
}