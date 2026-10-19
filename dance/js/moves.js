// Move library. Every move lasts one bar (4 beats) and is a list of
// [beatOffset, pose] keyframes. The keyframe at `picto` (default 0) is the key
// pose shown on the pictogram and is what the dancer hits on the downbeat.
import { pose as P, armIK } from './body.js';

// Arm shapes as [upper, fore] angles.
const DN = [8, 4];
const LOW = [35, 30];
const OUT = [90, 90];
const OUT_UP = [100, 105];
const V = [140, 142];
const UP = [172, 178];
const ROOF_LO = [80, 172];
const ROOF_HI = [150, 168];
const FLEX = [90, 180];

// Hand targets resolved with IK (x outward from midline, y from neck base).
const CLAP_HI = armIK(0.02, -0.25);
const CLAP_CH = armIK(0.02, 0.1);
const HEART = armIK(0.03, 0.05);
const HIP = armIK(0.11, 0.27);
const HEAD = armIK(0.05, -0.11);
const FIST_CH = armIK(0.07, 0.1);
const SNAP = armIK(0.06, 0.2);
const CROSS = armIK(-0.12, 0.26);

const FEET_WIDE = { lf: [-0.15, 0], rf: [0.15, 0] };

const mv = (name, kf, extra = {}) => ({ name, beats: 4, kf, ...extra });

export const MOVES = {
  groove: mv('Warm Up', [
    [0, P({ hy: 0.035, la: SNAP, ra: SNAP, head: -4, hx: -0.015 })],
    [0.5, P({ hy: 0.012, la: [18, -25], ra: [18, -25] })],
    [1, P({ hy: 0.035, la: SNAP, ra: SNAP, head: 4, hx: 0.015 })],
    [1.5, P({ hy: 0.012, la: [18, -25], ra: [18, -25] })],
    [2, P({ hy: 0.035, la: SNAP, ra: SNAP, head: -4, hx: -0.015 })],
    [2.5, P({ hy: 0.012, la: [18, -25], ra: [18, -25] })],
    [3, P({ hy: 0.035, la: SNAP, ra: SNAP, head: 4, hx: 0.015 })],
    [3.5, P({ hy: 0.012, la: [18, -25], ra: [18, -25] })],
  ], { scored: false }),

  clapHigh: mv('Sky Clap', [
    [0, P({ hy: 0.01, la: CLAP_HI, ra: CLAP_HI })],
    [1, P({ hy: 0.045, la: V, ra: V })],
    [2, P({ hy: 0.01, la: CLAP_HI, ra: CLAP_HI })],
    [3, P({ hy: 0.045, la: V, ra: V })],
  ]),

  discoPoint: mv('Disco Point', [
    [0, P({ ra: [148, 150], la: HIP, hx: 0.03, lean: -4, hy: 0.02, rf: [0.11, 0], head: -8 })],
    [1, P({ ra: [-28, -32], la: HIP, hx: -0.02, lean: 4, hy: 0.045, rf: [0.09, 0], head: 4 })],
    [2, P({ ra: [148, 150], la: HIP, hx: 0.03, lean: -4, hy: 0.02, rf: [0.11, 0], head: -8 })],
    [3, P({ ra: [-28, -32], la: HIP, hx: -0.02, lean: 4, hy: 0.045, rf: [0.09, 0], head: 4 })],
  ]),

  stepClap: mv('Step & Clap', [
    [0, P({ hx: 0.08, lf: [0.02, 0], rf: [0.15, 0], la: CLAP_CH, ra: CLAP_CH, hy: 0.035, lean: 3 })],
    [1, P({ hx: 0.0, lf: [-0.07, 0.03], rf: [0.12, 0], la: LOW, ra: LOW, hy: 0.012 })],
    [2, P({ hx: -0.08, lf: [-0.15, 0], rf: [-0.02, 0], la: CLAP_CH, ra: CLAP_CH, hy: 0.035, lean: -3 })],
    [3, P({ hx: 0.0, lf: [-0.12, 0], rf: [0.07, 0.03], la: LOW, ra: LOW, hy: 0.012 })],
  ]),

  armRoll: mv('Roll It Up', [
    [0, P({ la: [150, 160], ra: [150, 160], hy: 0.0 })],
    [1, P({ la: [28, -95], ra: [38, -70], hy: 0.045 })],
    [1.5, P({ la: [38, -70], ra: [28, -95], hy: 0.03 })],
    [2, P({ la: [28, -95], ra: [38, -70], hy: 0.045 })],
    [2.5, P({ la: [38, -70], ra: [28, -95], hy: 0.03 })],
    [3, P({ la: [28, -95], ra: [38, -70], hy: 0.045 })],
    [3.5, P({ la: [38, -70], ra: [28, -95], hy: 0.03 })],
  ]),

  raiseRoof: mv('Raise the Roof', [
    [0, P({ la: ROOF_HI, ra: ROOF_HI, hy: 0.01, head: -5 })],
    [0.5, P({ la: ROOF_LO, ra: ROOF_LO, hy: 0.045 })],
    [1, P({ la: ROOF_HI, ra: ROOF_HI, hy: 0.01, head: 5 })],
    [1.5, P({ la: ROOF_LO, ra: ROOF_LO, hy: 0.045 })],
    [2, P({ la: ROOF_HI, ra: ROOF_HI, hy: 0.01, head: -5 })],
    [2.5, P({ la: ROOF_LO, ra: ROOF_LO, hy: 0.045 })],
    [3, P({ la: ROOF_HI, ra: ROOF_HI, hy: 0.01, head: 5 })],
    [3.5, P({ la: ROOF_LO, ra: ROOF_LO, hy: 0.045 })],
  ]),

  wave: mv('Body Wave', [
    [0, P({ la: [102, 132], ra: [78, 52], lean: -7, hx: -0.03, head: -6, hy: 0.03 })],
    [1, P({ la: [78, 52], ra: [102, 132], lean: 7, hx: 0.03, head: 6, hy: 0.03 })],
    [2, P({ la: [102, 132], ra: [78, 52], lean: -7, hx: -0.03, head: -6, hy: 0.03 })],
    [3, P({ la: [78, 52], ra: [102, 132], lean: 7, hx: 0.03, head: 6, hy: 0.03 })],
  ]),

  fistPump: mv('Fist Pump', [
    [0, P({ ra: [160, 166], la: HIP, hy: 0.01, lean: -3 })],
    [0.5, P({ ra: [95, 168], la: HIP, hy: 0.045, lean: -1 })],
    [1, P({ ra: [160, 166], la: HIP, hy: 0.01, lean: -3 })],
    [1.5, P({ ra: [95, 168], la: HIP, hy: 0.045, lean: -1 })],
    [2, P({ ra: [160, 166], la: HIP, hy: 0.01, lean: -3 })],
    [2.5, P({ ra: [95, 168], la: HIP, hy: 0.045, lean: -1 })],
    [3, P({ ra: [160, 166], la: HIP, hy: 0.01, lean: -3 })],
    [3.5, P({ ra: [95, 168], la: HIP, hy: 0.045, lean: -1 })],
  ], { arrow: [0.5, 1] }),

  hipSway: mv('Hip Sway', [
    [0, P({ hx: 0.06, lean: -6, la: HIP, ra: HIP, head: -6, hy: 0.035, lf: [-0.1, 0], rf: [0.1, 0] })],
    [1, P({ hx: -0.06, lean: 6, la: HIP, ra: HIP, head: 6, hy: 0.035, lf: [-0.1, 0], rf: [0.1, 0] })],
    [2, P({ hx: 0.06, lean: -6, la: HIP, ra: HIP, head: -6, hy: 0.035, lf: [-0.1, 0], rf: [0.1, 0] })],
    [3, P({ hx: -0.06, lean: 6, la: HIP, ra: HIP, head: 6, hy: 0.035, lf: [-0.1, 0], rf: [0.1, 0] })],
  ]),

  starJump: mv('Star Jump', [
    [0, P({ hy: -0.08, la: [142, 142], ra: [142, 142], lf: [-0.21, 0], rf: [0.21, 0] })],
    [0.5, P({ hy: 0.06, la: [60, 60], ra: [60, 60], lf: [-0.18, 0], rf: [0.18, 0] })],
    [1, P({ hy: 0.075, la: [22, 12], ra: [22, 12] })],
    [2, P({ hy: -0.08, la: [142, 142], ra: [142, 142], lf: [-0.21, 0], rf: [0.21, 0] })],
    [2.5, P({ hy: 0.06, la: [60, 60], ra: [60, 60], lf: [-0.18, 0], rf: [0.18, 0] })],
    [3, P({ hy: 0.075, la: [22, 12], ra: [22, 12] })],
  ]),

  lasso: mv('Lasso', [
    [0, P({ ra: [155, 130], la: HIP, hy: 0.03, hx: 0.02 })],
    [0.5, P({ ra: [162, 180], la: HIP, hy: 0.012, hx: 0.0 })],
    [1, P({ ra: [155, 232], la: HIP, hy: 0.03, hx: -0.02 })],
    [1.5, P({ ra: [162, 180], la: HIP, hy: 0.012, hx: 0.0 })],
    [2, P({ ra: [155, 130], la: HIP, hy: 0.03, hx: 0.02 })],
    [2.5, P({ ra: [162, 180], la: HIP, hy: 0.012, hx: 0.0 })],
    [3, P({ ra: [155, 232], la: HIP, hy: 0.03, hx: -0.02 })],
    [3.5, P({ ra: [162, 180], la: HIP, hy: 0.012, hx: 0.0 })],
  ], { arrow: [0, 1] }),

  windmill: mv('Windmill', [
    [0, P({ la: UP, ra: [14, 8], lean: 4, hy: 0.02 })],
    [1, P({ la: OUT, ra: OUT, hy: 0.045 })],
    [2, P({ la: [14, 8], ra: UP, lean: -4, hy: 0.02 })],
    [3, P({ la: OUT, ra: OUT, hy: 0.045 })],
  ]),

  robot: mv('Robot', [
    [0, P({ la: FLEX, ra: [90, 0], head: -10 })],
    [1, P({ la: [90, 0], ra: FLEX, head: 10 })],
    [2, P({ la: [6, 96], ra: [6, 96], head: 0, hy: 0.035 })],
    [3, P({ la: OUT, ra: OUT, head: 0, hy: 0.01 })],
  ], { ease: 'snap' }),

  heartHands: mv('Heart Hands', [
    [0, P({ la: HEART, ra: HEART, head: -8, lean: -4, hy: 0.02, hx: -0.02 })],
    [1, P({ la: HEART, ra: HEART, head: 8, lean: 4, hy: 0.04, hx: 0.02 })],
    [2, P({ la: HEART, ra: HEART, head: -8, lean: -4, hy: 0.02, hx: -0.02 })],
    [3, P({ la: OUT_UP, ra: OUT_UP, head: 0, lean: 0, hy: 0.04 })],
  ]),

  crossOpen: mv('X Out', [
    [0, P({ la: V, ra: V, hy: 0.0, ...FEET_WIDE })],
    [1, P({ la: CROSS, ra: CROSS, hy: 0.06, ...FEET_WIDE })],
    [2, P({ la: V, ra: V, hy: 0.0, ...FEET_WIDE })],
    [3, P({ la: CROSS, ra: CROSS, hy: 0.06, ...FEET_WIDE })],
  ]),

  kneeTouch: mv('Knee Lift', [
    [0, P({ rf: [0.2, 0.19], ra: [28, 30], la: OUT, hx: -0.02, lean: -3 })],
    [1, P({ hy: 0.04, la: LOW, ra: LOW })],
    [2, P({ lf: [-0.2, 0.19], la: [28, 30], ra: OUT, hx: 0.02, lean: 3 })],
    [3, P({ hy: 0.04, la: LOW, ra: LOW })],
  ]),

  shimmy: mv('Shoulder Shimmy', [
    [0, P({ lean: 6, la: [48, 112], ra: [34, 88], hy: 0.045, ...FEET_WIDE })],
    [0.5, P({ lean: -6, la: [34, 88], ra: [48, 112], hy: 0.045, ...FEET_WIDE })],
    [1, P({ lean: 6, la: [48, 112], ra: [34, 88], hy: 0.045, ...FEET_WIDE })],
    [1.5, P({ lean: -6, la: [34, 88], ra: [48, 112], hy: 0.045, ...FEET_WIDE })],
    [2, P({ lean: 6, la: [48, 112], ra: [34, 88], hy: 0.045, ...FEET_WIDE })],
    [2.5, P({ lean: -6, la: [34, 88], ra: [48, 112], hy: 0.045, ...FEET_WIDE })],
    [3, P({ lean: 6, la: [48, 112], ra: [34, 88], hy: 0.045, ...FEET_WIDE })],
    [3.5, P({ lean: -6, la: [34, 88], ra: [48, 112], hy: 0.045, ...FEET_WIDE })],
  ], { arrow: false }),

  airGuitar: mv('Air Guitar', [
    [0, P({ la: [75, 125], ra: armIK(0.0, 0.24), lean: -6, hy: 0.06, head: -10, lf: [-0.13, 0], rf: [0.13, 0] })],
    [0.5, P({ la: [75, 125], ra: armIK(0.08, 0.12), lean: -5, hy: 0.04, head: -6, lf: [-0.13, 0], rf: [0.13, 0] })],
    [1, P({ la: [75, 125], ra: armIK(0.0, 0.24), lean: -6, hy: 0.06, head: -10, lf: [-0.13, 0], rf: [0.13, 0] })],
    [1.5, P({ la: [75, 125], ra: armIK(0.08, 0.12), lean: -5, hy: 0.04, head: -6, lf: [-0.13, 0], rf: [0.13, 0] })],
    [2, P({ la: [75, 125], ra: armIK(0.0, 0.24), lean: -6, hy: 0.06, head: -10, lf: [-0.13, 0], rf: [0.13, 0] })],
    [2.5, P({ la: [75, 125], ra: armIK(0.08, 0.12), lean: -5, hy: 0.04, head: -6, lf: [-0.13, 0], rf: [0.13, 0] })],
    [3, P({ la: [120, 150], ra: [150, 160], lean: 0, hy: 0.01, head: 0, lf: [-0.13, 0], rf: [0.13, 0] })],
  ], { arrow: [0.5, 1] }),

  rainbow: mv('Rainbow', [
    [0, P({ la: UP, ra: UP, hy: 0.0 })],
    [1, P({ la: [96, 96], ra: [265, 265], lean: -8, hx: -0.04, hy: 0.04 })],
    [2, P({ la: UP, ra: UP, hy: 0.0 })],
    [3, P({ la: [265, 265], ra: [96, 96], lean: 8, hx: 0.04, hy: 0.04 })],
  ]),

  jumpClap: mv('Jump Clap', [
    [0, P({ hy: -0.07, la: CLAP_HI, ra: CLAP_HI })],
    [0.5, P({ hy: 0.065, la: [30, 20], ra: [30, 20] })],
    [1, P({ hy: 0.075, la: [22, 10], ra: [22, 10] })],
    [2, P({ hy: -0.07, la: CLAP_HI, ra: CLAP_HI })],
    [2.5, P({ hy: 0.065, la: [30, 20], ra: [30, 20] })],
    [3, P({ hy: 0.075, la: [22, 10], ra: [22, 10] })],
  ]),

  drive: mv('Steering Wheel', [
    [0, P({ la: armIK(0.09, 0.08), ra: armIK(0.09, 0.19), lean: -5, hy: 0.035, head: -6 })],
    [1, P({ la: armIK(0.09, 0.19), ra: armIK(0.09, 0.08), lean: 5, hy: 0.035, head: 6 })],
    [2, P({ la: armIK(0.09, 0.08), ra: armIK(0.09, 0.19), lean: -5, hy: 0.035, head: -6 })],
    [3, P({ la: armIK(0.09, 0.19), ra: armIK(0.09, 0.08), lean: 5, hy: 0.035, head: 6 })],
  ]),

  twist: mv('The Twist', [
    [0, P({ hy: 0.075, hx: 0.035, la: [42, -22], ra: [62, 100], lean: -6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [0.5, P({ hy: 0.06, hx: -0.035, la: [62, 100], ra: [42, -22], lean: 6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [1, P({ hy: 0.075, hx: 0.035, la: [42, -22], ra: [62, 100], lean: -6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [1.5, P({ hy: 0.06, hx: -0.035, la: [62, 100], ra: [42, -22], lean: 6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [2, P({ hy: 0.075, hx: 0.035, la: [42, -22], ra: [62, 100], lean: -6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [2.5, P({ hy: 0.06, hx: -0.035, la: [62, 100], ra: [42, -22], lean: 6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [3, P({ hy: 0.075, hx: 0.035, la: [42, -22], ra: [62, 100], lean: -6, lf: [-0.1, 0], rf: [0.1, 0] })],
    [3.5, P({ hy: 0.06, hx: -0.035, la: [62, 100], ra: [42, -22], lean: 6, lf: [-0.1, 0], rf: [0.1, 0] })],
  ], { arrow: [0.5, 1] }),

  sprinkler: mv('Sprinkler', [
    [0, P({ la: HEAD, ra: [100, 100], lean: 3, hy: 0.03 })],
    [0.5, P({ la: HEAD, ra: [86, 86], lean: 2, hy: 0.03 })],
    [1, P({ la: HEAD, ra: [72, 72], lean: 1, hy: 0.03 })],
    [1.5, P({ la: HEAD, ra: [58, 58], lean: 0, hy: 0.03 })],
    [2, P({ la: HEAD, ra: [100, 100], lean: 3, hy: 0.03 })],
    [2.5, P({ la: HEAD, ra: [86, 86], lean: 2, hy: 0.03 })],
    [3, P({ la: HEAD, ra: [72, 72], lean: 1, hy: 0.03 })],
    [3.5, P({ la: HEAD, ra: [58, 58], lean: 0, hy: 0.03 })],
  ], { ease: 'snap', arrow: [0, 1.5] }),

  flap: mv('Flap Wings', [
    [0, P({ la: [72, -112], ra: [72, -112], hy: 0.03, head: -6 })],
    [0.5, P({ la: [36, -142], ra: [36, -142], hy: 0.055 })],
    [1, P({ la: [72, -112], ra: [72, -112], hy: 0.03, head: 6 })],
    [1.5, P({ la: [36, -142], ra: [36, -142], hy: 0.055 })],
    [2, P({ la: [72, -112], ra: [72, -112], hy: 0.03, head: -6 })],
    [2.5, P({ la: [36, -142], ra: [36, -142], hy: 0.055 })],
    [3, P({ la: [72, -112], ra: [72, -112], hy: 0.03, head: 6 })],
    [3.5, P({ la: [36, -142], ra: [36, -142], hy: 0.055 })],
  ], { arrow: [0.5, 1] }),

  punches: mv('Side Punches', [
    [0, P({ ra: [92, 92], la: FIST_CH, lean: -4, hx: -0.02, hy: 0.03 })],
    [0.5, P({ ra: FIST_CH, la: FIST_CH, lean: 0, hy: 0.045 })],
    [1, P({ la: [92, 92], ra: FIST_CH, lean: 4, hx: 0.02, hy: 0.03 })],
    [1.5, P({ ra: FIST_CH, la: FIST_CH, lean: 0, hy: 0.045 })],
    [2, P({ ra: [92, 92], la: FIST_CH, lean: -4, hx: -0.02, hy: 0.03 })],
    [2.5, P({ ra: FIST_CH, la: FIST_CH, lean: 0, hy: 0.045 })],
    [3, P({ la: [92, 92], ra: FIST_CH, lean: 4, hx: 0.02, hy: 0.03 })],
    [3.5, P({ ra: FIST_CH, la: FIST_CH, lean: 0, hy: 0.045 })],
  ], { ease: 'snap' }),

  march: mv('March & Pump', [
    [0, P({ rf: [0.09, 0.09], la: [150, 156], ra: [16, 10], hy: 0.01 })],
    [1, P({ lf: [-0.09, 0.09], ra: [150, 156], la: [16, 10], hy: 0.01 })],
    [2, P({ rf: [0.09, 0.09], la: [150, 156], ra: [16, 10], hy: 0.01 })],
    [3, P({ lf: [-0.09, 0.09], ra: [150, 156], la: [16, 10], hy: 0.01 })],
  ]),

  surf: mv('Surf', [
    [0, P({ lf: [-0.18, 0], rf: [0.18, 0], hy: 0.085, la: [72, 74], ra: [112, 114], lean: -9, hx: -0.02 })],
    [1, P({ lf: [-0.18, 0], rf: [0.18, 0], hy: 0.06, la: [90, 90], ra: [90, 90], lean: 0 })],
    [2, P({ lf: [-0.18, 0], rf: [0.18, 0], hy: 0.085, la: [112, 114], ra: [72, 74], lean: 9, hx: 0.02 })],
    [3, P({ lf: [-0.18, 0], rf: [0.18, 0], hy: 0.06, la: [90, 90], ra: [90, 90], lean: 0 })],
  ]),

  pulse: mv('Pulse Out', [
    [0, P({ la: OUT, ra: OUT, hy: 0.015 })],
    [0.5, P({ la: [78, 128], ra: [78, 128], hy: 0.05 })],
    [1, P({ la: OUT, ra: OUT, hy: 0.015 })],
    [1.5, P({ la: [78, 128], ra: [78, 128], hy: 0.05 })],
    [2, P({ la: OUT, ra: OUT, hy: 0.015 })],
    [2.5, P({ la: [78, 128], ra: [78, 128], hy: 0.05 })],
    [3, P({ la: OUT, ra: OUT, hy: 0.015 })],
    [3.5, P({ la: [78, 128], ra: [78, 128], hy: 0.05 })],
  ], { arrow: [0.5, 1] }),

  // Gold moves: one big held pose with a wind-up in the last beat.
  starPose: mv('Star Pose', [
    [0, P({ ra: [145, 146], la: [36, 36], lean: -8, hx: -0.03, lf: [-0.15, 0], rf: [0.1, 0], head: -10, hy: 0.02 })],
    [2, P({ ra: [148, 150], la: [34, 34], lean: -9, hx: -0.03, lf: [-0.15, 0], rf: [0.1, 0], head: -12, hy: 0.025 })],
    [3, P({ la: armIK(-0.04, 0.2), ra: armIK(-0.04, 0.2), hy: 0.065 })],
  ], { gold: true }),

  victory: mv('Victory Jump', [
    [0, P({ hy: -0.075, la: V, ra: V, lf: [-0.17, 0], rf: [0.17, 0] })],
    [0.6, P({ hy: 0.02, la: [145, 146], ra: [145, 146], lf: [-0.17, 0], rf: [0.17, 0] })],
    [2.5, P({ hy: 0.025, la: [146, 147], ra: [146, 147], lf: [-0.17, 0], rf: [0.17, 0] })],
    [3.25, P({ hy: 0.085, la: SNAP, ra: SNAP })],
  ], { gold: true }),

  bigHeart: mv('Big Heart', [
    [0, P({ la: CLAP_HI, ra: CLAP_HI, lean: -7, hx: -0.035, head: -8, lf: [-0.12, 0], rf: [0.12, 0] })],
    [2, P({ la: CLAP_HI, ra: CLAP_HI, lean: -8, hx: -0.04, head: -10, lf: [-0.12, 0], rf: [0.12, 0] })],
    [3, P({ la: HEART, ra: HEART, lean: 0, hy: 0.05 })],
  ], { gold: true }),

  finale: mv('Finale', [
    [0, P({ la: [150, 152], ra: [150, 152], ...FEET_WIDE, hy: 0.0 })],
    [3.5, P({ la: [152, 154], ra: [152, 154], ...FEET_WIDE, hy: 0.01 })],
  ], { arrow: false }),
};

for (const [id, m] of Object.entries(MOVES)) m.id = id;
