import * as THREE from 'three';
import { createScene } from './core/scene.js';
import { createLoop } from './core/loop.js';
import { Board } from './entities/Board.js';
import { setupKeyboard } from './input/keyboard.js';
import { buildWords, getVisibleSizeAtGround } from './text/layout.js';

const startBtn = document.getElementById('startBtn');
const intro = document.getElementById('intro');
const hud = document.getElementById('hud');
const resetBtn = document.getElementById('resetBtn');
const findBtn = document.getElementById('findBtn');

const { scene, camera, renderer } = createScene();
setupKeyboard();

const { width: visW, height: visH } = getVisibleSizeAtGround(camera);
const gridSize = Math.max(visW, visH) * 1.1;
const grid = new THREE.GridHelper(gridSize, 30, 0x333333, 0x222222);
scene.add(grid);

const textInput = document.getElementById('textInput');
let words = [];

function handleUpsideDown() {
  resetBtn.style.display = 'block';
}

const board = new Board(scene, handleUpsideDown, { width: visW, height: visH });

const loop = createLoop(
  (dt) => {
    board.update(dt);
    words.forEach((w) => w.update(dt));
  },
  () => {
    renderer.render(scene, camera);
  }
);

startBtn.addEventListener('click', () => {
  words = buildWords(textInput.value, scene, visW, visH);

  intro.style.display = 'none';
  hud.style.display = 'block';
  loop.start();
});

findBtn.addEventListener('click', () => {
  board.dropIn();
});

resetBtn.addEventListener('click', () => {
  board.reset();
  resetBtn.style.display = 'none';
});

renderer.render(scene, camera);