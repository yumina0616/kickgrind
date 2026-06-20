import * as THREE from 'three';
import { createScene } from './core/scene.js';
import { createLoop } from './core/loop.js';
import { Board } from './entities/Board.js';
import { setupKeyboard } from './input/keyboard.js';

const startBtn = document.getElementById('startBtn');
const intro = document.getElementById('intro');
const hud = document.getElementById('hud');
const resetBtn = document.getElementById('resetBtn');

const { scene, camera, renderer } = createScene();
setupKeyboard();

const grid = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
scene.add(grid);

function handleUpsideDown() {
  resetBtn.style.display = 'block';
}

const board = new Board(scene, handleUpsideDown);

const loop = createLoop(
  (dt) => {
    board.update(dt);

    // 카메라가 보드를 살짝 따라가도록
    camera.position.x = board.position.x;
    camera.position.z = board.position.z + 8;
    camera.lookAt(board.position.x, 0, board.position.z);
  },
  () => {
    renderer.render(scene, camera);
  }
);

startBtn.addEventListener('click', () => {
  intro.style.display = 'none';
  hud.style.display = 'block';
  loop.start();
});

resetBtn.addEventListener('click', () => {
  board.reset();
  resetBtn.style.display = 'none';
});

renderer.render(scene, camera);