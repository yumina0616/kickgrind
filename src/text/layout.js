import { Word } from './Word.js';

const WORD_GAP = 0.15;
const LINE_GAP = 0.15;
const PERSPECTIVE_FILL_FACTOR = 2.6;

export function getVisibleSizeAtGround(camera) {
  const distance = camera.position.y;
  const vFOV = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFOV / 2) * distance * PERSPECTIVE_FILL_FACTOR;
  const visibleWidth = visibleHeight * camera.aspect;
  return { width: visibleWidth, height: visibleHeight };
}

export function buildWords(text, scene, areaWidth, areaHeight) {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  if (raw.length === 0) raw.push('skate');

  const sample = raw.map((t) => new Word(t));
  const avgWidth =
    sample.reduce((sum, w) => sum + w.width + WORD_GAP, 0) / sample.length;
  const wordHeight = Math.max(...sample.map((w) => w.height));
  const lineHeight = wordHeight + LINE_GAP;

  const wordsPerLine = Math.ceil(areaWidth / avgWidth) + 2;
  const totalLines = Math.ceil(areaHeight / lineHeight) + 1;
  const targetCount = wordsPerLine * totalLines;

  let wordObjects = [...sample];
  let i = 0;
  while (wordObjects.length < targetCount) {
    wordObjects.push(new Word(raw[i % raw.length]));
    i++;
  }
  wordObjects = wordObjects.slice(0, targetCount);

  let cursorX = 0;
  let lineIndex = 0;
  const words = [];

  wordObjects.forEach((word) => {
    if (cursorX + word.width > areaWidth && cursorX > 0) {
      lineIndex += 1;
      cursorX = 0;
    }

    const x = cursorX + word.width / 2 - areaWidth / 2;
    const z = lineIndex * lineHeight;

    word.position.set(x, 0.01, z);
    word.basePosition.set(x, 0.01, z);
    word.mesh.position.copy(word.position);

    scene.add(word.mesh);
    words.push(word);

    cursorX += word.width + WORD_GAP;
  });

  const actualTotalLines = lineIndex + 1;
  const zOffset = (actualTotalLines * lineHeight) / 2;
  words.forEach((w) => {
    w.position.z -= zOffset;
    w.basePosition.z -= zOffset;
    w.mesh.position.copy(w.position);
  });

  return words;
}