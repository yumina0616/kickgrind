export function createLoop(update, render) {
  let running = false;
  let lastTime = null;

  function tick(t) {
    if (!running) return;
    if (lastTime === null) lastTime = t;
    let dt = (t - lastTime) / 1000;
    dt = Math.min(dt, 0.05); // 탭 전환 등으로 dt가 너무 커지는 것 방지
    lastTime = t;

    update(dt);
    render();

    requestAnimationFrame(tick);
  }

  return {
    start() {
      running = true;
      lastTime = null;
      requestAnimationFrame(tick);
    },
    stop() {
      running = false;
    },
  };
}