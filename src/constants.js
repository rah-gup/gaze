export const COLORS = {
  bg: '#ffffff',
  fg: '#111111',
};

export const EYE = {
  viewBox: { w: 400, h: 200 },
};

// How far the target can be from center before pupils reach max deflection.
// Larger range = subtler, more "looking at you" instead of staring into the distance.
export const GAZE = {
  range: 110,
  maxOffset: 8,
  centerDeadzone: 6,
};

export const TARGET_LERP = 0.22;
export const PUPIL_LERP = 0.32;
export const TARGET_LERP_REDUCED = 0.14;
export const PUPIL_LERP_REDUCED = 0.18;

export const BLINK = {
  minInterval: 3000,
  maxInterval: 7000,
  duration: 120,
};

export const IDLE = {
  amplitude: 1.5,
  frequency: 0.001,
};

export const GAZE_OFF_OFFSET = { x: -4, y: 5 };
