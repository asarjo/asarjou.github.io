// Webcam + MediaPipe pose landmarker. All processing happens in the browser;
// no video ever leaves the device.

const MP_VERSION = '0.10.21';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

export class Tracker {
  constructor() {
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.setAttribute('playsinline', '');
    this.ready = false;
    this.poses = [];
    this.lastVideoTime = -1;
    this.numPoses = 1;
    this.loading = null;
  }

  get active() { return !!this.stream; }

  async startCamera() {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot access a camera. Try Chrome, Edge, Firefox or Safari over https.');
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
  }

  loadModel() {
    if (!this.loading) {
      this.loading = (async () => {
        const vision = await import(/* webpackIgnore: true */ `${CDN}/vision_bundle.mjs`);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
        const opts = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'VIDEO',
          numPoses: this.numPoses,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        try {
          this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('GPU'));
        } catch (e) {
          console.warn('GPU pose model unavailable, falling back to CPU', e);
          this.landmarker = await vision.PoseLandmarker.createFromOptions(fileset, opts('CPU'));
        }
        this.ready = true;
      })();
      this.loading.catch(() => { this.loading = null; });
    }
    return this.loading;
  }

  async setNumPoses(n) {
    this.numPoses = n;
    if (this.landmarker) await this.landmarker.setOptions({ numPoses: n });
  }

  get aspect() {
    return (this.video.videoWidth || 4) / (this.video.videoHeight || 3);
  }

  // Returns detected poses sorted left-to-right as seen on screen.
  detect() {
    if (!this.ready || this.video.readyState < 2) return this.poses;
    if (this.video.currentTime === this.lastVideoTime) return this.poses;
    this.lastVideoTime = this.video.currentTime;
    try {
      const res = this.landmarker.detectForVideo(this.video, performance.now());
      this.poses = (res.landmarks || [])
        .map((lm) => ({ lm, cx: 1 - (lm[23].x + lm[24].x) / 2 }))
        .sort((a, b) => a.cx - b.cx);
    } catch (e) {
      console.warn('Pose detection failed', e);
    }
    return this.poses;
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.poses = [];
  }

  // Mirrored camera image with each dancer's skeleton on top.
  drawPreview(canvas, colors) {
    const v = this.video;
    if (!v.videoWidth) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Cover-fit the video, mirrored.
    const va = v.videoWidth / v.videoHeight, ca = w / h;
    let dw = w, dh = h, dx = 0, dy = 0;
    if (va > ca) { dw = h * va; dx = (w - dw) / 2; } else { dh = w / va; dy = (h - dh) / 2; }
    g.save();
    g.translate(w, 0); g.scale(-1, 1);
    g.drawImage(v, w - dx - dw, dy, dw, dh);
    g.restore();
    g.fillStyle = 'rgba(10,0,30,0.25)';
    g.fillRect(0, 0, w, h);
    this.poses.forEach((p, i) => {
      const col = colors[i % colors.length];
      const P = (k) => [dx + (1 - p.lm[k].x) * dw, dy + p.lm[k].y * dh, p.lm[k].visibility ?? 1];
      g.strokeStyle = col; g.fillStyle = col;
      g.lineWidth = Math.max(2, w / 110); g.lineCap = 'round';
      for (const [a, b] of BONES) {
        const A = P(a), B = P(b);
        if (A[2] < 0.5 || B[2] < 0.5) continue;
        g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
      }
      const nose = P(0);
      if (nose[2] > 0.5) { g.beginPath(); g.arc(nose[0], nose[1], Math.max(4, w / 40), 0, Math.PI * 2); g.stroke(); }
    });
  }
}
