const state = {
  background: {
    mode: "solid",
    solid: "#202833",
    gradientStart: "#1b1f2a",
    gradientEnd: "#3a465b",
    gradientAngle: 45,
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
const dropZone = document.getElementById("drop-zone");
const dropHint = document.getElementById("drop-hint");
const statusEl = document.getElementById("status");
const symbolName = document.getElementById("symbol-name");
const symbolThumb = document.getElementById("symbol-thumb");

let symbolImage = null;
let symbolUrl = null;
let toastTimeout = null;

const controlEls = {
  symbolInput: document.getElementById("symbol-input"),
  clearSymbol: document.getElementById("clear-symbol"),
  symbolSize: document.getElementById("symbol-size"),
  symbolSizeValue: document.getElementById("symbol-size-value"),
  symbolX: document.getElementById("symbol-x"),
  symbolXValue: document.getElementById("symbol-x-value"),
  symbolY: document.getElementById("symbol-y"),
  symbolYValue: document.getElementById("symbol-y-value"),
  symbolRotation: document.getElementById("symbol-rotation"),
  symbolRotationValue: document.getElementById("symbol-rotation-value"),
  symbolOpacity: document.getElementById("symbol-opacity"),
  symbolOpacityValue: document.getElementById("symbol-opacity-value"),
  symbolTint: document.getElementById("symbol-tint"),
  symbolTintColor: document.getElementById("symbol-tint-color"),
  backgroundMode: document.getElementById("background-mode"),
  backgroundSolid: document.getElementById("background-solid"),
  backgroundGradientStart: document.getElementById("background-gradient-start"),
  backgroundGradientEnd: document.getElementById("background-gradient-end"),
  backgroundGradientAngle: document.getElementById("background-gradient-angle"),
  backgroundGradientAngleValue: document.getElementById("background-gradient-angle-value"),
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

  controlEls.symbolSize.value = state.symbol.size;
  controlEls.symbolSizeValue.textContent = `${state.symbol.size}%`;
  controlEls.symbolX.value = state.symbol.x;
  controlEls.symbolXValue.textContent = `${state.symbol.x}%`;
  controlEls.symbolY.value = state.symbol.y;
  controlEls.symbolYValue.textContent = `${state.symbol.y}%`;
  controlEls.symbolRotation.value = state.symbol.rotation;
  controlEls.symbolRotationValue.textContent = `${state.symbol.rotation}°`;
  controlEls.symbolOpacity.value = state.symbol.opacity;
  controlEls.symbolOpacityValue.textContent = `${state.symbol.opacity}%`;
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
  symbolThumb.innerHTML = "";
  symbolName.textContent = "No symbol loaded";
  render();
  saveState();
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
      const blob = new Blob([reader.result], { type: "image/svg+xml" });
      symbolUrl = URL.createObjectURL(blob);
      loadSymbolImage(symbolUrl, file.name);
    };
    reader.readAsText(file);
  } else {
    symbolUrl = URL.createObjectURL(file);
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

function updatePreviewScale() {
  const size = previewCanvas.clientWidth;
  const ratio = window.devicePixelRatio || 1;
  previewCanvas.width = size * ratio;
  previewCanvas.height = size * ratio;
  previewCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}

function createGradient(ctx) {
  const angle = (state.background.gradientAngle - 90) * (Math.PI / 180);
  const half = 256;
  const x0 = half + Math.cos(angle) * half;
  const y0 = half + Math.sin(angle) * half;
  const x1 = half - Math.cos(angle) * half;
  const y1 = half - Math.sin(angle) * half;
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, state.background.gradientStart);
  gradient.addColorStop(1, state.background.gradientEnd);
  return gradient;
}

function drawBackground(ctx) {
  ctx.clearRect(0, 0, 512, 512);
  if (state.background.mode === "solid") {
    ctx.fillStyle = state.background.solid;
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

controlEls.clearSymbol.addEventListener("click", () => {
  clearSymbol();
});

bindControl(controlEls.symbolSize, () => {
  state.symbol.size = Number(controlEls.symbolSize.value);
  controlEls.symbolSizeValue.textContent = `${state.symbol.size}%`;
});

bindControl(controlEls.symbolX, () => {
  state.symbol.x = Number(controlEls.symbolX.value);
  controlEls.symbolXValue.textContent = `${state.symbol.x}%`;
});

bindControl(controlEls.symbolY, () => {
  state.symbol.y = Number(controlEls.symbolY.value);
  controlEls.symbolYValue.textContent = `${state.symbol.y}%`;
});

bindControl(controlEls.symbolRotation, () => {
  state.symbol.rotation = Number(controlEls.symbolRotation.value);
  controlEls.symbolRotationValue.textContent = `${state.symbol.rotation}°`;
});

bindControl(controlEls.symbolOpacity, () => {
  state.symbol.opacity = Number(controlEls.symbolOpacity.value);
  controlEls.symbolOpacityValue.textContent = `${state.symbol.opacity}%`;
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

controlEls.exportBtn.addEventListener("click", exportPng);
controlEls.copyBtn.addEventListener("click", () => {
  copyToClipboard();
});

controlEls.resetBtn.addEventListener("click", () => {
  resetState();
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
  if (isInput) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
    event.preventDefault();
    copyToClipboard();
  }
});

loadState();
syncControls();
updatePreviewScale();
render();
