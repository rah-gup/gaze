import { EYE } from './constants.js';

const NS = 'http://www.w3.org/2000/svg';

export function createAgentLayers(svg) {
  const earsGroup = document.createElementNS(NS, 'g');
  earsGroup.setAttribute('class', 'agent-ears');

  const leftEar = document.createElementNS(NS, 'path');
  leftEar.setAttribute('class', 'body-outline');
  leftEar.setAttribute('d', LEFT_EAR);
  const rightEar = document.createElementNS(NS, 'path');
  rightEar.setAttribute('class', 'body-outline');
  rightEar.setAttribute('d', RIGHT_EAR);
  earsGroup.appendChild(leftEar);
  earsGroup.appendChild(rightEar);
  svg.appendChild(earsGroup);

  const bodyGroup = document.createElementNS(NS, 'g');
  bodyGroup.setAttribute('class', 'agent-body');

  const bodyFill = document.createElementNS(NS, 'path');
  bodyFill.setAttribute('class', 'body-fill');
  bodyFill.setAttribute('d', BODY_FILL);

  const leftSide = document.createElementNS(NS, 'path');
  leftSide.setAttribute('class', 'body-outline');
  leftSide.setAttribute('d', LEFT_PARABOLA);

  const rightSide = document.createElementNS(NS, 'path');
  rightSide.setAttribute('class', 'body-outline');
  rightSide.setAttribute('d', RIGHT_PARABOLA);

  const topCap = document.createElementNS(NS, 'path');
  topCap.setAttribute('class', 'body-outline');
  topCap.setAttribute('d', TOP_DOME);

  bodyGroup.appendChild(bodyFill);
  bodyGroup.appendChild(leftSide);
  bodyGroup.appendChild(rightSide);
  bodyGroup.appendChild(topCap);
  svg.appendChild(bodyGroup);

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

// Closed fill silhouette; open parabolic outline on top
const BODY_FILL = 'M 56 108 Q -42 295, 20 508 L 260 508 Q 322 295, 224 108 Q 140 24, 56 108 Z';
const TOP_DOME = 'M 56 108 Q 140 24, 224 108';
const LEFT_PARABOLA = 'M 56 108 Q -42 295, 20 508';
const RIGHT_PARABOLA = 'M 224 108 Q 322 295, 260 508';

const LEFT_EAR = 'M 34 148 C 14 148, 6 168, 14 184 C 22 196, 32 188, 38 172';
const RIGHT_EAR = 'M 246 148 C 266 148, 274 168, 266 184 C 258 196, 248 188, 242 172';

// Wisps rooted on the dome crown (~y 56–64)
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
