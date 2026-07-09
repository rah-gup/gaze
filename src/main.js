import { TARGET_LERP, TARGET_LERP_REDUCED } from './constants.js';
import { EYE_PRESETS } from './eyePresets.js';
import { createEyes, updateEyes, applyPreset } from './eyes.js';
import { initFaceDetector, startCamera, detectFace, initMouseTracking, setMouseTrackingEnabled } from './tracking.js';

const cameraBtn = document.getElementById('camera-btn');
const startSection = document.getElementById('start-section');
const demoSection = document.getElementById('demo-section');
const fallbackNotice = document.getElementById('fallback-notice');
const gazeToggle = document.getElementById('gaze-toggle');
const video = document.getElementById('webcam');
const eyesContainer = document.getElementById('eyes-container');
const presetPrev = document.getElementById('preset-prev');
const presetNext = document.getElementById('preset-next');
const presetLabel = document.getElementById('preset-label');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const target = { x: 200, y: 100 };
const rawTarget = { x: 200, y: 100 };
let gazeOn = true;
let eyeState = null;
let lastVideoTime = -1;
let lastFaceSeenAt = 0;
let usingCamera = false;
let presetIndex = 0;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function showDemo(useMouseFallback) {
  startSection.classList.add('hidden');
  demoSection.classList.remove('hidden');
  fallbackNotice.classList.toggle('hidden', !useMouseFallback);
  eyeState = createEyes(eyesContainer, EYE_PRESETS[presetIndex]);
  initPresetCarousel();
  gazeToggle.addEventListener('change', () => {
    gazeOn = gazeToggle.checked;
    gazeToggle.nextElementSibling.textContent = gazeOn ? 'Gaze cue on' : 'Gaze cue off';
  });
  loop();
}

function initPresetCarousel() {
  presetLabel.textContent = EYE_PRESETS[presetIndex].label;

  presetPrev.addEventListener('click', () => {
    presetIndex = (presetIndex - 1 + EYE_PRESETS.length) % EYE_PRESETS.length;
    applyPreset(eyeState, EYE_PRESETS[presetIndex]);
    presetLabel.textContent = EYE_PRESETS[presetIndex].label;
  });

  presetNext.addEventListener('click', () => {
    presetIndex = (presetIndex + 1) % EYE_PRESETS.length;
    applyPreset(eyeState, EYE_PRESETS[presetIndex]);
    presetLabel.textContent = EYE_PRESETS[presetIndex].label;
  });
}

function onRawTarget({ x, y }) {
  rawTarget.x = x;
  rawTarget.y = y;
}

async function handleCameraStart() {
  cameraBtn.disabled = true;
  cameraBtn.textContent = 'Starting…';

  try {
    await initFaceDetector();
    await startCamera(video);
    usingCamera = true;
    initMouseTracking(onRawTarget);
    showDemo(false);
  } catch (err) {
    console.warn('Camera unavailable, falling back to mouse', err);
    initMouseTracking(onRawTarget);
    onRawTarget({ x: 200, y: 100 });
    showDemo(true);
  }
}

function loop() {
  const now = performance.now();
  const lerpFactor = reducedMotion ? TARGET_LERP_REDUCED : TARGET_LERP;

  if (video.srcObject && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const face = detectFace(video, now);
    if (face) {
      lastFaceSeenAt = now;
      setMouseTrackingEnabled(false);
      onRawTarget({ x: face.x, y: face.y });
    } else if (usingCamera && now - lastFaceSeenAt > 300) {
      setMouseTrackingEnabled(true);
    }
  }

  target.x = lerp(target.x, rawTarget.x, lerpFactor);
  target.y = lerp(target.y, rawTarget.y, lerpFactor);

  updateEyes(eyeState, {
    targetX: target.x,
    targetY: target.y,
    gazeOn,
    reducedMotion,
    now,
  });

  requestAnimationFrame(loop);
}

cameraBtn.addEventListener('click', handleCameraStart);
