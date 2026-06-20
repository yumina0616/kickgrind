const keys = {};

export function setupKeyboard() {
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        keys[e.code] = true;
        e.preventDefault(); // 스페이스바 스크롤 방지
      }
    },
    { passive: false }
  );

  window.addEventListener('keyup', (e) => {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
    ) {
      keys[e.code] = false;
    }
  });
}

export function isKeyDown(code) {
  return !!keys[code];
}

// 스페이스바처럼 "누른 순간 1번만" 감지가 필요한 경우를 위한 헬퍼
let spacePressedLastFrame = false;
export function isSpaceJustPressed() {
  const down = isKeyDown('Space');
  const justPressed = down && !spacePressedLastFrame;
  spacePressedLastFrame = down;
  return justPressed;
}