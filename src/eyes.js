import {
  EYE, GAZE, GAZE_OFF_OFFSET, BLINK, IDLE,
  PUPIL_LERP, PUPIL_LERP_REDUCED, CONFUSION,
} from './constants.js';
import { EYE_PRESETS } from './eyePresets.js';
import { createAgentLayers, getFaceCenter } from './agentBody.js';

const NS = 'http://www.w3.org/2000/svg';

function getEyeCenters(preset) {
  const face = getFaceCenter();
  if (preset.mono) {
    return { left: { x: face.x, y: face.y }, right: null };
  }
  const half = preset.spacing / 2;
  return {
    left: { x: face.x - half, y: face.y },
    right: { x: face.x + half, y: face.y },
  };
}

function getEyeDims(preset, side) {
  const override = side === 'left' ? preset.leftEye : preset.rightEye;
  return {
    scleraRx: override?.scleraRx ?? preset.scleraRx,
    scleraRy: override?.scleraRy ?? preset.scleraRy,
    pupilR: override?.pupilR ?? preset.pupilR,
  };
}

export function createEyes(container, preset = EYE_PRESETS[0]) {
  container.innerHTML = '';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${EYE.viewBox.w} ${EYE.viewBox.h}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Gaze agent');

  const { bodyGroup, hairGroup } = createAgentLayers(svg);

  const faceGroup = document.createElementNS(NS, 'g');
  faceGroup.setAttribute('class', 'face');
  svg.appendChild(faceGroup);

  svg.appendChild(hairGroup);

  const state = {
    preset,
    centers: getEyeCenters(preset),
    gaze: { x: 0, y: 0 },
    pupilScale: 1,
    confusion: 0,
    fastMoveMs: 0,
    prevGaze: { x: 0, y: 0 },
    blinkProgress: 0,
    nextBlinkAt: performance.now() + randomBlinkDelay(),
    elements: {},
    bodyGroup,
    faceGroup,
    svg,
  };

  for (const id of ['left', 'right']) {
    state.elements[id] = buildEyeGroup(id);
    faceGroup.appendChild(state.elements[id].group);
  }

  container.appendChild(svg);
  applyPreset(state, preset);
  return state;
}

function buildEyeGroup(id) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', `eye eye-${id}`);

  const brow = document.createElementNS(NS, 'path');
  brow.setAttribute('class', 'brow');

  const lashGroup = document.createElementNS(NS, 'g');
  lashGroup.setAttribute('class', 'lashes');

  const sclera = document.createElementNS(NS, 'ellipse');
  sclera.setAttribute('class', 'sclera');

  const pupilGroup = document.createElementNS(NS, 'g');
  pupilGroup.setAttribute('class', 'pupil-group');

  const pupil = document.createElementNS(NS, 'circle');
  pupil.setAttribute('class', 'pupil');

  const pupilRing = document.createElementNS(NS, 'circle');
  pupilRing.setAttribute('class', 'pupil-ring');
  pupilRing.setAttribute('opacity', '0');

  pupilGroup.appendChild(pupilRing);
  pupilGroup.appendChild(pupil);

  const lid = document.createElementNS(NS, 'rect');
  lid.setAttribute('class', 'lid');
  lid.setAttribute('height', '0');
  lid.setAttribute('opacity', '0');

  g.appendChild(sclera);
  g.appendChild(pupilGroup);
  g.appendChild(lashGroup);
  g.appendChild(brow);
  g.appendChild(lid);

  return { group: g, brow, lashes: lashGroup, sclera, pupilGroup, pupil, pupilRing, lid, id };
}

export function applyPreset(eyeState, preset) {
  eyeState.preset = preset;
  eyeState.centers = getEyeCenters(preset);

  const sides = preset.mono ? ['left'] : ['left', 'right'];

  for (const id of ['left', 'right']) {
    const eye = eyeState.elements[id];
    const active = sides.includes(id);
    eye.group.setAttribute('opacity', active ? '1' : '0');
    eye.group.setAttribute('pointer-events', active ? 'auto' : 'none');
    if (!active) continue;

    const center = eyeState.centers[id];
    const dims = getEyeDims(preset, id);

    eye.group.setAttribute('transform', `translate(${center.x}, ${center.y})`);
    eye.sclera.setAttribute('rx', dims.scleraRx);
    eye.sclera.setAttribute('ry', dims.scleraRy);
    eye.basePupilR = dims.pupilR;

    eye.lid.setAttribute('x', -dims.scleraRx);
    eye.lid.setAttribute('y', -dims.scleraRy);
    eye.lid.setAttribute('width', dims.scleraRx * 2);

    updateBrow(eye.brow, preset, id, dims, 0);
    updateLashes(eye.lashes, preset, dims);
    updatePupilStyle(eye, preset, dims.pupilR, eyeState.pupilScale);
  }

  eyeState.svg.setAttribute('aria-label', `${preset.label} gaze agent`);
}

function updatePupilStyle(eye, preset, baseR, scale) {
  const r = baseR * scale;
  const isRing = preset.pupilStyle === 'ring';

  eye.pupil.setAttribute('r', isRing ? r * 0.45 : r);
  eye.pupilRing.setAttribute('opacity', isRing ? '1' : '0');
  if (isRing) {
    eye.pupilRing.setAttribute('r', r);
    eye.pupilRing.setAttribute('fill', 'none');
    eye.pupilRing.setAttribute('stroke-width', '2.5');
  }
}

function updateBrow(browEl, preset, side, dims, lift, wobble = 0) {
  const brow = preset.brow;
  if (!brow || brow.style === 'none') {
    browEl.setAttribute('opacity', '0');
    return;
  }

  const rx = dims.scleraRx;
  const ry = dims.scleraRy;
  const gap = brow.gap ?? 10;
  const arch = brow.arch ?? 6;
  const sideTilt = side === 'left' ? -wobble : wobble;
  const y = -ry - gap - lift + wobble * 0.4;

  let d;
  switch (brow.style) {
    case 'flat':
      d = `M ${-rx * 0.75} ${y} L ${rx * 0.75} ${y}`;
      break;
    case 'angry': {
      const innerLift = side === 'left' ? -arch + sideTilt : arch - sideTilt;
      const outerDrop = side === 'left' ? arch * 0.4 + sideTilt : -arch * 0.4 - sideTilt;
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
      d = `M ${-rx * 0.85} ${y + sideTilt} Q 0 ${y - arch + sideTilt * 0.5} ${rx * 0.85} ${y - sideTilt}`;
  }

  browEl.setAttribute('d', d);
  browEl.setAttribute('opacity', '1');
}

function updateLashes(lashGroup, preset, dims) {
  lashGroup.innerHTML = '';

  const lashes = preset.lashes;
  if (!lashes || lashes.style === 'none') return;

  const rx = dims.scleraRx;
  const ry = dims.scleraRy;
  const count = lashes.count ?? 5;
  const length = lashes.length ?? 5;
  if (count < 2) return;

  const startAngle = lashes.style === 'sparse' ? 0.25 : 0.15;
  const endAngle = 0.85;

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

export function updateEyes(eyeState, { targetX, targetY, gazeOn, reducedMotion, now, gazeSpeed, deltaMs }) {
  const { gaze, elements, preset, bodyGroup } = eyeState;
  const lerpFactor = reducedMotion ? PUPIL_LERP_REDUCED : PUPIL_LERP;

  let desiredGaze;
  let confusion = 0;

  if (gazeOn) {
    desiredGaze = computeSharedGaze(targetX, targetY, eyeState.centers, preset);

    if (preset.gazeBias) {
      desiredGaze.x += preset.gazeBias.x;
      desiredGaze.y += preset.gazeBias.y;
    }

    if (!reducedMotion) {
      desiredGaze = {
        x: desiredGaze.x + Math.sin(now * IDLE.frequency) * IDLE.amplitude,
        y: desiredGaze.y + Math.cos(now * IDLE.frequency * 0.7) * IDLE.amplitude,
      };
    }

    const isFast = gazeSpeed >= CONFUSION.speedThreshold;
    const maxAccum = CONFUSION.sustainMs + CONFUSION.rampMs;

    if (!reducedMotion && isFast) {
      eyeState.fastMoveMs = Math.min(eyeState.fastMoveMs + deltaMs, maxAccum);
    } else {
      const decayRate = CONFUSION.sustainMs / CONFUSION.decayMs;
      eyeState.fastMoveMs = Math.max(0, eyeState.fastMoveMs - deltaMs * decayRate);
    }

    if (!reducedMotion && eyeState.fastMoveMs > CONFUSION.sustainMs) {
      confusion = Math.min(
        (eyeState.fastMoveMs - CONFUSION.sustainMs) / CONFUSION.rampMs,
        1,
      );
      const wobble = confusion * CONFUSION.wobbleMax;
      desiredGaze.x += (Math.random() - 0.5) * wobble;
      desiredGaze.y += (Math.random() - 0.5) * wobble;
    }

    updateBlink(eyeState, now, reducedMotion);
  } else {
    desiredGaze = { ...GAZE_OFF_OFFSET };
    confusion = 0;
    eyeState.fastMoveMs = 0;
    eyeState.blinkProgress = 0;
    setLid(elements.left.lid, 0);
    if (elements.right) setLid(elements.right.lid, 0);
  }

  gaze.x += (desiredGaze.x - gaze.x) * lerpFactor;
  gaze.y += (desiredGaze.y - gaze.y) * lerpFactor;

  const targetScale = gazeOn
    ? 1 - confusion * (1 - CONFUSION.minPupilScale)
    : 1;
  const scaleLerp = confusion > eyeState.confusion ? CONFUSION.shrinkLerp : CONFUSION.recoverLerp;
  eyeState.pupilScale += (targetScale - eyeState.pupilScale) * scaleLerp;
  eyeState.confusion = confusion;

  const browLift = confusion * CONFUSION.browLiftMax;
  const browWobble = confusion > 0.05
    ? (Math.random() - 0.5) * CONFUSION.wobbleMax * 2
    : 0;
  const bodyWobble = confusion * CONFUSION.wobbleMax * 0.6;
  bodyGroup.setAttribute(
    'transform',
    `translate(${(Math.random() - 0.5) * bodyWobble}, ${(Math.random() - 0.5) * bodyWobble})`,
  );

  applySharedGaze(eyeState, gaze, browLift, browWobble);
}

function computeSharedGaze(targetX, targetY, centers, preset) {
  const left = centers.left;
  const right = centers.right ?? centers.left;
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;

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

function applySharedGaze(eyeState, gaze, browLift, browWobble) {
  const { elements, preset, pupilScale } = eyeState;
  const transform = `translate(${gaze.x}, ${gaze.y})`;
  const sides = preset.mono ? ['left'] : ['left', 'right'];

  for (const id of sides) {
    const eye = elements[id];
    eye.pupilGroup.setAttribute('transform', transform);
    const dims = getEyeDims(preset, id);
    updatePupilStyle(eye, preset, dims.pupilR, pupilScale);
    const sideWobble = id === 'left' ? browWobble : -browWobble * 0.7;
    updateBrow(eye.brow, preset, id, dims, browLift, sideWobble);
  }
}

function updateBlink(state, now, reducedMotion) {
  const intervalMultiplier = reducedMotion ? 2.5 : 1;
  const preset = state.preset;
  const sides = preset.mono ? ['left'] : ['left', 'right'];

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

    for (const id of sides) {
      const eye = state.elements[id];
      const dims = getEyeDims(preset, id);
      const lidHeight = state.blinkProgress * dims.scleraRy * 2;
      setLid(eye.lid, lidHeight);
    }
  }
}

function setLid(lidEl, height) {
  lidEl.setAttribute('height', height);
  lidEl.setAttribute('opacity', height > 0 ? '1' : '0');
}
