export const COLORS = {
  bg: '#ffffff',
  fg: '#111111',
};

export const EYE = {
  viewBox: { w: 280, h: 520 },
  faceCenterY: 120,
};

export const GAZE = {
  range: 110,
  maxOffset: 8,
  centerDeadzone: 6,
};

export const TARGET_LERP = 0.38;
export const PUPIL_LERP = 0.48;
export const TARGET_LERP_REDUCED = 0.14;
export const PUPIL_LERP_REDUCED = 0.18;

export const EYE_LIFE = {
  wakeMs: 500,
  sleepMs: 500,
  blinkCloseMs: 380,
  blinkOpenMs: 380,
  pupilDropPx: 6,
  idleBlinkMs: 7000,
};

export const IDLE = {
  amplitude: 1.5,
  frequency: 0.001,
};

export const GAZE_OFF_OFFSET = { x: -4, y: 5 };

// Fast head movement → pupils shrink after sustained movement (cartoon "confused" effect)
export const CONFUSION = {
  speedThreshold: 0.1,
  sustainMs: 1000,
  rampMs: 600,
  decayMs: 1000,
  minPupilScale: 0.32,
  shrinkLerp: 0.22,
  recoverLerp: 0.06,
  wobbleMax: 1.8,
  browLiftMax: 5,
  speedStaleMs: 150,
};
