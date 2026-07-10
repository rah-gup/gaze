import { EYE } from './constants.js';

const NS = 'http://www.w3.org/2000/svg';

export function createAgentLayers() {
  const earsGroup = document.createElementNS(NS, 'g');
  earsGroup.setAttribute('class', 'agent-ears');

  const leftEar = document.createElementNS(NS, 'path');
  leftEar.setAttribute('class', 'ear-shape');
  leftEar.setAttribute('d', LEFT_EAR);
  const rightEar = document.createElementNS(NS, 'path');
  rightEar.setAttribute('class', 'ear-shape');
  rightEar.setAttribute('d', RIGHT_EAR);
  earsGroup.appendChild(leftEar);
  earsGroup.appendChild(rightEar);

  const bodyGroup = document.createElementNS(NS, 'g');
  bodyGroup.setAttribute('class', 'agent-body');

  const bodyShape = document.createElementNS(NS, 'path');
  bodyShape.setAttribute('class', 'body-shape');
  bodyShape.setAttribute('d', BODY_SHAPE);
  bodyGroup.appendChild(bodyShape);

  const hairGroup = document.createElementNS(NS, 'g');
  hairGroup.setAttribute('class', 'hair');
  for (const strand of HAIR_STRANDS) {
    const line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'body-outline');
    line.setAttribute('d', strand);
    hairGroup.appendChild(line);
  }

  return { bodyGroup, earsGroup, hairGroup };
}

// Control points stay inside viewBox (0–280) so the waist curves are not clipped.
const BODY_SHAPE = 'M 56 108 Q 8 295, 20 508 L 260 508 Q 272 295, 224 108 Q 140 24, 56 108 Z';

// Closed ear bumps overlapping the head edge so they read as attached, not floating.
const LEFT_EAR = 'M 50 130 C 40 130, 32 140, 32 154 C 32 168, 40 174, 50 172 Z';
const RIGHT_EAR = 'M 230 130 C 240 130, 248 140, 248 154 C 248 168, 240 174, 230 172 Z';

const HAIR_STRANDS = [
  'M 128 60 Q 124 44, 126 30',
  'M 140 56 Q 140 38, 140 24',
  'M 152 60 Q 156 44, 154 30',
];

export function getSvgDimensions() {
  return { w: EYE.viewBox.w, h: EYE.viewBox.h };
}

export function getFaceCenter() {
  return {
    x: EYE.viewBox.w / 2,
    y: EYE.faceCenterY,
  };
}
