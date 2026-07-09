import { FaceDetector, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs';

let faceDetector = null;
let mouseEnabled = true;

export function setMouseTrackingEnabled(enabled) {
  mouseEnabled = enabled;
}

export async function initFaceDetector() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
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
  if (!faceDetector || videoEl.readyState < 2) return null;

  const result = faceDetector.detectForVideo(videoEl, timestampMs);
  if (!result.detections.length) return null;

  const box = result.detections[0].boundingBox;
  const videoW = videoEl.videoWidth;
  const videoH = videoEl.videoHeight;
  const svgW = 400;
  const svgH = 200;

  const cx = box.originX + box.width / 2;
  const cy = box.originY + box.height / 2;

  return {
    x: (1 - cx / videoW) * svgW,
    y: (cy / videoH) * svgH,
    faceSize: box.width * box.height,
  };
}

export function initMouseTracking(onMove) {
  window.addEventListener('pointermove', (e) => {
    if (!mouseEnabled) return;

    const container = document.getElementById('eyes-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const svgW = 400;
    const svgH = 200;
    const x = ((e.clientX - rect.left) / rect.width) * svgW;
    const y = ((e.clientY - rect.top) / rect.height) * svgH;
    onMove({ x, y, source: 'mouse' });
  });
}
