import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';
import { getSvgDimensions } from './agentBody.js';

let faceLandmarker = null;
let mouseEnabled = true;

// Nose tip — stable anchor for gaze direction
const NOSE_TIP = 1;

export function setMouseTrackingEnabled(enabled) {
  mouseEnabled = enabled;
}

export async function initFaceDetector() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return true;
}

export function detectFace(videoEl, timestampMs) {
  if (!faceLandmarker || videoEl.readyState < 2) return null;

  const result = faceLandmarker.detectForVideo(videoEl, timestampMs);
  if (!result.faceLandmarks.length) return null;

  const nose = result.faceLandmarks[0][NOSE_TIP];
  const videoW = videoEl.videoWidth;
  const videoH = videoEl.videoHeight;
  const { w: svgW, h: svgH } = getSvgDimensions();

  return {
    x: (1 - nose.x) * svgW,
    y: nose.y * svgH,
  };
}

export function initMouseTracking(onMove) {
  window.addEventListener('pointermove', (e) => {
    if (!mouseEnabled) return;

    const container = document.getElementById('eyes-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const { w: svgW, h: svgH } = getSvgDimensions();
    const x = ((e.clientX - rect.left) / rect.width) * svgW;
    const y = ((e.clientY - rect.top) / rect.height) * svgH;
    onMove({ x, y, source: 'mouse' });
  });
}
