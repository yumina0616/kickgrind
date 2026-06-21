import * as THREE from 'three';
import { createScene } from './core/scene.js';
import { createLoop } from './core/loop.js';
import { Board } from './entities/Board.js';
import { setupKeyboard } from './input/keyboard.js';
import { buildWords, getVisibleSizeAtGround } from './text/layout.js';
import { checkCollision, resolveCollision } from './core/physics.js';
import { BoardAudio } from './core/audio.js';

const startBtn = document.getElementById('startBtn');
const intro = document.getElementById('intro');
const hud = document.getElementById('hud');
const findBtn = document.getElementById('findBtn');

const { scene, camera, renderer, composer } = createScene();
setupKeyboard();

const { width: visW, height: visH } = getVisibleSizeAtGround(camera);
const gridSize = Math.max(visW, visH) * 1.1;
const grid = new THREE.GridHelper(gridSize, 30, 0x4fa8e0, 0x2a5a80);
scene.add(grid);

const textInput = document.getElementById('textInput');
let words = [];

const hitCountEl = document.getElementById('hitCount');
let hitCount = 0;

const boardAudio = new BoardAudio(camera);

const COLLISION_CHECK_RADIUS = 3;

function handleUpsideDown() {
}

const board = new Board(
  scene,
  handleUpsideDown,
  () => boardAudio.playJump(),
  (mesh) => boardAudio.attachToBoard(mesh),
  () => boardAudio.playLand()
);

const loop = createLoop(
  (dt) => {
    board.update(dt);
    boardAudio.update(board);

    const bx = board.position.x;
    const bz = board.position.z;

    words.forEach((w) => {
      const dx = w.position.x - bx;
      const dz = w.position.z - bz;

      if (Math.abs(dx) < COLLISION_CHECK_RADIUS && Math.abs(dz) < COLLISION_CHECK_RADIUS) {
        if (checkCollision(board, w)) {
          const boardSpeed = Math.hypot(board.velocity.x, board.velocity.z);
          if (boardSpeed > 2.5) {
            resolveCollision(board, w);
            hitCount++;
            hitCountEl.textContent = hitCount;
          }
        }
      }
      w.update(dt);
    });
  },
  () => {
    composer.render();
  }
);

startBtn.addEventListener('click', async () => {
  if (boardAudio.listener.context.state === 'suspended') {
    boardAudio.listener.context.resume();
  }

  await Promise.all([
    document.fonts.load('32px "Orbitron"'),
    document.fonts.load('32px "Press Start 2P"'),
    document.fonts.load('32px "Share Tech Mono"'),
  ]);

  words = buildWords(textInput.value, scene, visW, visH);

  intro.style.display = 'none';
  hud.style.display = 'block';
  loop.start();
});

findBtn.addEventListener('click', () => {
  board.dropIn();
});

composer.render(scene, camera);