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

// hiệu ứng thêm
const fxVignette = document.getElementById("fxVignette");
const fxGrain = document.getElementById("fxGrain");
const fxLeak = document.getElementById("fxLeak");
const vignettePreview = document.getElementById("vignettePreview");

// khung phủ toàn ảnh
const overlayFile = document.getElementById("overlayFile");
const overlayFit = document.getElementById("overlayFit");
const overlayOpacity = document.getElementById("overlayOpacity");
const opacityVal = document.getElementById("opacityVal");
const overlayClear = document.getElementById("overlayClear");
const overlayPreview = document.getElementById("overlayPreview");

// sticker
const stickerLayer = document.getElementById("stickerLayer");
const stickerFile = document.getElementById("stickerFile");
const stickerShape = document.getElementById("stickerShape");
const stickerBorder = document.getElementById("stickerBorder");
const stickerSize = document.getElementById("stickerSize");
const stickerSizeVal = document.getElementById("stickerSizeVal");
const stickerRot = document.getElementById("stickerRot");
const stickerRotVal = document.getElementById("stickerRotVal");
const stickerScatter = document.getElementById("stickerScatter");
const stickerDelete = document.getElementById("stickerDelete");
const stickerClear = document.getElementById("stickerClear");

// bố cục & chủ đề
const layoutSel = document.getElementById("layoutSel");
const themeSel = document.getElementById("themeSel");

// khung & nền dải ảnh
const bgMode = document.getElementById("bgMode");
const bgColor = document.getElementById("bgColor");
const bgColor2 = document.getElementById("bgColor2");
const textColor = document.getElementById("textColor");
const bgFile = document.getElementById("bgFile");
const bgClear = document.getElementById("bgClear");
const photoRadius = document.getElementById("photoRadius");
const radiusVal = document.getElementById("radiusVal");
const photoBorder = document.getElementById("photoBorder");
const photoBorderColor = document.getElementById("photoBorderColor");

const TOTAL_SHOTS = 4;
const PHOTO_W = 600;
const PHOTO_H = 450;
const PAD = 30;
const FOOTER = 130;

let overlayImg = null;   // ảnh khung phủ toàn ảnh
let photos = [];         // mảng canvas
let frame = { bg: "#ffffff", fg: "#222222" };
let busy = false;
let bgImg = null;        // ảnh nền dải ảnh

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
  drawStickers(ctx, PHOTO_W, PHOTO_H, false);
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

// ---------- Khung phủ toàn ảnh ----------
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

// ---------- Sticker ----------
// Mỗi sticker: { src (canvas), iw, ih, x, y (tâm, 0..1), size (bề rộng / bề rộng ảnh), rot (độ) }
let stickers = [];
let selected = -1;
let drag = null;

function stickerDims(s, w) {
  const hw = (s.size * w) / 2;
  const hh = stickerShape.value === "circle" && !s.raw ? hw : (s.size * w * s.ih / s.iw) / 2;
  return { hw, hh };
}

function shapePath(ctx, hw, hh, shape) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(0, 0, hw, 0, Math.PI * 2);
  } else if (shape === "round") {
    const r = Math.min(hw, hh) * 0.3;
    ctx.moveTo(-hw + r, -hh);
    ctx.lineTo(hw - r, -hh);  ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
    ctx.lineTo(hw, hh - r);   ctx.quadraticCurveTo(hw, hh, hw - r, hh);
    ctx.lineTo(-hw + r, hh);  ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
    ctx.lineTo(-hw, -hh + r); ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    ctx.closePath();
  } else {
    ctx.rect(-hw, -hh, hw * 2, hh * 2);
  }
}

function drawSticker(ctx, s, w, h, showSelect) {
  // sticker emoji (raw) vẽ nguyên bản, không cắt hình, không viền trắng
  const shape = s.raw ? "rect" : stickerShape.value;
  const { hw, hh } = stickerDims(s, w);
  const b = stickerBorder.checked && !s.raw ? Math.max(3, hw * 0.08) : 0;

  ctx.save();
  ctx.translate(s.x * w, s.y * h);
  ctx.rotate((s.rot * Math.PI) / 180);

  // viền trắng + bóng đổ (kiểu sticker dán)
  if (b) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = b * 2;
    ctx.shadowOffsetY = b * 0.4;
    ctx.fillStyle = "#fff";
    shapePath(ctx, hw + b, hh + b, shape);
    ctx.fill();
    ctx.restore();
  }

  // ảnh, cắt theo hình dạng
  ctx.save();
  shapePath(ctx, hw, hh, shape);
  ctx.clip();
  let sx = 0, sy = 0, sw = s.iw, sh = s.ih;
  if (shape === "circle") {
    const m = Math.min(s.iw, s.ih);
    sx = (s.iw - m) / 2; sy = (s.ih - m) / 2; sw = m; sh = m;
  }
  ctx.drawImage(s.src, sx, sy, sw, sh, -hw, -hh, hw * 2, hh * 2);
  ctx.restore();

  if (showSelect) {
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff6b9d";
    shapePath(ctx, hw + b + 5, hh + b + 5, shape);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStickers(ctx, w, h, showSelect) {
  stickers.forEach((s, i) => drawSticker(ctx, s, w, h, showSelect && i === selected));
}

function renderStickers() {
  const ctx = stickerLayer.getContext("2d");
  ctx.clearRect(0, 0, PHOTO_W, PHOTO_H);
  drawStickers(ctx, PHOTO_W, PHOTO_H, !busy);
}

function syncStickerControls() {
  const has = selected >= 0 && stickers[selected];
  stickerSize.disabled = !has;
  stickerRot.disabled = !has;
  stickerDelete.disabled = !has;
  stickerScatter.disabled = stickers.length === 0;
  stickerClear.disabled = stickers.length === 0;
  if (has) {
    const s = stickers[selected];
    stickerSize.value = Math.round(s.size * 100);
    stickerSizeVal.textContent = Math.round(s.size * 100);
    stickerRot.value = Math.round(s.rot);
    stickerRotVal.textContent = Math.round(s.rot);
  }
}

function pointerPos(e) {
  const r = stickerLayer.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * PHOTO_W,
    y: ((e.clientY - r.top) / r.height) * PHOTO_H,
  };
}

function hitTest(px, py) {
  for (let i = stickers.length - 1; i >= 0; i--) {
    const s = stickers[i];
    const { hw, hh } = stickerDims(s, PHOTO_W);
    const a = (-s.rot * Math.PI) / 180;
    const dx = px - s.x * PHOTO_W;
    const dy = py - s.y * PHOTO_H;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= hw + 8 && Math.abs(ly) <= hh + 8) return i;
  }
  return -1;
}

function addStickerFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // thu nhỏ để chụp nhanh, nhẹ máy
      const k = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * k));
      c.height = Math.max(1, Math.round(img.naturalHeight * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      stickers.push({ src: c, iw: c.width, ih: c.height, x: 0.78, y: 0.68, size: 0.3, rot: 0 });
      selected = stickers.length - 1;
      syncStickerControls();
      renderStickers();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

stickerFile.addEventListener("change", () => {
  Array.from(stickerFile.files).forEach(addStickerFromFile);
  stickerFile.value = ""; // cho phép chọn lại cùng một ảnh
});

stickerLayer.addEventListener("pointerdown", (e) => {
  if (busy) return;
  const p = pointerPos(e);
  selected = hitTest(p.x, p.y);
  if (selected >= 0) {
    const s = stickers[selected];
    drag = { dx: s.x * PHOTO_W - p.x, dy: s.y * PHOTO_H - p.y };
    stickerLayer.setPointerCapture(e.pointerId);
    stickerLayer.classList.add("dragging");
  }
  syncStickerControls();
  renderStickers();
});

stickerLayer.addEventListener("pointermove", (e) => {
  if (!drag || selected < 0) return;
  const p = pointerPos(e);
  const s = stickers[selected];
  s.x = Math.min(1, Math.max(0, (p.x + drag.dx) / PHOTO_W));
  s.y = Math.min(1, Math.max(0, (p.y + drag.dy) / PHOTO_H));
  renderStickers();
});

const endDrag = () => { drag = null; stickerLayer.classList.remove("dragging"); };
stickerLayer.addEventListener("pointerup", endDrag);
stickerLayer.addEventListener("pointercancel", endDrag);

// lăn chuột để đổi cỡ sticker đang chọn
stickerLayer.addEventListener("wheel", (e) => {
  if (selected < 0) return;
  e.preventDefault();
  const s = stickers[selected];
  s.size = Math.min(0.8, Math.max(0.06, s.size + (e.deltaY < 0 ? 0.02 : -0.02)));
  syncStickerControls();
  renderStickers();
}, { passive: false });

stickerSize.addEventListener("input", () => {
  if (selected < 0) return;
  stickers[selected].size = stickerSize.value / 100;
  stickerSizeVal.textContent = stickerSize.value;
  renderStickers();
});

stickerRot.addEventListener("input", () => {
  if (selected < 0) return;
  stickers[selected].rot = Number(stickerRot.value);
  stickerRotVal.textContent = stickerRot.value;
  renderStickers();
});

stickerShape.addEventListener("change", renderStickers);
stickerBorder.addEventListener("change", renderStickers);

// nhân sticker đang chọn ra quanh viền khung ảnh
stickerScatter.addEventListener("click", () => {
  const base = stickers[selected] || stickers[stickers.length - 1];
  if (!base) return;
  const spots = [
    [0.09, 0.14], [0.50, 0.08], [0.91, 0.14],
    [0.06, 0.50],               [0.94, 0.50],
    [0.09, 0.86], [0.50, 0.92], [0.91, 0.86],
  ];
  const idx = stickers.indexOf(base);
  stickers.splice(idx, 1); // thay sticker gốc bằng các bản quanh viền
  spots.forEach(([x, y], i) => {
    stickers.push({
      src: base.src, iw: base.iw, ih: base.ih, raw: base.raw,
      x, y, size: 0.17,
      rot: (i % 2 ? 1 : -1) * (6 + Math.random() * 14),
    });
  });
  selected = -1;
  syncStickerControls();
  renderStickers();
});

stickerDelete.addEventListener("click", () => {
  if (selected < 0) return;
  stickers.splice(selected, 1);
  selected = -1;
  syncStickerControls();
  renderStickers();
});

stickerClear.addEventListener("click", () => {
  stickers = [];
  selected = -1;
  syncStickerControls();
  renderStickers();
});

document.addEventListener("keydown", (e) => {
  const t = e.target.tagName;
  if ((e.key === "Delete" || e.key === "Backspace") && selected >= 0 && t !== "INPUT" && t !== "SELECT") {
    stickerDelete.click();
  }
});

// ---------- Đếm ngược & chụp ----------
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
  renderStickers(); // ẩn nét đứt chọn sticker khi đang chụp
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
  renderStickers();
  startBtn.disabled = false;
  startBtn.textContent = "📸 Chụp lại";
  downloadBtn.disabled = false;
  resetBtn.disabled = false;
}

// ---------- Dải ảnh ----------
function clearStrip() {
  drawStrip(); // vẽ lại nền + ô trống
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, W, H) {
  const mode = bgMode.value;
  if (mode === "image" && bgImg) {
    const k = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
    const dw = bgImg.naturalWidth * k;
    const dh = bgImg.naturalHeight * k;
    ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return;
  }
  if (mode === "gradient") {
    const g = ctx.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, frame.bg);
    g.addColorStop(1, bgColor2.value);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = frame.bg;
  }
  ctx.fillRect(0, 0, W, H);
}

// ---------- Bố cục ----------
function getLayout() {
  const mode = layoutSel.value;
  const cols = mode === "single" ? 1 : 2;
  const rows = mode === "grid" ? 2 : TOTAL_SHOTS;
  const W = cols * PHOTO_W + (cols + 1) * PAD;
  const H = PAD + rows * (PHOTO_H + PAD) + FOOTER - PAD;
  const slots = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      slots.push({
        x: PAD + c * (PHOTO_W + PAD),
        y: PAD + r * (PHOTO_H + PAD),
        // "double": cả 2 cột dùng cùng 4 ảnh; "grid": 4 ảnh xếp 2x2
        idx: mode === "grid" ? r * 2 + c : r,
      });
    }
  }
  return { W, H, slots };
}

// ---------- Công cụ vẽ trang trí ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawHeart(ctx, cx, cy, s, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(-s * 1.1, -s * 0.3, -s * 0.5, -s * 1.0, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.5, -s * 1.0, s * 1.1, -s * 0.3, 0, s * 0.35);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, cx, cy, R, color, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDot(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBow(ctx, cx, cy, s, color, dark, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  ctx.fillStyle = color;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  // đuôi nơ
  [-1, 1].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(d * s * 0.12, s * 0.1);
    ctx.lineTo(d * s * 0.55, s * 1.0);
    ctx.lineTo(d * s * 0.2, s * 0.85);
    ctx.lineTo(0, s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  // hai cánh nơ
  [-1, 1].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(d * s * 0.6, -s * 0.95, d * s, -s * 0.5);
    ctx.quadraticCurveTo(d * s * 0.7, 0, d * s, s * 0.5);
    ctx.quadraticCurveTo(d * s * 0.6, s * 0.95, 0, 0);
    ctx.fill();
    ctx.stroke();
  });
  // nút thắt
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// nơ ghim ở 2 góc chéo của mỗi ô ảnh
function cornerBows(ctx, x, y, w, h, color, dark, s) {
  drawBow(ctx, x + 6, y + 6, s, color, dark, -0.55);
  drawBow(ctx, x + w - 6, y + h - 6, s, color, dark, -0.55 + Math.PI);
}

// rải họa tiết vào vùng nền (tránh ô ảnh và chỗ dòng chữ)
function scatterShapes(ctx, L, count, smin, smax, drawFn, rng) {
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 80) {
    tries++;
    const s = smin + rng() * (smax - smin);
    const x = rng() * L.W;
    const y = rng() * L.H;
    const m = s * 1.1 + 6;
    let bad = false;
    for (const sl of L.slots) {
      if (x > sl.x - m && x < sl.x + PHOTO_W + m && y > sl.y - m && y < sl.y + PHOTO_H + m) {
        bad = true;
        break;
      }
    }
    if (bad) continue;
    if (Math.abs(x - L.W / 2) < 220 && y > L.H - FOOTER + 5) continue;
    drawFn(ctx, x, y, s, rng);
    placed++;
  }
}

function fillGradient(ctx, L, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, L.W * 0.25, L.H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, L.W, L.H);
}

// ---------- Chủ đề khung ----------
const THEMES = {
  redbow: {
    fg: "#ffe9e0", radius: 10, border: null,
    bg(ctx, L, rng) {
      fillGradient(ctx, L, "#9a1c22", "#5a0d12");
      scatterShapes(ctx, L, 60, 5, 9, (c, x, y, s) => drawHeart(c, x, y, s, "rgba(255,220,210,0.5)"), rng);
    },
    cell(ctx, x, y, w, h) { cornerBows(ctx, x, y, w, h, "#f6d3c6", "#c98b80", 24); },
  },
  film: {
    fg: "#f4f4f4", radius: 0, border: null,
    bg(ctx, L) {
      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, L.W, L.H);
      const xs = [...new Set(L.slots.map((s) => s.x))].map((x) => x - PAD / 2);
      xs.push(Math.max(...L.slots.map((s) => s.x)) + PHOTO_W + PAD / 2);
      ctx.fillStyle = "#e6e6e6";
      xs.forEach((cx, k) => {
        // các lỗ ở giữa dừng trước phần chữ để không đè lên dòng chữ
        const inner = k > 0 && k < xs.length - 1;
        const limit = inner ? L.H - FOOTER : L.H - 18;
        for (let y = 10; y < limit; y += 36) {
          roundRectPath(ctx, cx - 6, y, 12, 18, 3);
          ctx.fill();
        }
      });
    },
  },
  creamstar: {
    fg: "#7a1418", radius: 4, border: { color: "#b3202a", width: 10 },
    bg(ctx, L, rng) {
      fillGradient(ctx, L, "#f4e9d6", "#ead9bd");
      scatterShapes(ctx, L, 90, 6, 12, (c, x, y, s, r) => drawStar(c, x, y, s, "#b3202a", (r() - 0.5) * 0.8), rng);
    },
  },
  pinkheart: {
    fg: "#7a1f4b", radius: 26, border: { color: "#ffffff", width: 8 },
    bg(ctx, L, rng) {
      fillGradient(ctx, L, "#ffe1ee", "#ffc2dc");
      scatterShapes(ctx, L, 70, 7, 13, (c, x, y, s, r) => drawHeart(c, x, y, s, r() > 0.5 ? "#ff6b9d" : "#ffffff"), rng);
    },
  },
  xmas: {
    fg: "#fff4e0", radius: 12, border: { color: "#d6303a", width: 10 },
    bg(ctx, L, rng) {
      fillGradient(ctx, L, "#0f6b43", "#083d28");
      scatterShapes(ctx, L, 160, 2, 5, (c, x, y, s) => drawDot(c, x, y, s, "rgba(255,255,255,0.85)"), rng);
      scatterShapes(ctx, L, 30, 6, 10, (c, x, y, s, r) => drawStar(c, x, y, s, "#ffd76a", (r() - 0.5) * 0.8), rng);
    },
    cell(ctx, x, y, w, h) { cornerBows(ctx, x, y, w, h, "#e0323c", "#8f1a22", 20); },
  },
  candy: {
    fg: "#5a4a8a", radius: 30, border: { color: "#ffffff", width: 8 },
    bg(ctx, L, rng) {
      fillGradient(ctx, L, "#cfe8ff", "#eadcff");
      scatterShapes(ctx, L, 110, 5, 14, (c, x, y, s) => drawDot(c, x, y, s, "rgba(255,255,255,0.75)"), rng);
    },
  },
};

// ---------- Vẽ dải ảnh ----------
function drawStrip() {
  const L = getLayout();
  stripCanvas.width = L.W;
  stripCanvas.height = L.H;
  const ctx = stripCanvas.getContext("2d");
  const theme = THEMES[themeSel.value];
  const rng = mulberry32(20241116);

  let radius, border, fg;
  if (theme) {
    theme.bg(ctx, L, rng);
    radius = theme.radius;
    border = theme.border;
    fg = theme.fg;
  } else {
    drawBackground(ctx, L.W, L.H);
    radius = Number(photoRadius.value);
    border = photoBorder.checked ? { color: photoBorderColor.value, width: 10 } : null;
    fg = frame.fg;
  }

  L.slots.forEach((sl) => {
    const p = photos[sl.idx];

    ctx.save();
    roundRectPath(ctx, sl.x, sl.y, PHOTO_W, PHOTO_H, radius);
    ctx.clip();
    if (p) {
      ctx.drawImage(p, sl.x, sl.y);
    } else {
      ctx.fillStyle = "rgba(128,128,128,0.25)"; // ô trống xem trước bố cục
      ctx.fillRect(sl.x, sl.y, PHOTO_W, PHOTO_H);
    }
    ctx.restore();

    if (border) {
      ctx.save();
      ctx.lineWidth = border.width;
      ctx.strokeStyle = border.color;
      roundRectPath(ctx, sl.x, sl.y, PHOTO_W, PHOTO_H, radius);
      ctx.stroke();
      ctx.restore();
    }

    if (theme && theme.cell) theme.cell(ctx, sl.x, sl.y, PHOTO_W, PHOTO_H);
  });

  // chữ + ngày
  const caption = captionInput.value.trim() || "Photobooth";
  const date = new Date().toLocaleDateString("vi-VN");
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(caption, L.W / 2, L.H - FOOTER + 55);
  ctx.font = "26px system-ui, sans-serif";
  ctx.globalAlpha = 0.7;
  ctx.fillText(date, L.W / 2, L.H - FOOTER + 100);
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
  startBtn.textContent = "📸 Bắt đầu chụp";
}

// ---------- Sự kiện chung ----------
startBtn.addEventListener("click", startSession);
downloadBtn.addEventListener("click", download);
resetBtn.addEventListener("click", reset);

document.querySelectorAll(".frame-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".frame-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    frame = { bg: btn.dataset.bg, fg: btn.dataset.fg };
    bgColor.value = frame.bg;
    textColor.value = frame.fg;
    bgMode.value = "solid";
    themeSel.value = "custom";
    drawStrip();
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

// ---------- Khung & nền dải ảnh ----------
[layoutSel, themeSel, bgMode, bgColor, bgColor2, textColor, photoRadius, photoBorder, photoBorderColor].forEach((el) => {
  el.addEventListener("input", () => {
    // chỉnh màu/nền thủ công thì tự chuyển về chủ đề "Tuỳ chỉnh"
    if (el !== layoutSel && el !== themeSel) themeSel.value = "custom";
    frame.bg = bgColor.value;
    frame.fg = textColor.value;
    radiusVal.textContent = photoRadius.value;
    if (el === bgColor || el === textColor) {
      document.querySelectorAll(".frame-btn").forEach((b) => b.classList.remove("active"));
    }
    drawStrip();
  });
});

bgFile.addEventListener("change", () => {
  const file = bgFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      bgImg = img;
      bgMode.value = "image";
      themeSel.value = "custom";
      bgClear.disabled = false;
      drawStrip();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  bgFile.value = "";
});

bgClear.addEventListener("click", () => {
  bgImg = null;
  bgClear.disabled = true;
  if (bgMode.value === "image") bgMode.value = "solid";
  drawStrip();
});

// sticker emoji có sẵn
document.querySelectorAll(".emoji-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = 200;
    const x = c.getContext("2d");
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = "150px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    x.fillText(btn.dataset.e, 100, 108);
    stickers.push({
      src: c, iw: 200, ih: 200,
      x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6,
      size: 0.14, rot: (Math.random() - 0.5) * 30, raw: true,
    });
    selected = stickers.length - 1;
    syncStickerControls();
    renderStickers();
  });
});

drawStrip();
syncStickerControls();
renderStickers();
initCamera();
