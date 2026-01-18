const state = {
  background: {
    mode: "solid",
    solid: "#202833",
    gradientStart: "#1b1f2a",
    gradientEnd: "#3a465b",
    gradientAngle: 45,
    gradientStartPoint: { x: 106, y: 106 },
    gradientEndPoint: { x: 406, y: 406 },
    radialCenter: { x: 256, y: 256 },
    radialRadius: 256,
    editing: false,
  },
  symbol: {
    size: 60,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 100,
    tintEnabled: false,
    tintColor: "#ffffff",
    name: "",
    source: "none",
    libraryName: "",
  },
  text: {
    value: "",
    font: "'SF Pro', system-ui",
    size: 28,
    weight: 600,
    color: "#ffffff",
    position: "bottom",
    offset: 24,
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
  },
  guides: false,
};

const renderCanvas = document.getElementById("render-canvas");
const renderCtx = renderCanvas.getContext("2d");
const previewCanvas = document.getElementById("preview-canvas");
const previewCtx = previewCanvas.getContext("2d");
const actualSizeToggle = document.getElementById("actual-size");
const actualSizePreview = document.getElementById("actual-size-preview");
const actualPreviewCanvases = Array.from(
  actualSizePreview.querySelectorAll(".actual-preview-canvas"),
);
const actualPreviewContexts = actualPreviewCanvases.map((canvas) => canvas.getContext("2d"));
const dropZone = document.getElementById("drop-zone");
const dropHint = document.getElementById("drop-hint");
const statusEl = document.getElementById("status");
const symbolName = document.getElementById("symbol-name");
const symbolThumb = document.getElementById("symbol-thumb");

let symbolImage = null;
let symbolUrl = null;
let toastTimeout = null;
let activeGradientHandle = null;
let gradientDragMoved = false;
let activeGradientColorHandle = null;
let activeRadialHandle = null;
let radialDragMoved = false;

const gradientColorPicker = document.createElement("input");
gradientColorPicker.type = "color";
gradientColorPicker.className = "floating-color-picker";
gradientColorPicker.setAttribute("aria-label", "Gradient color picker");
gradientColorPicker.hidden = true;
dropZone.appendChild(gradientColorPicker);

const controlEls = {
  symbolInput: document.getElementById("symbol-input"),
  clearSymbol: document.getElementById("clear-symbol"),
  symbolTabUpload: document.getElementById("symbol-tab-upload"),
  symbolTabLibrary: document.getElementById("symbol-tab-library"),
  symbolUploadPanel: document.getElementById("symbol-upload-panel"),
  symbolLibraryPanel: document.getElementById("symbol-library-panel"),
  iconSearch: document.getElementById("icon-search"),
  iconGrid: document.getElementById("icon-grid"),
  symbolPanel: document.getElementById("symbol-panel-content"),
  symbolToggle: document.getElementById("symbol-toggle"),
  backgroundPanel: document.getElementById("background-panel-content"),
  backgroundToggle: document.getElementById("background-toggle"),
  textPanel: document.getElementById("text-panel-content"),
  textToggle: document.getElementById("text-toggle"),
  symbolWidth: document.getElementById("symbol-width"),
  symbolHeight: document.getElementById("symbol-height"),
  symbolConstrain: document.getElementById("symbol-constrain"),
  symbolX: document.getElementById("symbol-x"),
  symbolY: document.getElementById("symbol-y"),
  symbolRotation: document.getElementById("symbol-rotation"),
  symbolOpacity: document.getElementById("symbol-opacity"),
  symbolTint: document.getElementById("symbol-tint"),
  symbolTintColor: document.getElementById("symbol-tint-color"),
  backgroundMode: document.getElementById("background-mode"),
  backgroundSolid: document.getElementById("background-solid"),
  backgroundGradientStart: document.getElementById("background-gradient-start"),
  backgroundGradientEnd: document.getElementById("background-gradient-end"),
  backgroundGradientAngle: document.getElementById("background-gradient-angle"),
  backgroundGradientAngleValue: document.getElementById("background-gradient-angle-value"),
  backgroundGradientAngleRow: document.getElementById("background-gradient-angle-row"),
  backgroundGradientToggle: document.getElementById("background-gradient-toggle"),
  textValue: document.getElementById("text-value"),
  textFont: document.getElementById("text-font"),
  textSize: document.getElementById("text-size"),
  textSizeValue: document.getElementById("text-size-value"),
  textWeight: document.getElementById("text-weight"),
  textColor: document.getElementById("text-color"),
  textPosition: document.getElementById("text-position"),
  textOffset: document.getElementById("text-offset"),
  textOffsetValue: document.getElementById("text-offset-value"),
  textStroke: document.getElementById("text-stroke"),
  textStrokeColor: document.getElementById("text-stroke-color"),
  textStrokeWidth: document.getElementById("text-stroke-width"),
  textStrokeWidthValue: document.getElementById("text-stroke-width-value"),
  exportBtn: document.getElementById("export-btn"),
  copyBtn: document.getElementById("copy-btn"),
  toggleGuides: document.getElementById("toggle-guides"),
  resetBtn: document.getElementById("reset-btn"),
};

const STORAGE_KEY = "streamdeck-icon-maker-state";
const ICON_INDEX_URL = "assets/icons/lucide/index.json";
const ICON_BASE_URL = "assets/icons/lucide";

const iconSvgCache = new Map();
let iconButtons = [];

function saveState() {
  const { background, symbol, text, guides } = state;
  const payload = { background, symbol, text, guides };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    if (data.background) Object.assign(state.background, data.background);
    if (data.symbol) Object.assign(state.symbol, data.symbol);
    if (data.text) Object.assign(state.text, data.text);
    if (typeof data.guides === "boolean") state.guides = data.guides;
    if (state.symbol.source === "upload") {
      state.symbol.source = "none";
      state.symbol.name = "";
    }
  } catch (error) {
    console.error("Failed to restore state", error);
  }
}

function syncControls() {
  controlEls.backgroundMode.value = state.background.mode;
  controlEls.backgroundSolid.value = state.background.solid;
  controlEls.backgroundGradientStart.value = state.background.gradientStart;
  controlEls.backgroundGradientEnd.value = state.background.gradientEnd;
  controlEls.backgroundGradientAngle.value = state.background.gradientAngle;
  controlEls.backgroundGradientAngleValue.textContent = `${state.background.gradientAngle}°`;
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", String(state.background.editing));
  syncBackgroundPickerVisibility();

  const sizePts = Math.round((state.symbol.size / 100) * 512);
  controlEls.symbolWidth.value = sizePts;
  controlEls.symbolHeight.value = sizePts;
  const pos = getSymbolTopLeft();
  controlEls.symbolX.value = Math.round(pos.x);
  controlEls.symbolY.value = Math.round(pos.y);
  controlEls.symbolRotation.value = state.symbol.rotation;
  controlEls.symbolOpacity.value = state.symbol.opacity;
  controlEls.symbolTint.checked = state.symbol.tintEnabled;
  controlEls.symbolTintColor.value = state.symbol.tintColor;

  controlEls.textValue.value = state.text.value;
  controlEls.textFont.value = state.text.font;
  controlEls.textSize.value = state.text.size;
  controlEls.textSizeValue.textContent = state.text.size;
  controlEls.textWeight.value = state.text.weight;
  controlEls.textColor.value = state.text.color;
  controlEls.textPosition.value = state.text.position;
  controlEls.textOffset.value = state.text.offset;
  controlEls.textOffsetValue.textContent = state.text.offset;
  controlEls.textStroke.checked = state.text.strokeEnabled;
  controlEls.textStrokeColor.value = state.text.strokeColor;
  controlEls.textStrokeWidth.value = state.text.strokeWidth;
  controlEls.textStrokeWidthValue.textContent = state.text.strokeWidth;

  controlEls.toggleGuides.checked = state.guides;

  symbolName.textContent = state.symbol.name || "No symbol loaded";
}

function ensureGradientPoints() {
  const hasPoints = state.background.gradientStartPoint && state.background.gradientEndPoint;
  if (!hasPoints) {
    setGradientPointsFromAngle(state.background.gradientAngle);
  }
}

function ensureRadialDefaults() {
  if (!state.background.radialCenter) {
    state.background.radialCenter = { x: 256, y: 256 };
  }
  if (!state.background.radialRadius || Number.isNaN(state.background.radialRadius)) {
    state.background.radialRadius = 256;
  }
}

function setGradientPointsFromAngle(angle) {
  const radians = (angle - 90) * (Math.PI / 180);
  const half = 256;
  const x0 = half + Math.cos(radians) * half;
  const y0 = half + Math.sin(radians) * half;
  const x1 = half - Math.cos(radians) * half;
  const y1 = half - Math.sin(radians) * half;
  state.background.gradientStartPoint = { x: x0, y: y0 };
  state.background.gradientEndPoint = { x: x1, y: y1 };
}

function updateGradientAngleFromPoints() {
  const start = state.background.gradientStartPoint;
  const end = state.background.gradientEndPoint;
  const radians = Math.atan2(end.y - start.y, end.x - start.x);
  const angle = (radians * 180) / Math.PI + 90;
  const normalized = (angle + 360) % 360;
  state.background.gradientAngle = Math.round(normalized);
  controlEls.backgroundGradientAngle.value = state.background.gradientAngle;
  controlEls.backgroundGradientAngleValue.textContent = `${state.background.gradientAngle}°`;
}

function syncBackgroundPickerVisibility() {
  const mode = state.background.mode;
  const isSolid = mode === "solid";
  const isGradient = mode === "gradient" || mode === "radial";
  controlEls.backgroundSolid.hidden = !isSolid;
  controlEls.backgroundGradientStart.hidden = !isGradient;
  controlEls.backgroundGradientEnd.hidden = !isGradient;
  controlEls.backgroundGradientAngleRow.hidden = mode !== "gradient";
  controlEls.backgroundGradientToggle.hidden = !isGradient;
}

function bindPanelToggle(panelEl, toggleEl) {
  if (!panelEl || !toggleEl) return;
  toggleEl.addEventListener("click", () => {
    const isExpanded = toggleEl.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;
    toggleEl.setAttribute("aria-expanded", String(nextExpanded));
    panelEl.hidden = !nextExpanded;
    const panel = toggleEl.closest(".panel");
    if (panel) panel.classList.toggle("is-collapsed", !nextExpanded);
  });
}

function setSymbolMode(mode) {
  const isUpload = mode === "upload";
  controlEls.symbolTabUpload.classList.toggle("is-active", isUpload);
  controlEls.symbolTabLibrary.classList.toggle("is-active", !isUpload);
  controlEls.symbolTabUpload.setAttribute("aria-selected", String(isUpload));
  controlEls.symbolTabLibrary.setAttribute("aria-selected", String(!isUpload));
  controlEls.symbolTabUpload.tabIndex = isUpload ? 0 : -1;
  controlEls.symbolTabLibrary.tabIndex = isUpload ? -1 : 0;
  controlEls.symbolUploadPanel.hidden = !isUpload;
  controlEls.symbolLibraryPanel.hidden = isUpload;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#f08a8a" : "#93d1a7";
  if (toastTimeout) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    statusEl.textContent = "";
  }, 3000);
}

function clearSymbol() {
  if (symbolUrl) {
    URL.revokeObjectURL(symbolUrl);
  }
  symbolImage = null;
  symbolUrl = null;
  state.symbol.name = "";
  state.symbol.source = "none";
  state.symbol.libraryName = "";
  symbolThumb.innerHTML = "";
  symbolName.textContent = "No symbol loaded";
  render();
  saveState();
}

// Normalize SVG paints: convert hardcoded fills/strokes to currentColor while
// preserving "none" and existing paint intent for mixed-fill icons.
function normalizeSvg(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;

  const normalizePaint = (el, attr) => {
    if (!el.hasAttribute(attr)) return;
    const value = (el.getAttribute(attr) || "").trim();
    if (!value || value.toLowerCase() === "none" || value === "currentColor") return;
    el.setAttribute(attr, "currentColor");
  };

  const extractStylePaints = (el) => {
    const style = el.getAttribute("style");
    if (!style) return;
    const rules = style
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean);
    const remaining = [];
    rules.forEach((rule) => {
      const [prop, rawValue] = rule.split(":").map((part) => part.trim());
      if (!prop || rawValue == null) return;
      if (prop === "fill" || prop === "stroke") {
        if (rawValue.toLowerCase() !== "none" && rawValue !== "currentColor") {
          el.setAttribute(prop, "currentColor");
        } else {
          el.setAttribute(prop, rawValue);
        }
        return;
      }
      remaining.push(`${prop}:${rawValue}`);
    });
    if (remaining.length) {
      el.setAttribute("style", remaining.join(";"));
    } else {
      el.removeAttribute("style");
    }
  };

  doc.querySelectorAll("*").forEach((el) => {
    extractStylePaints(el);
    normalizePaint(el, "fill");
    normalizePaint(el, "stroke");
  });

  normalizePaint(svg, "fill");
  normalizePaint(svg, "stroke");
  if (!svg.hasAttribute("fill")) {
    svg.setAttribute("fill", "none");
  }

  return new XMLSerializer().serializeToString(svg);
}

function loadSymbolSvgText(svgText, name) {
  const normalizedSvg = normalizeSvg(svgText);
  const blob = new Blob([normalizedSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  loadSymbolImage(url, name);
}

function handleFile(file) {
  if (!file) return;
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  if (!isSvg && !isPng) {
    setStatus("Please upload an SVG or PNG.", true);
    return;
  }

  if (symbolUrl) {
    URL.revokeObjectURL(symbolUrl);
  }

  if (isSvg) {
    const reader = new FileReader();
    reader.onload = () => {
      state.symbol.source = "upload";
      state.symbol.libraryName = "";
      loadSymbolSvgText(reader.result, file.name);
    };
    reader.readAsText(file);
  } else {
    symbolUrl = URL.createObjectURL(file);
    state.symbol.source = "upload";
    state.symbol.libraryName = "";
    loadSymbolImage(symbolUrl, file.name);
  }
}

function loadSymbolImage(url, name) {
  const img = new Image();
  img.onload = () => {
    symbolImage = img;
    state.symbol.name = name;
    symbolName.textContent = name;
    symbolThumb.innerHTML = "";
    const thumbImg = document.createElement("img");
    thumbImg.src = url;
    thumbImg.alt = "Symbol preview";
    symbolThumb.appendChild(thumbImg);
    render();
    saveState();
  };
  img.onerror = () => {
    setStatus("Failed to load symbol.", true);
  };
  img.src = url;
}

async function loadLibraryIcon(name) {
  if (!name) return;
  try {
    let svgText = iconSvgCache.get(name);
    if (!svgText) {
      const response = await fetch(`${ICON_BASE_URL}/${name}.svg`);
      if (!response.ok) {
        throw new Error(`Failed to load icon: ${name}`);
      }
      svgText = await response.text();
      iconSvgCache.set(name, svgText);
    }
    loadSymbolSvgText(svgText, name);
  } catch (error) {
    console.error(error);
    setStatus("Icon not found.", true);
    clearSymbol();
  }
}

function setSelectedIconButton(name) {
  iconButtons.forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.name === name);
  });
}

function selectLibraryIcon(name) {
  state.symbol.source = "library";
  state.symbol.libraryName = name;
  state.symbol.name = name;
  state.symbol.size = 60;
  state.symbol.x = 0;
  state.symbol.y = 0;
  state.symbol.rotation = 0;
  state.symbol.opacity = 100;
  state.symbol.tintEnabled = true;
  syncControls();
  setSelectedIconButton(name);
  loadLibraryIcon(name);
  saveState();
}

function filterIconButtons(query) {
  const normalized = query.trim().toLowerCase();
  iconButtons.forEach((btn) => {
    const name = btn.dataset.name || "";
    btn.hidden = normalized ? !name.includes(normalized) : false;
  });
}

async function loadIconIndex() {
  try {
    const response = await fetch(ICON_INDEX_URL);
    if (!response.ok) {
      throw new Error("Failed to load icon index");
    }
    const iconNames = await response.json();
    if (!Array.isArray(iconNames)) {
      throw new Error("Icon index is invalid");
    }
    controlEls.iconGrid.innerHTML = "";
    iconButtons = iconNames.map((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "icon-button";
      btn.dataset.name = name;
      btn.setAttribute("aria-label", `Icon: ${name}`);
      const img = document.createElement("img");
      img.src = `${ICON_BASE_URL}/${name}.svg`;
      img.alt = "";
      img.loading = "lazy";
      btn.appendChild(img);
      btn.addEventListener("click", () => selectLibraryIcon(name));
      controlEls.iconGrid.appendChild(btn);
      return btn;
    });
  } catch (error) {
    console.error(error);
    controlEls.iconGrid.innerHTML = "<div class=\"value\">No icons available.</div>";
  }
}

function updatePreviewScale() {
  const size = previewCanvas.clientWidth;
  const ratio = window.devicePixelRatio || 1;
  previewCanvas.width = size * ratio;
  previewCanvas.height = size * ratio;
  previewCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}

function createGradient(ctx) {
  ensureGradientPoints();
  const start = state.background.gradientStartPoint;
  const end = state.background.gradientEndPoint;
  const gradient = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  gradient.addColorStop(0, state.background.gradientStart);
  gradient.addColorStop(1, state.background.gradientEnd);
  return gradient;
}

function createRadialGradient(ctx) {
  ensureRadialDefaults();
  const center = state.background.radialCenter;
  const radius = state.background.radialRadius;
  const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
  gradient.addColorStop(0, state.background.gradientStart);
  gradient.addColorStop(1, state.background.gradientEnd);
  return gradient;
}

function drawBackground(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  if (state.background.mode === "solid") {
    ctx.fillStyle = state.background.solid;
  } else if (state.background.mode === "radial") {
    ctx.fillStyle = createRadialGradient(ctx);
  } else {
    ctx.fillStyle = createGradient(ctx);
  }
  ctx.fillRect(0, 0, 512, 512);
}

function drawSymbol(ctx) {
  if (!symbolImage) return;

  const size = (state.symbol.size / 100) * 512;
  const centerX = 256 + (state.symbol.x / 100) * 256;
  const centerY = 256 + (state.symbol.y / 100) * 256;
  const rotation = (state.symbol.rotation * Math.PI) / 180;
  const opacity = state.symbol.opacity / 100;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity;

  const drawX = -size / 2;
  const drawY = -size / 2;

  if (state.symbol.tintEnabled) {
    const tintCanvas = document.createElement("canvas");
    tintCanvas.width = size;
    tintCanvas.height = size;
    const tintCtx = tintCanvas.getContext("2d");
    tintCtx.drawImage(symbolImage, 0, 0, size, size);
    tintCtx.globalCompositeOperation = "source-in";
    tintCtx.fillStyle = state.symbol.tintColor;
    tintCtx.fillRect(0, 0, size, size);
    ctx.drawImage(tintCanvas, drawX, drawY, size, size);
  } else {
    ctx.drawImage(symbolImage, drawX, drawY, size, size);
  }

  ctx.restore();
}

function getSymbolTopLeft() {
  const size = (state.symbol.size / 100) * 512;
  const centerX = 256 + (state.symbol.x / 100) * 256;
  const centerY = 256 + (state.symbol.y / 100) * 256;
  return {
    x: centerX - size / 2,
    y: centerY - size / 2,
  };
}

function updateSymbolFromTopLeft(topLeftX, topLeftY) {
  const size = (state.symbol.size / 100) * 512;
  const clampedX = Math.min(512 - size, Math.max(0, topLeftX));
  const clampedY = Math.min(512 - size, Math.max(0, topLeftY));
  const centerX = clampedX + size / 2;
  const centerY = clampedY + size / 2;
  state.symbol.x = ((centerX - 256) / 256) * 100;
  state.symbol.y = ((centerY - 256) / 256) * 100;
}

function drawText(ctx) {
  if (!state.text.value.trim()) return;

  const fontSize = state.text.size;
  const fontWeight = state.text.weight;
  const fontFamily = state.text.font;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let y = 256;
  if (state.text.position === "bottom") {
    y = 512 - state.text.offset;
  } else if (state.text.position === "top") {
    y = state.text.offset;
  } else {
    y = 256 + (state.text.offset - 24);
  }

  if (state.text.strokeEnabled && state.text.strokeWidth > 0) {
    ctx.lineWidth = state.text.strokeWidth;
    ctx.strokeStyle = state.text.strokeColor;
    ctx.strokeText(state.text.value, 256, y);
  }

  ctx.fillStyle = state.text.color;
  ctx.fillText(state.text.value, 256, y);
}

function drawGuides(ctx) {
  if (!state.guides) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 432, 432);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 512);
  ctx.moveTo(0, 256);
  ctx.lineTo(512, 256);
  ctx.moveTo(0, 442);
  ctx.lineTo(512, 442);
  ctx.stroke();
  ctx.restore();
}

function render() {
  drawBackground(renderCtx);
  drawSymbol(renderCtx);
  drawText(renderCtx);
  drawGuides(renderCtx);

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.drawImage(renderCanvas, 0, 0, previewCanvas.clientWidth, previewCanvas.clientHeight);
  if (state.background.mode === "gradient" && state.background.editing) {
    drawGradientHandles(previewCtx);
  }
  if (state.background.mode === "radial" && state.background.editing) {
    drawRadialHandles(previewCtx);
  }

  if (actualSizeToggle?.checked) {
    renderActualSizePreview();
  }
}

function renderActualSizePreview() {
  const size = 256;
  actualPreviewContexts.forEach((ctx) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(renderCanvas, 0, 0, 512, 512, 0, 0, size, size);
  });
}

function drawGradientHandles(ctx) {
  ensureGradientPoints();
  const start = state.background.gradientStartPoint;
  const end = state.background.gradientEndPoint;
  const scale = previewCanvas.clientWidth / 512;
  const startX = start.x * scale;
  const startY = start.y * scale;
  const endX = end.x * scale;
  const endY = end.y * scale;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  drawGradientHandle(ctx, startX, startY, state.background.gradientStart);
  drawGradientHandle(ctx, endX, endY, state.background.gradientEnd);
  ctx.restore();
}

function drawGradientHandle(ctx, x, y, color) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1;
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function getRadialHandlePoint() {
  ensureRadialDefaults();
  const center = state.background.radialCenter;
  const radius = Math.max(12, state.background.radialRadius);
  return {
    x: Math.min(512, Math.max(0, center.x + radius)),
    y: Math.min(512, Math.max(0, center.y)),
  };
}

function drawRadialHandles(ctx) {
  ensureRadialDefaults();
  const scale = previewCanvas.clientWidth / 512;
  const center = state.background.radialCenter;
  const radiusPoint = getRadialHandlePoint();
  const centerX = center.x * scale;
  const centerY = center.y * scale;
  const radiusX = radiusPoint.x * scale;
  const radiusY = radiusPoint.y * scale;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(radiusX, radiusY);
  ctx.stroke();

  drawGradientHandle(ctx, centerX, centerY, state.background.gradientStart);
  drawGradientHandle(ctx, radiusX, radiusY, state.background.gradientEnd);
  ctx.restore();
}

function getPointerPosition(event) {
  const rect = previewCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const scale = 512 / rect.width;
  return { x: x * scale, y: y * scale };
}

function hitTestHandle(point, handle) {
  const dx = point.x - handle.x;
  const dy = point.y - handle.y;
  return Math.hypot(dx, dy) <= 12;
}

function hideGradientColorPicker() {
  if (gradientColorPicker.hidden) return;
  gradientColorPicker.hidden = true;
  activeGradientColorHandle = null;
}

function openGradientColorPicker(handle, canvasPoint) {
  activeGradientColorHandle = handle;
  gradientColorPicker.value =
    handle === "start" ? state.background.gradientStart : state.background.gradientEnd;

  const scale = previewCanvas.clientWidth / 512;
  const left = canvasPoint.x * scale;
  const top = canvasPoint.y * scale;
  const size = 28;
  const maxLeft = dropZone.clientWidth - size;
  const maxTop = dropZone.clientHeight - size;

  gradientColorPicker.style.left = `${Math.min(Math.max(left - size / 2, 0), maxLeft)}px`;
  gradientColorPicker.style.top = `${Math.min(Math.max(top - size / 2, 0), maxTop)}px`;

  gradientColorPicker.hidden = false;
  gradientColorPicker.focus({ preventScroll: true });
  gradientColorPicker.click();
}

function exportPng() {
  renderCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.download = "streamdeck-icon.png";
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}

async function copyToClipboard() {
  render();
  if (navigator.clipboard && window.ClipboardItem) {
    return new Promise((resolve) => {
      renderCanvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus("Clipboard copy failed.", true);
          resolve(false);
          return;
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          setStatus("Copied PNG to clipboard.");
          resolve(true);
        } catch (error) {
          console.error(error);
          setStatus("Clipboard permission denied.", true);
          resolve(false);
        }
      }, "image/png");
    });
  }

  try {
    const dataUrl = renderCanvas.toDataURL("image/png");
    await navigator.clipboard.writeText(dataUrl);
    setStatus("Clipboard image not supported; copied data URL instead.");
    return true;
  } catch (error) {
    console.error(error);
    setStatus("Clipboard copy not supported.", true);
    return false;
  }
}

function bindControl(input, handler) {
  input.addEventListener("input", () => {
    handler();
    saveState();
    render();
  });
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state.background, {
    mode: "solid",
    solid: "#202833",
    gradientStart: "#1b1f2a",
    gradientEnd: "#3a465b",
    gradientAngle: 45,
    radialCenter: { x: 256, y: 256 },
    radialRadius: 256,
  });
  Object.assign(state.symbol, {
    size: 60,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 100,
    tintEnabled: false,
    tintColor: "#ffffff",
    name: "",
  });
  Object.assign(state.text, {
    value: "",
    font: "'SF Pro', system-ui",
    size: 28,
    weight: 600,
    color: "#ffffff",
    position: "bottom",
    offset: 24,
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
  });
  state.guides = false;
  clearSymbol();
  syncControls();
  render();
}

controlEls.symbolInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  handleFile(file);
  event.target.value = "";
});

controlEls.symbolTabUpload.addEventListener("click", () => setSymbolMode("upload"));
controlEls.symbolTabLibrary.addEventListener("click", () => setSymbolMode("library"));

controlEls.iconSearch.addEventListener("input", () => {
  filterIconButtons(controlEls.iconSearch.value);
});

controlEls.clearSymbol.addEventListener("click", () => {
  clearSymbol();
});

bindControl(controlEls.symbolWidth, () => {
  const nextPts = Number(controlEls.symbolWidth.value);
  const clamped = Math.min(512, Math.max(0, nextPts));
  if (controlEls.symbolConstrain.checked) {
    controlEls.symbolHeight.value = String(clamped);
  }
  state.symbol.size = (clamped / 512) * 100;
  updateSymbolFromTopLeft(controlEls.symbolX.valueAsNumber || 0, controlEls.symbolY.valueAsNumber || 0);
  syncControls();
});

bindControl(controlEls.symbolHeight, () => {
  const nextPts = Number(controlEls.symbolHeight.value);
  const clamped = Math.min(512, Math.max(0, nextPts));
  if (controlEls.symbolConstrain.checked) {
    controlEls.symbolWidth.value = String(clamped);
  }
  state.symbol.size = (clamped / 512) * 100;
  updateSymbolFromTopLeft(controlEls.symbolX.valueAsNumber || 0, controlEls.symbolY.valueAsNumber || 0);
  syncControls();
});

bindControl(controlEls.symbolX, () => {
  const next = Number(controlEls.symbolX.value);
  const clamped = Math.min(512, Math.max(0, next));
  const current = getSymbolTopLeft();
  updateSymbolFromTopLeft(clamped, current.y);
  syncControls();
});

bindControl(controlEls.symbolY, () => {
  const next = Number(controlEls.symbolY.value);
  const clamped = Math.min(512, Math.max(0, next));
  const current = getSymbolTopLeft();
  updateSymbolFromTopLeft(current.x, clamped);
  syncControls();
});

bindControl(controlEls.symbolRotation, () => {
  state.symbol.rotation = Number(controlEls.symbolRotation.value);
});

bindControl(controlEls.symbolOpacity, () => {
  state.symbol.opacity = Number(controlEls.symbolOpacity.value);
});

controlEls.symbolTint.addEventListener("change", () => {
  state.symbol.tintEnabled = controlEls.symbolTint.checked;
  saveState();
  render();
});

controlEls.symbolTintColor.addEventListener("input", () => {
  state.symbol.tintColor = controlEls.symbolTintColor.value;
  saveState();
  render();
});

bindControl(controlEls.backgroundMode, () => {
  state.background.mode = controlEls.backgroundMode.value;
  if (state.background.mode === "solid") {
    state.background.editing = false;
  }
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", String(state.background.editing));
  syncBackgroundPickerVisibility();
});

bindControl(controlEls.backgroundSolid, () => {
  state.background.solid = controlEls.backgroundSolid.value;
});

bindControl(controlEls.backgroundGradientStart, () => {
  state.background.gradientStart = controlEls.backgroundGradientStart.value;
});

bindControl(controlEls.backgroundGradientEnd, () => {
  state.background.gradientEnd = controlEls.backgroundGradientEnd.value;
});

bindControl(controlEls.backgroundGradientAngle, () => {
  state.background.gradientAngle = Number(controlEls.backgroundGradientAngle.value);
  controlEls.backgroundGradientAngleValue.textContent = `${state.background.gradientAngle}°`;
  setGradientPointsFromAngle(state.background.gradientAngle);
});

bindControl(controlEls.textValue, () => {
  state.text.value = controlEls.textValue.value;
});

bindControl(controlEls.textFont, () => {
  state.text.font = controlEls.textFont.value;
});

bindControl(controlEls.textSize, () => {
  state.text.size = Number(controlEls.textSize.value);
  controlEls.textSizeValue.textContent = state.text.size;
});

bindControl(controlEls.textWeight, () => {
  state.text.weight = Number(controlEls.textWeight.value);
});

bindControl(controlEls.textColor, () => {
  state.text.color = controlEls.textColor.value;
});

bindControl(controlEls.textPosition, () => {
  state.text.position = controlEls.textPosition.value;
});

bindControl(controlEls.textOffset, () => {
  state.text.offset = Number(controlEls.textOffset.value);
  controlEls.textOffsetValue.textContent = state.text.offset;
});

controlEls.textStroke.addEventListener("change", () => {
  state.text.strokeEnabled = controlEls.textStroke.checked;
  saveState();
  render();
});

bindControl(controlEls.textStrokeColor, () => {
  state.text.strokeColor = controlEls.textStrokeColor.value;
});

bindControl(controlEls.textStrokeWidth, () => {
  state.text.strokeWidth = Number(controlEls.textStrokeWidth.value);
  controlEls.textStrokeWidthValue.textContent = state.text.strokeWidth;
});

controlEls.toggleGuides.addEventListener("change", () => {
  state.guides = controlEls.toggleGuides.checked;
  saveState();
  render();
});

actualSizeToggle.addEventListener("change", () => {
  actualSizePreview.hidden = !actualSizeToggle.checked;
  previewCanvas.hidden = actualSizeToggle.checked;
  if (!actualSizeToggle.checked) {
    updatePreviewScale();
  }
  render();
});

controlEls.exportBtn.addEventListener("click", exportPng);
controlEls.copyBtn.addEventListener("click", () => {
  copyToClipboard();
});

controlEls.resetBtn.addEventListener("click", () => {
  resetState();
});

controlEls.backgroundGradientToggle.addEventListener("click", () => {
  if (state.background.mode === "solid") {
    return;
  }
  state.background.editing = !state.background.editing;
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", String(state.background.editing));
  if (!state.background.editing) {
    hideGradientColorPicker();
    activeGradientHandle = null;
    activeRadialHandle = null;
  }
  saveState();
  render();
});

document.querySelectorAll(".stepper-arrow").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const step = Number(btn.dataset.step) || 0;
    const input = document.getElementById(targetId);
    if (!input) return;
    const min = Number(input.min ?? "-Infinity");
    const max = Number(input.max ?? "Infinity");
    const current = Number(input.value || "0");
    const next = Math.min(max, Math.max(min, current + step));
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
});

previewCanvas.addEventListener("pointerdown", (event) => {
  if (state.background.mode !== "gradient" && state.background.mode !== "radial") return;
  const point = getPointerPosition(event);
  state.background.editing = true;
  previewCanvas.setPointerCapture(event.pointerId);
  if (state.background.mode === "gradient") {
    ensureGradientPoints();
    const start = state.background.gradientStartPoint;
    const end = state.background.gradientEndPoint;
    gradientDragMoved = false;
    hideGradientColorPicker();
    if (hitTestHandle(point, start)) {
      activeGradientHandle = "start";
    } else if (hitTestHandle(point, end)) {
      activeGradientHandle = "end";
    } else {
      activeGradientHandle = null;
    }
  } else {
    ensureRadialDefaults();
    radialDragMoved = false;
    const center = state.background.radialCenter;
    const radiusPoint = getRadialHandlePoint();
    if (hitTestHandle(point, center)) {
      activeRadialHandle = "center";
    } else if (hitTestHandle(point, radiusPoint)) {
      activeRadialHandle = "radius";
    } else {
      activeRadialHandle = null;
    }
  }
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", "true");
  render();
});

previewCanvas.addEventListener("pointermove", (event) => {
  if (!activeGradientHandle && !activeRadialHandle) return;
  const point = getPointerPosition(event);
  if (activeGradientHandle) {
    gradientDragMoved = true;
    if (activeGradientHandle === "start") {
      state.background.gradientStartPoint = {
        x: Math.min(512, Math.max(0, point.x)),
        y: Math.min(512, Math.max(0, point.y)),
      };
    } else {
      state.background.gradientEndPoint = {
        x: Math.min(512, Math.max(0, point.x)),
        y: Math.min(512, Math.max(0, point.y)),
      };
    }
    updateGradientAngleFromPoints();
  } else if (activeRadialHandle) {
    radialDragMoved = true;
    if (activeRadialHandle === "center") {
      state.background.radialCenter = {
        x: Math.min(512, Math.max(0, point.x)),
        y: Math.min(512, Math.max(0, point.y)),
      };
    } else {
      const center = state.background.radialCenter;
      const radius = Math.hypot(point.x - center.x, point.y - center.y);
      state.background.radialRadius = Math.min(512, Math.max(12, radius));
    }
  }
  render();
});

previewCanvas.addEventListener("pointerup", (event) => {
  if (!state.background.editing) return;
  previewCanvas.releasePointerCapture(event.pointerId);
  if (activeGradientHandle) {
    if (!gradientDragMoved) {
      const point = getPointerPosition(event);
      openGradientColorPicker(activeGradientHandle, point);
    }
    activeGradientHandle = null;
    gradientDragMoved = false;
  }
  if (activeRadialHandle) {
    activeRadialHandle = null;
    radialDragMoved = false;
  }
  saveState();
});

previewCanvas.addEventListener("dblclick", (event) => {
  if (state.background.mode !== "gradient") return;
  const point = getPointerPosition(event);
  ensureGradientPoints();
  if (hitTestHandle(point, state.background.gradientStartPoint)) {
    openGradientColorPicker("start", point);
  } else if (hitTestHandle(point, state.background.gradientEndPoint)) {
    openGradientColorPicker("end", point);
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!state.background.editing) return;
  if (event.target !== previewCanvas) {
    state.background.editing = false;
    activeGradientHandle = null;
    gradientDragMoved = false;
    activeRadialHandle = null;
    radialDragMoved = false;
    hideGradientColorPicker();
    controlEls.backgroundGradientToggle.setAttribute("aria-pressed", "false");
    render();
  }
});

gradientColorPicker.addEventListener("input", () => {
  if (!activeGradientColorHandle) return;
  if (activeGradientColorHandle === "start") {
    state.background.gradientStart = gradientColorPicker.value;
    controlEls.backgroundGradientStart.value = gradientColorPicker.value;
  } else {
    state.background.gradientEnd = gradientColorPicker.value;
    controlEls.backgroundGradientEnd.value = gradientColorPicker.value;
  }
  saveState();
  render();
});

gradientColorPicker.addEventListener("blur", () => {
  hideGradientColorPicker();
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
  dropHint.textContent = "Release to load";
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
  dropHint.textContent = "Drop SVG or PNG";
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  dropHint.textContent = "Drop SVG or PNG";
  const file = event.dataTransfer.files[0];
  handleFile(file);
});

window.addEventListener("resize", updatePreviewScale);

window.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
  if (!isInput && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyToClipboard();
    return;
  }
  if (event.key === "Escape" && state.background.editing) {
    state.background.editing = false;
    render();
  }
});

loadState();
ensureGradientPoints();
ensureRadialDefaults();
syncControls();
setSymbolMode(state.symbol.source === "library" ? "library" : "upload");
updatePreviewScale();
actualSizePreview.hidden = !actualSizeToggle.checked;
previewCanvas.hidden = actualSizeToggle.checked;
render();

bindPanelToggle(controlEls.symbolPanel, controlEls.symbolToggle);
bindPanelToggle(controlEls.backgroundPanel, controlEls.backgroundToggle);
bindPanelToggle(controlEls.textPanel, controlEls.textToggle);

loadIconIndex().then(() => {
  if (state.symbol.source === "library" && state.symbol.libraryName) {
    setSelectedIconButton(state.symbol.libraryName);
    loadLibraryIcon(state.symbol.libraryName);
  }
});
