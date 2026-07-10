import {
  EYE, GAZE, IDLE, EYE_LIFE,
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
  const scleraRx = override?.scleraRx ?? preset.scleraRx;
  const scleraRy = override?.scleraRy ?? preset.scleraRy;
  return {
    scleraRx,
    scleraRy,
    pupilR: override?.pupilR ?? preset.pupilR,
    clipCx: 0,
    clipCy: 0,
    clipRx: scleraRx,
    clipRy: scleraRy,
  };
}

export function createEyes(container, preset = EYE_PRESETS[0]) {
  container.innerHTML = '';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${EYE.viewBox.w} ${EYE.viewBox.h}`);
  svg.setAttribute('overflow', 'visible');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Gaze agent');

  const { bodyGroup, earsGroup, hairGroup } = createAgentLayers();

  svg.appendChild(earsGroup);
  svg.appendChild(bodyGroup);

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
    hadConfusion: false,
    blinkOpenAmount: 1,
    blinkPhase: null,
    blinkStart: 0,
    blinkFromOpen: 1,
    nextBlinkAt: performance.now() + EYE_LIFE.idleBlinkMs,
    pendingRecoveryBlink: false,
    openAmount: 0,
    wakeSleepStart: null,
    wasGazeOn: false,
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

  const defs = document.createElementNS(NS, 'defs');
  const clipPath = document.createElementNS(NS, 'clipPath');
  const clipId = `eyeClip-${id}`;
  clipPath.setAttribute('id', clipId);

  const clipShape = document.createElementNS(NS, 'ellipse');
  clipShape.setAttribute('cx', '0');
  clipShape.setAttribute('cy', '0');
  clipPath.appendChild(clipShape);
  defs.appendChild(clipPath);
  g.appendChild(defs);

  const clipped = document.createElementNS(NS, 'g');
  clipped.setAttribute('class', 'eye-clipped');
  clipped.setAttribute('clip-path', `url(#${clipId})`);

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

  const topLid = document.createElementNS(NS, 'rect');
  topLid.setAttribute('class', 'top-lid');
  topLid.setAttribute('height', '0');

  clipped.appendChild(sclera);
  clipped.appendChild(pupilGroup);
  clipped.appendChild(topLid);

  const lashGroup = document.createElementNS(NS, 'g');
  lashGroup.setAttribute('class', 'lashes');

  const brow = document.createElementNS(NS, 'path');
  brow.setAttribute('class', 'brow');

  g.appendChild(clipped);
  g.appendChild(lashGroup);
  g.appendChild(brow);

  return {
    group: g,
    clipShape,
    clipped,
    brow,
    lashes: lashGroup,
    sclera,
    pupilGroup,
    pupil,
    pupilRing,
    topLid,
    id,
  };
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

    eye.clipShape.setAttribute('cx', dims.clipCx);
    eye.clipShape.setAttribute('cy', dims.clipCy);
    eye.clipShape.setAttribute('rx', dims.clipRx);
    eye.clipShape.setAttribute('ry', dims.clipRy);

    eye.sclera.setAttribute('cx', dims.clipCx);
    eye.sclera.setAttribute('cy', dims.clipCy);
    eye.sclera.setAttribute('rx', dims.clipRx);
    eye.sclera.setAttribute('ry', dims.clipRy);

    eye.basePupilR = dims.pupilR;
    pupilGroupOffset(eye.pupilGroup, 0, 0);

    setTopLid(eye.topLid, dims, 0);
    updateBrow(eye.brow, preset, id, dims, 0);
    updateLashes(eye.lashes, preset, dims);
    updatePupilStyle(eye, preset, dims.pupilR, eyeState.pupilScale);
  }

  eyeState.svg.setAttribute('aria-label', `${preset.label} gaze agent`);
}

function pupilGroupOffset(pupilGroup, cx, cy) {
  pupilGroup.dataset.baseCx = cx;
  pupilGroup.dataset.baseCy = cy;
}

function setTopLid(lidEl, dims, coverage) {
  const c = Math.min(Math.max(coverage, 0), 1);
  lidEl.setAttribute('x', dims.clipCx - dims.clipRx);
  lidEl.setAttribute('y', dims.clipCy - dims.clipRy);
  lidEl.setAttribute('width', dims.clipRx * 2);
  lidEl.setAttribute('height', c * dims.clipRy * 2);
  lidEl.setAttribute('opacity', c > 0.001 ? '1' : '0');
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

function updateBrow(browEl, preset, side, dims, lift, wobble = 0, openness = 1) {
  const brow = preset.brow;
  if (!brow || brow.style === 'none' || openness <= 0) {
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
  browEl.setAttribute('stroke-width', brow.weight ?? 2);
  browEl.setAttribute('opacity', String(Math.min(openness, 1)));
}

function updateLashes(lashGroup, preset, dims, openness = 1) {
  lashGroup.innerHTML = '';

  const lashes = preset.lashes;
  if (!lashes || lashes.style === 'none' || openness <= 0) return;

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
    line.setAttribute('opacity', String(Math.min(openness, 1)));
    lashGroup.appendChild(line);
  }
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function easeLidAmount(from, to, elapsed, duration) {
  const t = Math.min(elapsed / duration, 1);
  return from + (to - from) * easeOutCubic(t);
}

function updateWakeSleep(eyeState, gazeOn, now, reducedMotion) {
  if (gazeOn !== eyeState.wasGazeOn) {
    eyeState.wakeSleepStart = now;
    eyeState.wasGazeOn = gazeOn;
    if (!gazeOn) {
      eyeState.fastMoveMs = 0;
      eyeState.hadConfusion = false;
      eyeState.pendingRecoveryBlink = false;
      eyeState.blinkPhase = null;
      eyeState.blinkOpenAmount = 1;
    }
  }

  const targetOpen = gazeOn ? 1 : 0;

  if (reducedMotion) {
    eyeState.openAmount = targetOpen;
    return eyeState.openAmount >= 1;
  }

  if (eyeState.wakeSleepStart !== null) {
    const duration = gazeOn ? EYE_LIFE.wakeMs : EYE_LIFE.sleepMs;
    const elapsed = now - eyeState.wakeSleepStart;
    const targetOpen = gazeOn ? 1 : 0;
    const from = gazeOn ? 0 : eyeState.openAmount;
    eyeState.openAmount = easeLidAmount(from, targetOpen, elapsed, duration);
    if (elapsed >= duration) {
      eyeState.wakeSleepStart = null;
      eyeState.openAmount = targetOpen;
      if (gazeOn) {
        eyeState.nextBlinkAt = now + EYE_LIFE.idleBlinkMs;
      }
    }
  } else {
    eyeState.openAmount = gazeOn ? 1 : 0;
  }

  return eyeState.openAmount >= 0.999;
}

function updateIdleBlink(state, now, reducedMotion, confusion) {
  if (state.wakeSleepStart !== null) {
    return state.blinkOpenAmount;
  }

  if (state.pendingRecoveryBlink && state.blinkPhase === null) {
    state.pendingRecoveryBlink = false;
    state.blinkPhase = 'close';
    state.blinkStart = now;
    state.blinkFromOpen = state.blinkOpenAmount;
  } else if (
    state.blinkPhase === null
    && confusion < 0.05
    && now >= state.nextBlinkAt
  ) {
    state.blinkPhase = 'close';
    state.blinkStart = now;
    state.blinkFromOpen = state.blinkOpenAmount;
  }

  if (state.blinkPhase === 'close') {
    const elapsed = now - state.blinkStart;
    state.blinkOpenAmount = easeLidAmount(state.blinkFromOpen, 0, elapsed, EYE_LIFE.blinkCloseMs);
    if (elapsed >= EYE_LIFE.blinkCloseMs) {
      state.blinkPhase = 'open';
      state.blinkStart = now;
      state.blinkFromOpen = 0;
    }
  } else if (state.blinkPhase === 'open') {
    const elapsed = now - state.blinkStart;
    state.blinkOpenAmount = easeLidAmount(state.blinkFromOpen, 1, elapsed, EYE_LIFE.blinkOpenMs);
    if (elapsed >= EYE_LIFE.blinkOpenMs) {
      state.blinkPhase = null;
      state.blinkOpenAmount = 1;
      state.nextBlinkAt = now + (reducedMotion ? EYE_LIFE.idleBlinkMs * 2.5 : EYE_LIFE.idleBlinkMs);
    }
  }

  return state.blinkOpenAmount;
}

export function updateEyes(eyeState, { targetX, targetY, gazeOn, reducedMotion, now, gazeSpeed, deltaMs }) {
  const { gaze, preset, bodyGroup } = eyeState;
  const lerpFactor = reducedMotion ? PUPIL_LERP_REDUCED : PUPIL_LERP;
  const fullyOpen = updateWakeSleep(eyeState, gazeOn, now, reducedMotion);
  const openAmount = eyeState.openAmount;

  let desiredGaze = { x: 0, y: 0 };
  let confusion = 0;

  if (gazeOn && fullyOpen) {
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
      eyeState.hadConfusion = true;
      const wobble = confusion * CONFUSION.wobbleMax;
      desiredGaze.x += (Math.random() - 0.5) * wobble;
      desiredGaze.y += (Math.random() - 0.5) * wobble;
    }
  }

  const blinkOpenAmount = gazeOn
    ? updateIdleBlink(eyeState, now, reducedMotion, confusion)
    : (eyeState.blinkPhase = null, eyeState.blinkOpenAmount = 1, 1);
  const effectiveOpenAmount = Math.min(openAmount, blinkOpenAmount);
  const lidCoverage = 1 - effectiveOpenAmount;
  const isBlinking = eyeState.blinkPhase !== null;

  gaze.x += (desiredGaze.x - gaze.x) * lerpFactor;
  gaze.y += (desiredGaze.y - gaze.y) * lerpFactor;

  const targetScale = gazeOn && fullyOpen
    ? 1 - confusion * (1 - CONFUSION.minPupilScale)
    : 1;
  const scaleLerp = confusion > eyeState.confusion ? CONFUSION.shrinkLerp : CONFUSION.recoverLerp;
  eyeState.pupilScale += (targetScale - eyeState.pupilScale) * scaleLerp;
  eyeState.confusion = confusion;

  if (eyeState.hadConfusion && confusion < 0.05 && eyeState.pupilScale > 0.95) {
    eyeState.pendingRecoveryBlink = true;
    eyeState.hadConfusion = false;
  }

  const browLift = confusion * CONFUSION.browLiftMax;
  const browWobble = confusion > 0.05
    ? (Math.random() - 0.5) * CONFUSION.wobbleMax * 2
    : 0;
  const bodyWobble = gazeOn && fullyOpen ? confusion * CONFUSION.wobbleMax * 0.6 : 0;
  bodyGroup.setAttribute(
    'transform',
    `translate(${(Math.random() - 0.5) * bodyWobble}, ${(Math.random() - 0.5) * bodyWobble})`,
  );

  const wakeDrop = gazeOn && openAmount < 1 && !isBlinking
    ? -(1 - openAmount) * EYE_LIFE.pupilDropPx
    : 0;

  applySharedGaze(
    eyeState,
    gaze,
    browLift,
    browWobble,
    openAmount,
    effectiveOpenAmount,
    wakeDrop,
    lidCoverage,
    isBlinking,
  );
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

function applySharedGaze(
  eyeState,
  gaze,
  browLift,
  browWobble,
  openAmount,
  effectiveOpenAmount,
  wakeDrop,
  lidCoverage,
  isBlinking,
) {
  const { elements, preset, pupilScale } = eyeState;
  const sides = preset.mono ? ['left'] : ['left', 'right'];
  const facialOpenness = isBlinking ? 1 : openAmount;

  for (const id of sides) {
    const eye = elements[id];
    const dims = getEyeDims(preset, id);
    const px = gaze.x;
    const py = gaze.y + wakeDrop;
    eye.pupilGroup.setAttribute('transform', `translate(${px}, ${py})`);

    if (isBlinking && openAmount > 0.02) {
      updatePupilStyle(eye, preset, dims.pupilR, pupilScale);
      eye.pupilGroup.setAttribute('opacity', '1');
    } else if (effectiveOpenAmount > 0.02) {
      updatePupilStyle(eye, preset, dims.pupilR, pupilScale);
      eye.pupilGroup.setAttribute(
        'opacity',
        lidCoverage < 0.98
          ? String(Math.max(effectiveOpenAmount - lidCoverage * 0.5, 0))
          : '1',
      );
    } else {
      eye.pupilGroup.setAttribute('opacity', '0');
    }

    setTopLid(eye.topLid, dims, lidCoverage);

    updateLashes(eye.lashes, preset, dims, facialOpenness);
    const sideWobble = id === 'left' ? browWobble : -browWobble * 0.7;
    updateBrow(eye.brow, preset, id, dims, browLift, sideWobble, facialOpenness);
  }
}
