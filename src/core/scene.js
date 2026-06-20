import * as THREE from 'three';

export function createScene() {
  const canvas = document.getElementById('canvas');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // 보드를 약간 위/뒤에서 내려다보는 앵글
  camera.position.set(0, 6, 8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 조명: 은은한 ambient + 방향성 키 라이트
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(5, 10, 7);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x5588ff, 0.3);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}