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

const TOTAL_SHOTS = 4;
const PHOTO_W = 600;
const PHOTO_H = 450;
const PAD = 30;
const FOOTER = 130;

let overlayImg = null;   // ảnh khung phủ toàn ảnh
let photos = [];         // mảng canvas
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
  const hh = stickerShape.value === "circle" ? hw : (s.size * w * s.ih / s.iw) / 2;
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
  const shape = stickerShape.value;
  const { hw, hh } = stickerDims(s, w);
  const b = stickerBorder.checked ? Math.max(3, hw * 0.08) : 0;

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
      src: base.src, iw: base.iw, ih: base.ih,
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

// ---------- Sự kiện chung ----------
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
syncStickerControls();
renderStickers();
initCamera();
