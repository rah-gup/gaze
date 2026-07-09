import { EYE, GAZE, GAZE_OFF_OFFSET, BLINK, IDLE, PUPIL_LERP, PUPIL_LERP_REDUCED } from './constants.js';
import { EYE_PRESETS } from './eyePresets.js';

const NS = 'http://www.w3.org/2000/svg';

function getEyeCenters(preset) {
  const midX = EYE.viewBox.w / 2;
  const midY = EYE.viewBox.h / 2;
  const half = preset.spacing / 2;
  return {
    left: { x: midX - half, y: midY },
    right: { x: midX + half, y: midY },
  };
}

export function createEyes(container, preset = EYE_PRESETS[0]) {
  container.innerHTML = '';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${EYE.viewBox.w} ${EYE.viewBox.h}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Minimal agent eyes');

  const state = {
    preset,
    centers: getEyeCenters(preset),
    gaze: { x: 0, y: 0 },
    blinkProgress: 0,
    nextBlinkAt: performance.now() + randomBlinkDelay(),
    elements: {},
    svg,
  };

  for (const id of ['left', 'right']) {
    state.elements[id] = buildEyeGroup(id);
    svg.appendChild(state.elements[id].group);
  }

  container.appendChild(svg);
  applyPreset(state, preset);
  return state;
}

function buildEyeGroup(id) {
  const g = document.createElementNS(NS, 'g');

  const brow = document.createElementNS(NS, 'path');
  brow.setAttribute('class', 'brow');

  const lashGroup = document.createElementNS(NS, 'g');
  lashGroup.setAttribute('class', 'lashes');

  const sclera = document.createElementNS(NS, 'ellipse');
  sclera.setAttribute('class', 'sclera');

  const pupil = document.createElementNS(NS, 'circle');
  pupil.setAttribute('class', 'pupil');

  const lid = document.createElementNS(NS, 'rect');
  lid.setAttribute('class', 'lid');
  lid.setAttribute('height', '0');
  lid.setAttribute('opacity', '0');

  g.appendChild(brow);
  g.appendChild(sclera);
  g.appendChild(pupil);
  g.appendChild(lashGroup);
  g.appendChild(lid);

  return { group: g, brow, lashes: lashGroup, sclera, pupil, lid, id };
}

export function applyPreset(eyeState, preset) {
  eyeState.preset = preset;
  eyeState.centers = getEyeCenters(preset);

  for (const id of ['left', 'right']) {
    const center = eyeState.centers[id];
    const eye = eyeState.elements[id];

    eye.group.setAttribute('transform', `translate(${center.x}, ${center.y})`);

    eye.sclera.setAttribute('rx', preset.scleraRx);
    eye.sclera.setAttribute('ry', preset.scleraRy);
    eye.pupil.setAttribute('r', preset.pupilR);

    eye.lid.setAttribute('x', -preset.scleraRx);
    eye.lid.setAttribute('y', -preset.scleraRy);
    eye.lid.setAttribute('width', preset.scleraRx * 2);

    updateBrow(eye.brow, preset, id);
    updateLashes(eye.lashes, preset);
  }

  eyeState.svg.setAttribute('aria-label', `${preset.label} agent eyes`);
}

function updateBrow(browEl, preset, side) {
  const brow = preset.brow;
  if (!brow || brow.style === 'none') {
    browEl.setAttribute('opacity', '0');
    return;
  }

  const rx = preset.scleraRx;
  const ry = preset.scleraRy;
  const gap = brow.gap ?? 10;
  const arch = brow.arch ?? 6;
  const y = -ry - gap;

  let d;
  switch (brow.style) {
    case 'flat':
      d = `M ${-rx * 0.75} ${y} L ${rx * 0.75} ${y}`;
      break;
    case 'angry': {
      const innerLift = side === 'left' ? -arch : arch;
      const outerDrop = side === 'left' ? arch * 0.4 : -arch * 0.4;
      d = `M ${-rx * 0.82} ${y + outerDrop} L ${rx * 0.82} ${y + innerLift}`;
      break;
    }
    case 'droopy':
      d = `M ${-rx * 0.8} ${y} Q 0 ${y + arch * 1.4} ${rx * 0.8} ${y}`;
      break;
    case 'surprised':
      d = `M ${-rx * 0.72} ${y - arch} Q 0 ${y - arch * 2.2} ${rx * 0.72} ${y - arch}`;
      break;
    default:
      d = `M ${-rx * 0.85} ${y} Q 0 ${y - arch} ${rx * 0.85} ${y}`;
  }

  browEl.setAttribute('d', d);
  browEl.setAttribute('opacity', '1');
}

function updateLashes(lashGroup, preset) {
  lashGroup.innerHTML = '';

  const lashes = preset.lashes;
  if (!lashes || lashes.style === 'none') return;

  const rx = preset.scleraRx;
  const ry = preset.scleraRy;
  const count = lashes.count ?? 5;
  const length = lashes.length ?? 5;
  if (count < 2) return;
  const startAngle = lashes.style === 'sparse' ? 0.25 : 0.15;
  const endAngle = lashes.style === 'sparse' ? 0.85 : 0.85;

  for (let i = 0; i < count; i++) {
    const t = startAngle + (i / (count - 1)) * (endAngle - startAngle);
    const angle = Math.PI * t;
    const x = rx * Math.cos(angle);
    const y = -ry * Math.sin(angle);
    const nx = Math.cos(angle - Math.PI / 2);
    const ny = Math.sin(angle - Math.PI / 2);

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 'lash');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x + nx * length);
    line.setAttribute('y2', y + ny * length);
    lashGroup.appendChild(line);
  }
}

function randomBlinkDelay() {
  const { minInterval, maxInterval } = BLINK;
  return minInterval + Math.random() * (maxInterval - minInterval);
}

export function updateEyes(eyeState, { targetX, targetY, gazeOn, reducedMotion, now }) {
  const { gaze, elements, preset } = eyeState;
  const lerpFactor = reducedMotion ? PUPIL_LERP_REDUCED : PUPIL_LERP;

  let desiredGaze;

  if (gazeOn) {
    desiredGaze = computeSharedGaze(targetX, targetY, eyeState.centers, preset);

    if (!reducedMotion) {
      desiredGaze = {
        x: desiredGaze.x + Math.sin(now * IDLE.frequency) * IDLE.amplitude,
        y: desiredGaze.y + Math.cos(now * IDLE.frequency * 0.7) * IDLE.amplitude,
      };
    }

    updateBlink(eyeState, now, reducedMotion);
  } else {
    desiredGaze = { ...GAZE_OFF_OFFSET };
    eyeState.blinkProgress = 0;
    setLid(elements.left.lid, 0);
    setLid(elements.right.lid, 0);
  }

  gaze.x += (desiredGaze.x - gaze.x) * lerpFactor;
  gaze.y += (desiredGaze.y - gaze.y) * lerpFactor;

  applySharedGaze(elements, gaze);
}

function computeSharedGaze(targetX, targetY, centers, preset) {
  const midX = (centers.left.x + centers.right.x) / 2;
  const midY = (centers.left.y + centers.right.y) / 2;

  const dx = targetX - midX;
  const dy = targetY - midY;
  const dist = Math.hypot(dx, dy);

  if (dist < GAZE.centerDeadzone) return { x: 0, y: 0 };

  const t = Math.min(dist / GAZE.range, 1);
  const eased = 1 - (1 - t) ** 2;
  const maxOffset = GAZE.maxOffset * (preset.maxOffsetScale ?? 1);
  const magnitude = maxOffset * eased;

  return {
    x: (dx / dist) * magnitude,
    y: (dy / dist) * magnitude,
  };
}

function applySharedGaze(elements, gaze) {
  const transform = `translate(${gaze.x}, ${gaze.y})`;
  elements.left.pupil.setAttribute('transform', transform);
  elements.right.pupil.setAttribute('transform', transform);
}

function updateBlink(state, now, reducedMotion) {
  const intervalMultiplier = reducedMotion ? 2.5 : 1;
  const scleraRy = state.preset.scleraRy;

  if (state.blinkProgress === 0 && now >= state.nextBlinkAt) {
    state.blinkStart = now;
    state.blinkProgress = 0.001;
  }

  if (state.blinkProgress > 0) {
    const elapsed = now - state.blinkStart;
    const half = BLINK.duration / 2;
    if (elapsed < half) {
      state.blinkProgress = elapsed / half;
    } else if (elapsed < BLINK.duration) {
      state.blinkProgress = 1 - (elapsed - half) / half;
    } else {
      state.blinkProgress = 0;
      state.nextBlinkAt = now + randomBlinkDelay() * intervalMultiplier;
    }
    const lidHeight = state.blinkProgress * scleraRy * 2;
    setLid(state.elements.left.lid, lidHeight);
    setLid(state.elements.right.lid, lidHeight);
  }
}

function setLid(lidEl, height) {
  lidEl.setAttribute('height', height);
  lidEl.setAttribute('opacity', height > 0 ? '1' : '0');
}
