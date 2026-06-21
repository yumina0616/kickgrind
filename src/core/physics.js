export function checkCollision(board, word) {
  const dx = word.position.x - board.position.x;
  const dz = word.position.z - board.position.z;
  const dist = Math.hypot(dx, dz);

  const boardRadius = 0.7;
  const wordRadius = Math.max(word.width, word.height) / 2;

  return dist < boardRadius + wordRadius;
}

export function resolveCollision(board, word, hitStrength = 1) {
  const dx = word.position.x - board.position.x;
  const dz = word.position.z - board.position.z;
  const dist = Math.max(Math.hypot(dx, dz), 0.01);

  const nx = dx / dist;
  const nz = dz / dist;

  const boardSpeed = Math.hypot(board.velocity.x, board.velocity.z);
  const force = boardSpeed * 50 * hitStrength;

  word.velocity.x += nx * force * 0.016;
  word.velocity.z += nz * force * 0.016;

  if (boardSpeed > 0.01) {
    word.velocity.x += (board.velocity.x / boardSpeed) * boardSpeed * 35 * 0.016;
    word.velocity.z += (board.velocity.z / boardSpeed) * boardSpeed * 35 * 0.016;
  }

  word.registerHit();
}