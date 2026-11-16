const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const filterSel = document.getElementById("filter");
const delaySel = document.getElementById("delay");
const captionInput = document.getElementById("caption");
const countdownEl = document.getElementById("countdown");
const flashEl = document.getElementById("flash");
const counterEl = document.getElementById("shotCounter");
const errorEl = document.getElementById("error");
const stripCanvas = document.getElementById("strip");
const captureCanvas = document.getElementById("capture");
const fxVignette = document.getElementById("fxVignette");
const fxGrain = document.getElementById("fxGrain");
const fxLeak = document.getElementById("fxLeak");
const vignettePreview = document.getElementById("vignettePreview");
const overlayFile = document.getElementById("overlayFile");
const overlayFit = document.getElementById("overlayFit");
const overlayOpacity = document.getElementById("overlayOpacity");
const opacityVal = document.getElementById("opacityVal");
const overlayClear = document.getElementById("overlayClear");
const overlayPreview = document.getElementById("overlayPreview");

let overlayImg = null; // ảnh filter do người dùng tải lên

const TOTAL_SHOTS = 4;
const PHOTO_W = 600;
const PHOTO_H = 450;
const PAD = 30;
const FOOTER = 130;

let photos = []; // mảng canvas
let frame = { bg: "#ffffff", fg: "#222222" };
let busy = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Camera ----------
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
  } catch (err) {
    errorEl.textContent =
      "Không truy cập được camera. Hãy cho phép quyền camera và mở trang qua HTTPS (GitHub Pages). " +
      "(" + err.name + ")";
    errorEl.classList.remove("hidden");
    startBtn.disabled = true;
  }
}

// ---------- Chụp ----------
function snapPhoto() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  // cắt giữa theo tỉ lệ 4:3
  const targetRatio = PHOTO_W / PHOTO_H;
  let sw = vw, sh = vw / targetRatio;
  if (sh > vh) { sh = vh; sw = vh * targetRatio; }
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const c = document.createElement("canvas");
  c.width = PHOTO_W;
  c.height = PHOTO_H;
  const ctx = c.getContext("2d");

  // lật gương cho giống preview
  ctx.translate(PHOTO_W, 0);
  ctx.scale(-1, 1);
  if ("filter" in ctx) ctx.filter = filterSel.value; // Safari cũ có thể không hỗ trợ
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);

  // các bước sau vẽ bình thường (không lật, không filter)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if ("filter" in ctx) ctx.filter = "none";
  applyEffects(ctx, PHOTO_W, PHOTO_H);
  drawOverlay(ctx, PHOTO_W, PHOTO_H);
  return c;
}

// ---------- Hiệu ứng thêm ----------
function applyEffects(ctx, w, h) {
  if (fxVignette.checked) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  if (fxLeak.checked) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const g = ctx.createLinearGradient(0, 0, w, h * 0.6);
    g.addColorStop(0, "rgba(255,120,40,0.55)");
    g.addColorStop(0.35, "rgba(255,60,120,0.25)");
    g.addColorStop(0.7, "rgba(255,60,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (fxGrain.checked) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 50;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }
}

// ---------- Filter bằng ảnh của người dùng ----------
function drawOverlay(ctx, w, h) {
  if (!overlayImg) return;
  const iw = overlayImg.naturalWidth;
  const ih = overlayImg.naturalHeight;
  const fit = overlayFit.value;
  let dx = 0, dy = 0, dw = w, dh = h;

  if (fit !== "stretch") {
    const scale = fit === "cover" ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
    dw = iw * scale;
    dh = ih * scale;
    dx = (w - dw) / 2;
    dy = (h - dh) / 2;
  }

  ctx.save();
  ctx.globalAlpha = overlayOpacity.value / 100;
  ctx.drawImage(overlayImg, dx, dy, dw, dh);
  ctx.restore();
}

function updateOverlayPreview() {
  if (!overlayImg) {
    overlayPreview.classList.add("hidden");
    return;
  }
  overlayPreview.src = overlayImg.src;
  overlayPreview.style.objectFit =
    overlayFit.value === "cover" ? "cover" : overlayFit.value === "contain" ? "contain" : "fill";
  overlayPreview.style.opacity = overlayOpacity.value / 100;
  overlayPreview.classList.remove("hidden");
}

async function runCountdown(seconds) {
  countdownEl.classList.remove("hidden");
  for (let i = seconds; i > 0; i--) {
    countdownEl.textContent = i;
    await sleep(1000);
  }
  countdownEl.classList.add("hidden");
}

function doFlash() {
  flashEl.classList.remove("on");
  void flashEl.offsetWidth; // restart animation
  flashEl.classList.add("on");
}

async function startSession() {
  if (busy) return;
  busy = true;
  photos = [];
  startBtn.disabled = true;
  downloadBtn.disabled = true;
  resetBtn.disabled = true;
  clearStrip();
  counterEl.classList.remove("hidden");

  const delay = parseInt(delaySel.value, 10);
  for (let i = 1; i <= TOTAL_SHOTS; i++) {
    counterEl.textContent = `${i} / ${TOTAL_SHOTS}`;
    await runCountdown(delay);
    doFlash();
    photos.push(snapPhoto());
    drawStrip();
    await sleep(700);
  }

  counterEl.classList.add("hidden");
  busy = false;
  startBtn.disabled = false;
  startBtn.textContent = "Chụp lại";
  downloadBtn.disabled = false;
  resetBtn.disabled = false;
}

// ---------- Dải ảnh ----------
function clearStrip() {
  const ctx = stripCanvas.getContext("2d");
  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);
}

function drawStrip() {
  const W = PHOTO_W + PAD * 2;
  const H = PAD + TOTAL_SHOTS * (PHOTO_H + PAD) + FOOTER - PAD;
  stripCanvas.width = W;
  stripCanvas.height = H;
  const ctx = stripCanvas.getContext("2d");

  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  photos.forEach((p, i) => {
    ctx.drawImage(p, PAD, PAD + i * (PHOTO_H + PAD));
  });

  // chữ + ngày
  const caption = captionInput.value.trim() || "Photobooth";
  const date = new Date().toLocaleDateString("vi-VN");
  ctx.fillStyle = frame.fg;
  ctx.textAlign = "center";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(caption, W / 2, H - FOOTER + 55);
  ctx.font = "26px system-ui, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText(date, W / 2, H - FOOTER + 100);
  ctx.globalAlpha = 1;
}

function download() {
  const a = document.createElement("a");
  a.download = `photobooth-${Date.now()}.png`;
  a.href = stripCanvas.toDataURL("image/png");
  a.click();
}

function reset() {
  photos = [];
  stripCanvas.width = 660;
  stripCanvas.height = 1000;
  clearStrip();
  downloadBtn.disabled = true;
  resetBtn.disabled = true;
  startBtn.textContent = "Bắt đầu chụp";
}

// ---------- Sự kiện ----------
startBtn.addEventListener("click", startSession);
downloadBtn.addEventListener("click", download);
resetBtn.addEventListener("click", reset);

document.querySelectorAll(".frame-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".frame-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    frame = { bg: btn.dataset.bg, fg: btn.dataset.fg };
    if (photos.length) drawStrip(); else clearStrip();
  });
});

captionInput.addEventListener("input", () => { if (photos.length) drawStrip(); });

// preview filter trực tiếp trên video
filterSel.addEventListener("change", () => {
  video.style.filter = filterSel.value === "none" ? "" : filterSel.value;
});

fxVignette.addEventListener("change", () => {
  vignettePreview.classList.toggle("hidden", !fxVignette.checked);
});

overlayFile.addEventListener("change", () => {
  const file = overlayFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      overlayImg = img;
      overlayClear.disabled = false;
      updateOverlayPreview();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

overlayFit.addEventListener("change", updateOverlayPreview);
overlayOpacity.addEventListener("input", () => {
  opacityVal.textContent = overlayOpacity.value;
  updateOverlayPreview();
});
overlayClear.addEventListener("click", () => {
  overlayImg = null;
  overlayFile.value = "";
  overlayClear.disabled = true;
  updateOverlayPreview();
});

clearStrip();
initCamera();
