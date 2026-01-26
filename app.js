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
    radialHandlePoint: { x: 512, y: 256 },
    imageSrc: "",
    imageName: "",
    editing: false,
  },
  symbol: {
    size: 60,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 100,
    scaleX: 100,
    scaleY: 100,
    shearX: 0,
    shearY: 0,
    tintEnabled: false,
    tintColor: "#ffffff",
    name: "",
    source: "none",
    libraryName: "",
  },
  text: {
    layers: [
      {
        value: "",
        font: "'SF Pro', system-ui",
        size: 36,
        weight: 600,
        color: "#ffffff",
        strokeEnabled: false,
        strokeColor: "#000000",
        strokeWidth: 2,
        x: 256,
        y: 488,
      },
    ],
    activeIndex: 0,
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
const backgroundImage = new Image();
let backgroundImageUrl = "";
let backgroundImageIsAnimated = false;
let backgroundImageAnimationFrame = null;

let symbolImage = null;
let symbolUrl = null;
let toastTimeout = null;
let activeGradientHandle = null;
let gradientDragMoved = false;
let activeGradientColorHandle = null;
let activeRadialHandle = null;
let radialDragMoved = false;
let activeSymbolHandle = null;
let symbolDragMoved = false;
let activeTabId = "tab-symbol";
let symbolDragMode = null;
let symbolDragStart = null;
let textDragIndex = null;
let textDragStart = null;
let textDragAxis = null;
let holdResetTimeout = null;
let holdResetStart = 0;
let holdResetLabel = null;

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
  iconBrowseToggle: document.getElementById("icon-browse-toggle"),
  iconBrowser: document.getElementById("icon-browser"),
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
  symbolPosX: document.getElementById("symbol-pos-x"),
  symbolPosY: document.getElementById("symbol-pos-y"),
  symbolRotation: document.getElementById("symbol-rotation"),
  symbolRotationDial: document.getElementById("symbol-rotation-dial"),
  symbolRotationIndicator: document.getElementById("symbol-rotation-indicator"),
  symbolOpacity: document.getElementById("symbol-opacity"),
  symbolScaleRange: document.getElementById("symbol-scale-range"),
  symbolScale: document.getElementById("symbol-scale"),
  symbolShearX: document.getElementById("symbol-shear-x"),
  symbolShearY: document.getElementById("symbol-shear-y"),
  symbolTint: document.getElementById("symbol-tint"),
  symbolTintColor: document.getElementById("symbol-tint-color"),
  backgroundMode: document.getElementById("background-mode"),
  backgroundSolid: document.getElementById("background-solid"),
  backgroundGradientStart: document.getElementById("background-gradient-start"),
  backgroundGradientEnd: document.getElementById("background-gradient-end"),
  backgroundGradientAngle: document.getElementById("background-gradient-angle"),
  backgroundGradientAngleRow: document.getElementById("background-gradient-angle-row"),
  backgroundGradientToggle: document.getElementById("background-gradient-toggle"),
  backgroundGradientDial: document.getElementById("background-gradient-dial"),
  backgroundGradientIndicator: document.getElementById("background-gradient-indicator"),
  backgroundImageRow: document.getElementById("background-image-row"),
  backgroundImageInput: document.getElementById("background-image-input"),
  backgroundImageUpload: document.getElementById("background-image-upload"),
  backgroundImageName: document.getElementById("background-image-name"),
  tabSymbol: document.getElementById("tab-symbol"),
  tabBackground: document.getElementById("tab-background"),
  tabText: document.getElementById("tab-text"),
  tabPanelSymbol: document.getElementById("tab-panel-symbol"),
  tabPanelBackground: document.getElementById("tab-panel-background"),
  tabPanelText: document.getElementById("tab-panel-text"),
  textValue: document.getElementById("text-value"),
  textFont: document.getElementById("text-font"),
  textSize: document.getElementById("text-size"),
  textWeight: document.getElementById("text-weight"),
  textColor: document.getElementById("text-color"),
  textPosX: document.getElementById("text-pos-x"),
  textPosY: document.getElementById("text-pos-y"),
  textStroke: document.getElementById("text-stroke"),
  textStrokeColor: document.getElementById("text-stroke-color"),
  textStrokeWidth: document.getElementById("text-stroke-width"),
  resetTextTransform: document.getElementById("reset-text-transform"),
  textLayerList: document.getElementById("text-layer-list"),
  textLayerAdd: document.getElementById("text-layer-add"),
  textLayerRemove: document.getElementById("text-layer-remove"),
  exportBtn: document.getElementById("export-btn"),
  copyBtn: document.getElementById("copy-btn"),
  toggleGuides: document.getElementById("toggle-guides"),
  resetBtn: document.getElementById("reset-btn"),
  resetTransform: document.getElementById("reset-transform"),
  resetAppearance: document.getElementById("reset-appearance"),
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
    if ("scale" in state.symbol) {
      const legacyScale = Number(state.symbol.scale);
      if (!Number.isNaN(legacyScale)) {
        if (state.symbol.scaleX == null) state.symbol.scaleX = legacyScale;
        if (state.symbol.scaleY == null) state.symbol.scaleY = legacyScale;
      }
      delete state.symbol.scale;
    }
    if (state.symbol.source === "upload") {
      state.symbol.source = "none";
      state.symbol.name = "";
    }
    if (state.text && !Array.isArray(state.text.layers)) {
      const legacy = state.text;
      state.text = {
        layers: [
          {
            value: legacy.value || "",
            font: legacy.font || "'SF Pro', system-ui",
            size: legacy.size ?? 36,
            weight: legacy.weight ?? 600,
            color: legacy.color || "#ffffff",
            strokeEnabled: legacy.strokeEnabled ?? false,
            strokeColor: legacy.strokeColor || "#000000",
            strokeWidth: legacy.strokeWidth ?? 2,
            x: 256,
            y: legacy.position === "top" ? 24 : legacy.position === "center" ? 256 : 488,
          },
        ],
        activeIndex: 0,
      };
    }
  } catch (error) {
    console.error("Failed to restore state", error);
  }
  if (!state.background.imageSrc || state.background.imageSrc.startsWith("blob:")) {
    clearBackgroundImage();
    saveState();
  }
}

function ensureTextLayers() {
  if (!state.text.layers || !state.text.layers.length) {
    state.text.layers = [
      {
        value: "",
        font: "'SF Pro', system-ui",
        size: 36,
        weight: 600,
        color: "#ffffff",
        strokeEnabled: false,
        strokeColor: "#000000",
        strokeWidth: 2,
        x: 256,
        y: 488,
      },
    ];
  }
  if (state.text.activeIndex == null || state.text.activeIndex >= state.text.layers.length) {
    state.text.activeIndex = 0;
  }
}

function getActiveTextLayer() {
  ensureTextLayers();
  return state.text.layers[state.text.activeIndex];
}

function renderTextLayerList() {
  if (!controlEls.textLayerList) return;
  ensureTextLayers();
  controlEls.textLayerList.innerHTML = "";
  state.text.layers.forEach((layer, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `layer-item${index === state.text.activeIndex ? " is-active" : ""}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === state.text.activeIndex));
    item.textContent = layer.value?.trim() ? layer.value.trim() : `Layer ${index + 1}`;
    item.addEventListener("click", () => {
      state.text.activeIndex = index;
      syncControls();
      saveState();
      render();
    });
    controlEls.textLayerList.appendChild(item);
  });
}

function syncControls() {
  controlEls.backgroundMode.value = state.background.mode;
  controlEls.backgroundSolid.value = state.background.solid;
  controlEls.backgroundGradientStart.value = state.background.gradientStart;
  controlEls.backgroundGradientEnd.value = state.background.gradientEnd;
  controlEls.backgroundGradientAngle.value = state.background.gradientAngle;
  if (controlEls.backgroundGradientDial) {
    controlEls.backgroundGradientDial.setAttribute("aria-valuenow", String(state.background.gradientAngle));
  }
  if (controlEls.backgroundGradientIndicator) {
    controlEls.backgroundGradientIndicator.style.transform = `rotate(${state.background.gradientAngle}deg)`;
  }
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", String(state.background.editing));
  syncBackgroundPickerVisibility();
  if (controlEls.backgroundImageName) {
    controlEls.backgroundImageName.textContent = state.background.imageName || "No image selected";
  }

  const sizePts = Math.round((state.symbol.size / 100) * 512);
  if (controlEls.symbolWidth) controlEls.symbolWidth.value = sizePts;
  if (controlEls.symbolHeight) controlEls.symbolHeight.value = sizePts;
  const pos = getSymbolTopLeft();
  if (controlEls.symbolX) controlEls.symbolX.value = Math.round(pos.x);
  if (controlEls.symbolY) controlEls.symbolY.value = Math.round(pos.y);
  if (controlEls.symbolPosX) controlEls.symbolPosX.value = Math.round(pos.x);
  if (controlEls.symbolPosY) controlEls.symbolPosY.value = Math.round(pos.y);
  if (controlEls.symbolRotation) controlEls.symbolRotation.value = state.symbol.rotation;
  if (controlEls.symbolRotationDial) {
    controlEls.symbolRotationDial.setAttribute("aria-valuenow", String(state.symbol.rotation));
  }
  if (controlEls.symbolRotationIndicator) {
    controlEls.symbolRotationIndicator.style.transform = `rotate(${state.symbol.rotation}deg)`;
  }
  if (controlEls.symbolOpacity) controlEls.symbolOpacity.value = state.symbol.opacity;
  if (controlEls.symbolScaleRange) controlEls.symbolScaleRange.value = state.symbol.scaleX;
  if (controlEls.symbolScale) controlEls.symbolScale.value = state.symbol.scaleX;
  if (controlEls.symbolShearX) controlEls.symbolShearX.value = state.symbol.shearX;
  if (controlEls.symbolShearY) controlEls.symbolShearY.value = state.symbol.shearY;
  if (controlEls.symbolTint) controlEls.symbolTint.checked = state.symbol.tintEnabled;
  if (controlEls.symbolTintColor) controlEls.symbolTintColor.value = state.symbol.tintColor;

  ensureTextLayers();
  const activeLayer = getActiveTextLayer();
  controlEls.textValue.value = activeLayer.value;
  controlEls.textFont.value = activeLayer.font;
  controlEls.textSize.value = activeLayer.size;
  if (controlEls.textWeight) controlEls.textWeight.value = activeLayer.weight;
  controlEls.textColor.value = activeLayer.color;
  if (controlEls.textPosX) controlEls.textPosX.value = Math.round(activeLayer.x);
  if (controlEls.textPosY) controlEls.textPosY.value = Math.round(activeLayer.y);
  controlEls.textStroke.checked = activeLayer.strokeEnabled;
  controlEls.textStrokeColor.value = activeLayer.strokeColor;
  controlEls.textStrokeWidth.value = activeLayer.strokeWidth;
  renderTextLayerList();

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
  if (!state.background.radialHandlePoint) {
    state.background.radialHandlePoint = {
      x: Math.min(512, Math.max(0, state.background.radialCenter.x + state.background.radialRadius)),
      y: Math.min(512, Math.max(0, state.background.radialCenter.y)),
    };
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
  if (controlEls.backgroundGradientDial) {
    controlEls.backgroundGradientDial.setAttribute("aria-valuenow", String(state.background.gradientAngle));
  }
  if (controlEls.backgroundGradientIndicator) {
    controlEls.backgroundGradientIndicator.style.transform = `rotate(${state.background.gradientAngle}deg)`;
  }
}

function syncBackgroundPickerVisibility() {
  const mode = state.background.mode;
  const isSolid = mode === "solid";
  const isGradient = mode === "gradient" || mode === "radial";
  const isImage = mode === "image";
  controlEls.backgroundSolid.hidden = !isSolid;
  controlEls.backgroundGradientStart.hidden = !isGradient;
  controlEls.backgroundGradientEnd.hidden = !isGradient;
  controlEls.backgroundGradientAngleRow.hidden = mode !== "gradient";
  controlEls.backgroundGradientToggle.hidden = !isGradient;
  if (controlEls.backgroundImageRow) {
    controlEls.backgroundImageRow.hidden = !isImage;
  }
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

function setActiveTab(activeId) {
  const tabs = [controlEls.tabSymbol, controlEls.tabBackground, controlEls.tabText];
  const panels = [controlEls.tabPanelSymbol, controlEls.tabPanelBackground, controlEls.tabPanelText];
  activeTabId = activeId;
  tabs.forEach((tab) => {
    const isActive = tab.id === activeId;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== `tab-panel-${activeId.replace("tab-", "")}`;
  });
  if (activeId !== "tab-symbol") {
    state.symbol.editing = false;
    activeSymbolHandle = null;
  }
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
  if (isUpload) {
    controlEls.iconBrowser.hidden = true;
    controlEls.iconBrowseToggle.setAttribute("aria-expanded", "false");
  }
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
  state.symbol.scaleX = 100;
  state.symbol.scaleY = 100;
  state.symbol.shearX = 0;
  state.symbol.shearY = 0;
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
  if (normalized) {
    controlEls.iconBrowser.hidden = false;
    controlEls.iconBrowseToggle.setAttribute("aria-expanded", "true");
  }
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
  if (state.background.mode === "image") {
    drawBackgroundImage(ctx);
    return;
  }
  if (state.background.mode === "solid") {
    ctx.fillStyle = state.background.solid;
  } else if (state.background.mode === "radial") {
    ctx.fillStyle = createRadialGradient(ctx);
  } else if (state.background.mode === "gradient") {
    ctx.fillStyle = createGradient(ctx);
  } else {
    ctx.fillStyle = createGradient(ctx);
  }
  ctx.fillRect(0, 0, 512, 512);
}

function getBackgroundImageFrame() {
  return {
    cols: 1,
    rows: 1,
    colIndex: 0,
    rowIndex: 0,
    fit: "cover",
  };
}

function drawBackgroundImage(ctx) {
  if (!backgroundImage.complete || !backgroundImage.naturalWidth) {
    ctx.fillStyle = state.background.solid;
    ctx.fillRect(0, 0, 512, 512);
    return;
  }
  const frame = getBackgroundImageFrame();
  const cellWidth = backgroundImage.naturalWidth / frame.cols;
  const cellHeight = backgroundImage.naturalHeight / frame.rows;
  const sourceX = cellWidth * frame.colIndex;
  const sourceY = cellHeight * frame.rowIndex;
  const sourceW = cellWidth;
  const sourceH = cellHeight;
  const targetW = 512;
  const targetH = 512;
  const scale = frame.fit === "contain"
    ? Math.min(targetW / sourceW, targetH / sourceH)
    : Math.max(targetW / sourceW, targetH / sourceH);
  const drawW = sourceW * scale;
  const drawH = sourceH * scale;
  const drawX = (targetW - drawW) / 2;
  const drawY = (targetH - drawH) / 2;
  ctx.drawImage(
    backgroundImage,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    drawX,
    drawY,
    drawW,
    drawH,
  );
}

function drawSymbol(ctx) {
  if (!symbolImage) return;

  const size = (state.symbol.size / 100) * 512;
  const scaleX = state.symbol.scaleX / 100;
  const scaleY = state.symbol.scaleY / 100;
  const scaledSizeX = size * scaleX;
  const scaledSizeY = size * scaleY;
  const centerX = 256 + (state.symbol.x / 100) * 256;
  const centerY = 256 + (state.symbol.y / 100) * 256;
  const rotation = (state.symbol.rotation * Math.PI) / 180;
  const opacity = state.symbol.opacity / 100;
  const shearX = Math.tan((state.symbol.shearX * Math.PI) / 180);
  const shearY = Math.tan((state.symbol.shearY * Math.PI) / 180);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.transform(1, shearY, shearX, 1, 0, 0);
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = opacity;

  const drawX = -scaledSizeX / 2;
  const drawY = -scaledSizeY / 2;

  if (state.symbol.tintEnabled) {
    const tintCanvas = document.createElement("canvas");
    tintCanvas.width = scaledSizeX;
    tintCanvas.height = scaledSizeY;
    const tintCtx = tintCanvas.getContext("2d");
    tintCtx.drawImage(symbolImage, 0, 0, scaledSizeX, scaledSizeY);
    tintCtx.globalCompositeOperation = "source-in";
    tintCtx.fillStyle = state.symbol.tintColor;
    tintCtx.fillRect(0, 0, scaledSizeX, scaledSizeY);
    ctx.drawImage(tintCanvas, drawX, drawY, scaledSizeX, scaledSizeY);
  } else {
    ctx.drawImage(symbolImage, drawX, drawY, scaledSizeX, scaledSizeY);
  }

  ctx.restore();
}

function getSymbolMetrics() {
  const size = (state.symbol.size / 100) * 512;
  const scaleX = state.symbol.scaleX / 100;
  const scaleY = state.symbol.scaleY / 100;
  const scaledSizeX = size * scaleX;
  const scaledSizeY = size * scaleY;
  const scaledSize = Math.max(scaledSizeX, scaledSizeY);
  const centerX = 256 + (state.symbol.x / 100) * 256;
  const centerY = 256 + (state.symbol.y / 100) * 256;
  const rotation = (state.symbol.rotation * Math.PI) / 180;
  const shearX = Math.tan((state.symbol.shearX * Math.PI) / 180);
  const shearY = Math.tan((state.symbol.shearY * Math.PI) / 180);
  return {
    size: scaledSize,
    centerX,
    centerY,
    rotation,
    shearX,
    shearY,
    scaleX,
    scaleY,
  };
}

function getSymbolLocalPoint(point) {
  const { centerX, centerY, rotation, shearX, shearY, scaleX, scaleY } = getSymbolMetrics();
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  const det = 1 - shearX * shearY;
  const invX = (rx - shearX * ry) / det;
  const invY = (ry - shearY * rx) / det;
  return { x: invX / scaleX, y: invY / scaleY };
}

function getSymbolCorners() {
  const { size, centerX, centerY, rotation, shearX, shearY } = getSymbolMetrics();
  const half = size / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    { name: "nw", x: -half, y: -half },
    { name: "ne", x: half, y: -half },
    { name: "se", x: half, y: half },
    { name: "sw", x: -half, y: half },
  ];
  return corners.map((corner) => {
    const sx = corner.x + shearX * corner.y;
    const sy = shearY * corner.x + corner.y;
    return {
    name: corner.name,
    x: centerX + sx * cos - sy * sin,
    y: centerY + sx * sin + sy * cos,
  };
  });
}

function isPointInSymbol(point) {
  if (!symbolImage) return false;
  const { size } = getSymbolMetrics();
  const local = getSymbolLocalPoint(point);
  return Math.abs(local.x) <= size / 2 && Math.abs(local.y) <= size / 2;
}

function getSymbolHandleAtPoint(point) {
  if (!symbolImage) return null;
  const corners = getSymbolCorners();
  for (const corner of corners) {
    const dx = point.x - corner.x;
    const dy = point.y - corner.y;
    if (Math.hypot(dx, dy) <= 12) {
      return corner.name;
    }
  }
  return null;
}

function drawSymbolHandles(ctx) {
  if (!symbolImage || !state.symbol.editing) return;
  const scale = previewCanvas.clientWidth / 512;
  const corners = getSymbolCorners();

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.beginPath();
  corners.forEach((corner, index) => {
    const x = corner.x * scale;
    const y = corner.y * scale;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.stroke();

  corners.forEach((corner) => {
    const x = corner.x * scale;
    const y = corner.y * scale;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(16, 20, 28, 0.9)";
    ctx.lineWidth = 2;
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getSymbolRotateHandleAtPoint(point) {
  if (!symbolImage) return null;
  const corners = getSymbolCorners();
  for (const corner of corners) {
    const dx = point.x - corner.x;
    const dy = point.y - corner.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 22 && distance > 12) {
      return corner.name;
    }
  }
  return null;
}

function normalizeRotation(degrees) {
  let value = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (value === -180) value = 180;
  return value;
}

function updateSymbolCursor(point) {
  if (activeTabId !== "tab-symbol" || !symbolImage) {
    previewCanvas.style.cursor = "default";
    return;
  }
  const handle = getSymbolHandleAtPoint(point);
  if (handle) {
    previewCanvas.style.cursor = "nwse-resize";
    return;
  }
  const rotateHandle = getSymbolRotateHandleAtPoint(point);
  if (rotateHandle) {
    previewCanvas.style.cursor = "crosshair";
    return;
  }
  if (isPointInSymbol(point)) {
    previewCanvas.style.cursor = "move";
    return;
  }
  previewCanvas.style.cursor = "default";
}

function createHoldResetCursor(progress) {
  const size = 48;
  const center = size / 2;
  const radius = 18;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.min(1, Math.max(0, progress)) * Math.PI * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#f15b5b";
  ctx.beginPath();
  ctx.arc(center, center, radius, startAngle, endAngle);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(center, center, 2, 0, Math.PI * 2);
  ctx.fill();
  return `url(${canvas.toDataURL("image/png")}) ${center} ${center}, progress`;
}

function resetInputs(ids) {
  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    const initial = input.defaultValue ?? input.getAttribute("value") ?? "";
    if (initial !== "") {
      input.value = initial;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

function startHoldReset(label) {
  const targetIds = label.dataset.resetTarget?.split(",").map((id) => id.trim()).filter(Boolean);
  if (!targetIds?.length) return;
  if (holdResetLabel && holdResetLabel !== label) {
    endHoldReset();
  }
  holdResetLabel = label;
  holdResetStart = performance.now();
  const updateCursor = () => {
    if (holdResetLabel !== label) return;
    const elapsed = performance.now() - holdResetStart;
    const progress = Math.min(elapsed / 2000, 1);
    document.body.style.cursor = createHoldResetCursor(progress);
    if (progress < 1) {
      requestAnimationFrame(updateCursor);
    }
  };
  updateCursor();
  holdResetTimeout = window.setTimeout(() => {
    resetInputs(targetIds);
    endHoldReset();
  }, 2000);
}

function endHoldReset() {
  if (holdResetTimeout) {
    window.clearTimeout(holdResetTimeout);
  }
  holdResetTimeout = null;
  holdResetLabel = null;
  document.body.style.cursor = "";
}

function getSymbolTopLeft() {
  const size =
    (state.symbol.size / 100) * 512 * (Math.max(state.symbol.scaleX, state.symbol.scaleY) / 100);
  const centerX = 256 + (state.symbol.x / 100) * 256;
  const centerY = 256 + (state.symbol.y / 100) * 256;
  return {
    x: centerX - size / 2,
    y: centerY - size / 2,
  };
}

function updateSymbolFromTopLeft(topLeftX, topLeftY) {
  const size =
    (state.symbol.size / 100) * 512 * (Math.max(state.symbol.scaleX, state.symbol.scaleY) / 100);
  const clampedX = Math.min(512 - size, Math.max(0, topLeftX));
  const clampedY = Math.min(512 - size, Math.max(0, topLeftY));
  const centerX = clampedX + size / 2;
  const centerY = clampedY + size / 2;
  state.symbol.x = ((centerX - 256) / 256) * 100;
  state.symbol.y = ((centerY - 256) / 256) * 100;
}

function drawText(ctx) {
  ensureTextLayers();
  state.text.layers.forEach((layer) => {
    if (!layer.value?.trim()) return;
    ctx.save();
    ctx.font = `${layer.weight} ${layer.size}px ${layer.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (layer.strokeEnabled && layer.strokeWidth > 0) {
      ctx.lineWidth = layer.strokeWidth;
      ctx.strokeStyle = layer.strokeColor;
      ctx.strokeText(layer.value, layer.x, layer.y);
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(layer.value, layer.x, layer.y);
    ctx.restore();
  });
}

function getTextLayerBounds(layer, ctx = renderCtx) {
  ctx.save();
  ctx.font = `${layer.weight} ${layer.size}px ${layer.font}`;
  const metrics = ctx.measureText(layer.value || "");
  const width = metrics.width;
  const height = layer.size;
  ctx.restore();
  return {
    left: layer.x - width / 2,
    right: layer.x + width / 2,
    top: layer.y - height / 2,
    bottom: layer.y + height / 2,
  };
}

function getTextLayerIndexAtPoint(point) {
  ensureTextLayers();
  for (let i = state.text.layers.length - 1; i >= 0; i -= 1) {
    const layer = state.text.layers[i];
    if (!layer.value?.trim()) continue;
    const bounds = getTextLayerBounds(layer);
    if (
      point.x >= bounds.left &&
      point.x <= bounds.right &&
      point.y >= bounds.top &&
      point.y <= bounds.bottom
    ) {
      return i;
    }
  }
  return null;
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
  if (activeTabId === "tab-background" && state.background.mode === "gradient" && state.background.editing) {
    drawGradientHandles(previewCtx);
  }
  if (activeTabId === "tab-background" && state.background.mode === "radial" && state.background.editing) {
    drawRadialHandles(previewCtx);
  }
  drawSymbolHandles(previewCtx);

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
  return {
    x: Math.min(512, Math.max(0, state.background.radialHandlePoint.x)),
    y: Math.min(512, Math.max(0, state.background.radialHandlePoint.y)),
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

function resizeSymbolFromPointer(point) {
  const { centerX, centerY, scaleX, scaleY } = getSymbolMetrics();
  const local = getSymbolLocalPoint(point);
  const nextSize = Math.min(512, Math.max(8, 2 * Math.max(Math.abs(local.x), Math.abs(local.y))));
  const baseSize = Math.min(512, Math.max(8, nextSize / Math.max(scaleX, scaleY)));
  state.symbol.size = (baseSize / 512) * 100;
  const topLeftX = centerX - nextSize / 2;
  const topLeftY = centerY - nextSize / 2;
  updateSymbolFromTopLeft(topLeftX, topLeftY);
  syncControls();
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
  try {
    if (navigator.permissions?.query) {
      const permission = await navigator.permissions.query({ name: "clipboard-write" });
      if (permission.state === "denied") {
        setStatus("Clipboard permission denied.", true);
        return false;
      }
    }
  } catch (error) {
    console.warn("Clipboard permission check failed", error);
  }
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
  if (!input) return;
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
    radialHandlePoint: { x: 512, y: 256 },
    imageSrc: "",
    imageName: "",
  });
  Object.assign(state.symbol, {
    size: 60,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 100,
    scaleX: 100,
    scaleY: 100,
    shearX: 0,
    shearY: 0,
    tintEnabled: false,
    tintColor: "#ffffff",
    name: "",
  });
  Object.assign(state.text, {
    layers: [
      {
        value: "",
        font: "'SF Pro', system-ui",
        size: 28,
        weight: 600,
        color: "#ffffff",
        strokeEnabled: false,
        strokeColor: "#000000",
        strokeWidth: 2,
        x: 256,
        y: 488,
      },
    ],
    activeIndex: 0,
  });
  state.guides = false;
  clearSymbol();
  clearBackgroundImage();
  syncControls();
  render();
}

function clearBackgroundImage() {
  if (backgroundImageAnimationFrame) {
    cancelAnimationFrame(backgroundImageAnimationFrame);
    backgroundImageAnimationFrame = null;
  }
  if (backgroundImageUrl) {
    URL.revokeObjectURL(backgroundImageUrl);
  }
  backgroundImageUrl = "";
  backgroundImageIsAnimated = false;
  backgroundImage.src = "";
  state.background.imageSrc = "";
  state.background.imageName = "";
}

function loadBackgroundImage(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Please upload an image file.", true);
    return;
  }
  const isAnimatedGif = file.type === "image/gif";
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    setStatus("Image too large (max 25MB).", true);
    return;
  }
  if (backgroundImageUrl) {
    URL.revokeObjectURL(backgroundImageUrl);
  }
  backgroundImageUrl = URL.createObjectURL(file);
  backgroundImageIsAnimated = isAnimatedGif;
  backgroundImage.onload = () => {
    const maxDimension = 4096;
    if (backgroundImage.naturalWidth > maxDimension || backgroundImage.naturalHeight > maxDimension) {
      setStatus("Image resolution too large (max 4096px).", true);
      clearBackgroundImage();
      syncControls();
      render();
      return;
    }
    state.background.imageSrc = backgroundImageUrl;
    state.background.imageName = file.name;
    syncControls();
    saveState();
    render();
    if (backgroundImageIsAnimated) {
      scheduleBackgroundAnimation();
    }
  };
  backgroundImage.onerror = () => {
    setStatus("Failed to load image.", true);
    clearBackgroundImage();
    syncControls();
    render();
  };
  backgroundImage.src = backgroundImageUrl;
}

function scheduleBackgroundAnimation() {
  if (backgroundImageAnimationFrame) {
    return;
  }
  const tick = () => {
    backgroundImageAnimationFrame = requestAnimationFrame(tick);
    render();
  };
  backgroundImageAnimationFrame = requestAnimationFrame(tick);
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

controlEls.iconBrowseToggle.addEventListener("click", () => {
  const willOpen = controlEls.iconBrowser.hidden;
  controlEls.iconBrowser.hidden = !willOpen;
  controlEls.iconBrowseToggle.setAttribute("aria-expanded", String(willOpen));
});

controlEls.clearSymbol.addEventListener("click", () => {
  clearSymbol();
});

bindControl(controlEls.symbolPosX, () => {
  const next = Number(controlEls.symbolPosX.value);
  const clamped = Math.min(512, Math.max(0, next));
  const current = getSymbolTopLeft();
  updateSymbolFromTopLeft(clamped, current.y);
  syncControls();
});

bindControl(controlEls.symbolPosY, () => {
  const next = Number(controlEls.symbolPosY.value);
  const clamped = Math.min(512, Math.max(0, next));
  const current = getSymbolTopLeft();
  updateSymbolFromTopLeft(current.x, clamped);
  syncControls();
});

bindControl(controlEls.symbolRotation, () => {
  state.symbol.rotation = Number(controlEls.symbolRotation.value);
  syncControls();
});

bindControl(controlEls.symbolOpacity, () => {
  state.symbol.opacity = Number(controlEls.symbolOpacity.value);
});

bindControl(controlEls.symbolScaleRange, () => {
  const next = Number(controlEls.symbolScaleRange.value);
  state.symbol.scaleX = next;
  state.symbol.scaleY = next;
  if (controlEls.symbolScale) {
    controlEls.symbolScale.value = String(next);
  }
  syncControls();
});

bindControl(controlEls.symbolScale, () => {
  const next = Number(controlEls.symbolScale.value);
  const clamped = Math.min(200, Math.max(10, next));
  state.symbol.scaleX = clamped;
  state.symbol.scaleY = clamped;
  if (controlEls.symbolScaleRange) {
    controlEls.symbolScaleRange.value = String(clamped);
  }
  syncControls();
});

bindControl(controlEls.symbolShearX, () => {
  state.symbol.shearX = Number(controlEls.symbolShearX.value);
  syncControls();
});

bindControl(controlEls.symbolShearY, () => {
  state.symbol.shearY = Number(controlEls.symbolShearY.value);
  syncControls();
});

if (controlEls.symbolTint) {
  controlEls.symbolTint.addEventListener("change", () => {
    state.symbol.tintEnabled = controlEls.symbolTint.checked;
    saveState();
    render();
  });
}

controlEls.symbolTintColor.addEventListener("input", () => {
  state.symbol.tintColor = controlEls.symbolTintColor.value;
  saveState();
  render();
});

bindControl(controlEls.backgroundMode, () => {
  state.background.mode = controlEls.backgroundMode.value;
  if (state.background.mode === "solid" || state.background.mode === "image") {
    state.background.editing = false;
  }
  controlEls.backgroundGradientToggle.setAttribute("aria-pressed", String(state.background.editing));
  syncBackgroundPickerVisibility();
  render();
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
  if (controlEls.backgroundGradientDial) {
    controlEls.backgroundGradientDial.setAttribute("aria-valuenow", String(state.background.gradientAngle));
  }
  if (controlEls.backgroundGradientIndicator) {
    controlEls.backgroundGradientIndicator.style.transform = `rotate(${state.background.gradientAngle}deg)`;
  }
  setGradientPointsFromAngle(state.background.gradientAngle);
});

bindControl(controlEls.textValue, () => {
  getActiveTextLayer().value = controlEls.textValue.value;
  renderTextLayerList();
});

bindControl(controlEls.textFont, () => {
  getActiveTextLayer().font = controlEls.textFont.value;
});

bindControl(controlEls.textSize, () => {
  const next = Number(controlEls.textSize.value);
  getActiveTextLayer().size = next;
});

if (controlEls.textWeight) {
  bindControl(controlEls.textWeight, () => {
    getActiveTextLayer().weight = Number(controlEls.textWeight.value);
  });
}

bindControl(controlEls.textColor, () => {
  getActiveTextLayer().color = controlEls.textColor.value;
});

bindControl(controlEls.textPosX, () => {
  getActiveTextLayer().x = Number(controlEls.textPosX.value);
});

bindControl(controlEls.textPosY, () => {
  getActiveTextLayer().y = Number(controlEls.textPosY.value);
});

controlEls.textStroke.addEventListener("change", () => {
  getActiveTextLayer().strokeEnabled = controlEls.textStroke.checked;
  saveState();
  render();
});

bindControl(controlEls.textStrokeColor, () => {
  getActiveTextLayer().strokeColor = controlEls.textStrokeColor.value;
});

bindControl(controlEls.textStrokeWidth, () => {
  getActiveTextLayer().strokeWidth = Number(controlEls.textStrokeWidth.value);
});

if (controlEls.textLayerAdd) {
  controlEls.textLayerAdd.addEventListener("click", () => {
    ensureTextLayers();
    state.text.layers.push({
      value: "",
      font: "'SF Pro', system-ui",
      size: 36,
      weight: 600,
      color: "#ffffff",
      strokeEnabled: false,
      strokeColor: "#000000",
      strokeWidth: 2,
      x: 256,
      y: 488,
    });
    state.text.activeIndex = state.text.layers.length - 1;
    syncControls();
    saveState();
    render();
  });
}

if (controlEls.textLayerRemove) {
  controlEls.textLayerRemove.addEventListener("click", () => {
    ensureTextLayers();
    if (state.text.layers.length <= 1) {
      state.text.layers[0].value = "";
      syncControls();
      saveState();
      render();
      return;
    }
    state.text.layers.splice(state.text.activeIndex, 1);
    state.text.activeIndex = Math.max(0, state.text.activeIndex - 1);
    syncControls();
    saveState();
    render();
  });
}

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

if (controlEls.resetTransform) {
  controlEls.resetTransform.addEventListener("click", () => {
    resetSymbolTransform();
  });
}

if (controlEls.resetAppearance) {
  controlEls.resetAppearance.addEventListener("click", () => {
    resetSymbolAppearance();
  });
}

if (controlEls.resetTextTransform) {
  controlEls.resetTextTransform.addEventListener("click", () => {
    resetTextTransform();
  });
}

controlEls.backgroundGradientToggle.addEventListener("click", () => {
  if (state.background.mode === "solid" || state.background.mode === "image") {
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

if (controlEls.backgroundImageUpload && controlEls.backgroundImageInput) {
  controlEls.backgroundImageUpload.addEventListener("click", () => {
    controlEls.backgroundImageInput.click();
  });
  controlEls.backgroundImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    loadBackgroundImage(file);
    event.target.value = "";
  });
}

controlEls.tabSymbol.addEventListener("click", () => setActiveTab("tab-symbol"));
controlEls.tabBackground.addEventListener("click", () => setActiveTab("tab-background"));
controlEls.tabText.addEventListener("click", () => setActiveTab("tab-text"));

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

document.querySelectorAll(".drag-label").forEach((label) => {
  let startX = 0;
  let startValue = 0;
  let activeInput = null;

  const onPointerMove = (event) => {
    if (!activeInput) return;
    const step = Number(label.dataset.step || "1");
    const delta = Math.round((event.clientX - startX) / 4) * step;
    const min = Number(activeInput.min ?? "-Infinity");
    const max = Number(activeInput.max ?? "Infinity");
    const next = Math.min(max, Math.max(min, startValue + delta));
    activeInput.value = String(next);
    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const onPointerUp = () => {
    activeInput = null;
    label.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  label.addEventListener("pointerdown", (event) => {
    const targetId = label.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    event.preventDefault();
    activeInput = input;
    startX = event.clientX;
    startValue = Number(input.value || "0");
    label.classList.add("is-dragging");
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  });
});

document.addEventListener("pointerdown", (event) => {
  const label = event.target.closest?.("[data-reset-target]");
  if (!label) return;
  if (event.button !== 0) return;
  if (label.classList.contains("is-dragging")) return;
  event.preventDefault();
  label.setPointerCapture?.(event.pointerId);
  startHoldReset(label);
  const cancel = () => {
    endHoldReset();
    window.removeEventListener("pointerup", cancel);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("pointermove", onMove);
  };
  const onMove = (moveEvent) => {
    if (Math.abs(moveEvent.movementX) > 2 || Math.abs(moveEvent.movementY) > 2) {
      cancel();
    }
  };
  window.addEventListener("pointerup", cancel);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", cancel);
  window.addEventListener("pointermove", onMove);
});

if (controlEls.symbolRotationDial) {
  const updateRotationFromDial = (event) => {
    const rect = controlEls.symbolRotationDial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const angle = Math.atan2(dy, dx);
    let degrees = Math.round((angle * 180) / Math.PI + 90);
    if (degrees > 180) degrees -= 360;
    if (degrees < -180) degrees += 360;
    state.symbol.rotation = normalizeRotation(degrees);
    syncControls();
    saveState();
    render();
  };

  controlEls.symbolRotationDial.addEventListener("pointerdown", (event) => {
    controlEls.symbolRotationDial.setPointerCapture(event.pointerId);
    updateRotationFromDial(event);
  });

  controlEls.symbolRotationDial.addEventListener("pointermove", (event) => {
    if (controlEls.symbolRotationDial.hasPointerCapture(event.pointerId)) {
      updateRotationFromDial(event);
    }
  });

  controlEls.symbolRotationDial.addEventListener("pointerup", (event) => {
    if (controlEls.symbolRotationDial.hasPointerCapture(event.pointerId)) {
      controlEls.symbolRotationDial.releasePointerCapture(event.pointerId);
    }
  });

  controlEls.symbolRotationDial.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      state.symbol.rotation = normalizeRotation(state.symbol.rotation + 1);
      syncControls();
      saveState();
      render();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      state.symbol.rotation = normalizeRotation(state.symbol.rotation - 1);
      syncControls();
      saveState();
      render();
    }
  });
}

if (controlEls.backgroundGradientDial) {
  const updateGradientFromDial = (event) => {
    const rect = controlEls.backgroundGradientDial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const angle = Math.atan2(dy, dx);
    let degrees = Math.round((angle * 180) / Math.PI + 90);
    if (degrees < 0) degrees += 360;
    if (degrees >= 360) degrees -= 360;
    state.background.gradientAngle = degrees;
    syncControls();
    setGradientPointsFromAngle(state.background.gradientAngle);
    saveState();
    render();
  };

  controlEls.backgroundGradientDial.addEventListener("pointerdown", (event) => {
    controlEls.backgroundGradientDial.setPointerCapture(event.pointerId);
    updateGradientFromDial(event);
  });

  controlEls.backgroundGradientDial.addEventListener("pointermove", (event) => {
    if (controlEls.backgroundGradientDial.hasPointerCapture(event.pointerId)) {
      updateGradientFromDial(event);
    }
  });

  controlEls.backgroundGradientDial.addEventListener("pointerup", (event) => {
    if (controlEls.backgroundGradientDial.hasPointerCapture(event.pointerId)) {
      controlEls.backgroundGradientDial.releasePointerCapture(event.pointerId);
    }
  });

  controlEls.backgroundGradientDial.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      state.background.gradientAngle = (state.background.gradientAngle + 1) % 360;
      syncControls();
      setGradientPointsFromAngle(state.background.gradientAngle);
      saveState();
      render();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      state.background.gradientAngle = (state.background.gradientAngle + 359) % 360;
      syncControls();
      setGradientPointsFromAngle(state.background.gradientAngle);
      saveState();
      render();
    }
  });
}

previewCanvas.addEventListener("pointerdown", (event) => {
  const point = getPointerPosition(event);
  const isSymbolTabActive = activeTabId === "tab-symbol";
  if (isSymbolTabActive && symbolImage) {
    const handle = getSymbolHandleAtPoint(point);
    const rotateHandle = handle ? null : getSymbolRotateHandleAtPoint(point);
    if (handle || rotateHandle || isPointInSymbol(point)) {
      state.symbol.editing = true;
      if (handle) {
        activeSymbolHandle = handle;
        symbolDragMode = "resize";
      } else if (rotateHandle) {
        activeSymbolHandle = rotateHandle;
        symbolDragMode = "rotate";
      } else {
        activeSymbolHandle = null;
        symbolDragMode = "move";
      }
      const { size, centerX, centerY, rotation } = getSymbolMetrics();
      symbolDragStart = {
        point,
        centerX,
        centerY,
        size,
        rotation,
        offsetX: point.x - centerX,
        offsetY: point.y - centerY,
        angle: Math.atan2(point.y - centerY, point.x - centerX),
      };
      symbolDragMoved = false;
      previewCanvas.setPointerCapture(event.pointerId);
      render();
      return;
    }
  }
  if (activeTabId === "tab-text") {
    const hitIndex = getTextLayerIndexAtPoint(point);
    if (hitIndex != null) {
      state.text.activeIndex = hitIndex;
      textDragIndex = hitIndex;
      textDragStart = {
        point,
        layerX: state.text.layers[hitIndex].x,
        layerY: state.text.layers[hitIndex].y,
      };
      textDragAxis = null;
      previewCanvas.setPointerCapture(event.pointerId);
      syncControls();
      render();
      return;
    }
  }
  if (activeTabId !== "tab-background") return;
  if (state.background.mode !== "gradient" && state.background.mode !== "radial") return;
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
  const point = getPointerPosition(event);
  if (textDragIndex != null) {
    const layer = state.text.layers[textDragIndex];
    const dx = point.x - (textDragStart?.point.x ?? point.x);
    const dy = point.y - (textDragStart?.point.y ?? point.y);
    if (!event.shiftKey) {
      textDragAxis = null;
    } else if (!textDragAxis) {
      textDragAxis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    let nextX = (textDragStart?.layerX ?? layer.x) + dx;
    let nextY = (textDragStart?.layerY ?? layer.y) + dy;
    if (textDragAxis === "x") {
      nextY = textDragStart?.layerY ?? layer.y;
    }
    if (textDragAxis === "y") {
      nextX = textDragStart?.layerX ?? layer.x;
    }
    layer.x = Math.min(512, Math.max(0, nextX));
    layer.y = Math.min(512, Math.max(0, nextY));
    syncControls();
    render();
    return;
  }
  if (symbolDragMode) {
    symbolDragMoved = true;
    if (symbolDragMode === "resize") {
      resizeSymbolFromPointer(point);
    } else if (symbolDragMode === "move") {
      const { size } = getSymbolMetrics();
      const offsetX = symbolDragStart?.offsetX ?? 0;
      const offsetY = symbolDragStart?.offsetY ?? 0;
      const centerX = point.x - offsetX;
      const centerY = point.y - offsetY;
      updateSymbolFromTopLeft(centerX - size / 2, centerY - size / 2);
      syncControls();
    } else if (symbolDragMode === "rotate") {
      const centerX = symbolDragStart?.centerX ?? 256;
      const centerY = symbolDragStart?.centerY ?? 256;
      const startRotation = symbolDragStart?.rotation ?? 0;
      const startAngle = symbolDragStart?.angle ?? 0;
      const currentAngle = Math.atan2(point.y - centerY, point.x - centerX);
      const delta = ((currentAngle - startAngle) * 180) / Math.PI;
      let nextRotation = startRotation + delta;
      if (event.shiftKey) {
        nextRotation = Math.round(nextRotation / 45) * 45;
      }
      state.symbol.rotation = normalizeRotation(nextRotation);
      syncControls();
    }
    render();
    return;
  }
  updateSymbolCursor(point);
  if (!activeGradientHandle && !activeRadialHandle) return;
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
      const clampedCenter = {
        x: Math.min(512, Math.max(0, point.x)),
        y: Math.min(512, Math.max(0, point.y)),
      };
      const handle = getRadialHandlePoint();
      const radius = Math.hypot(handle.x - clampedCenter.x, handle.y - clampedCenter.y);
      state.background.radialCenter = clampedCenter;
      state.background.radialRadius = Math.min(512, Math.max(12, radius));
    } else {
      const center = state.background.radialCenter;
      const clampedPoint = {
        x: Math.min(512, Math.max(0, point.x)),
        y: Math.min(512, Math.max(0, point.y)),
      };
      const radius = Math.hypot(clampedPoint.x - center.x, clampedPoint.y - center.y);
      state.background.radialHandlePoint = clampedPoint;
      state.background.radialRadius = Math.min(512, Math.max(12, radius));
    }
  }
  render();
});

previewCanvas.addEventListener("pointerup", (event) => {
  if (previewCanvas.hasPointerCapture(event.pointerId)) {
    previewCanvas.releasePointerCapture(event.pointerId);
  }
  if (textDragIndex != null) {
    textDragIndex = null;
    textDragStart = null;
    textDragAxis = null;
    saveState();
    render();
    return;
  }
  if (symbolDragMode) {
    activeSymbolHandle = null;
    symbolDragMoved = false;
    symbolDragMode = null;
    symbolDragStart = null;
    updateSymbolCursor(getPointerPosition(event));
    saveState();
    render();
    return;
  }
  if (!state.background.editing) return;
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
  if (event.target === previewCanvas) return;
  let needsRender = false;
  if (state.background.editing) {
    state.background.editing = false;
    activeGradientHandle = null;
    gradientDragMoved = false;
    activeRadialHandle = null;
    radialDragMoved = false;
    hideGradientColorPicker();
    controlEls.backgroundGradientToggle.setAttribute("aria-pressed", "false");
    needsRender = true;
  }
  if (state.symbol.editing) {
    state.symbol.editing = false;
    activeSymbolHandle = null;
    symbolDragMoved = false;
    symbolDragMode = null;
    symbolDragStart = null;
    needsRender = true;
  }
  if (textDragIndex != null) {
    textDragIndex = null;
    textDragStart = null;
    textDragAxis = null;
    needsRender = true;
  }
  if (needsRender) {
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
if (state.background.imageSrc) {
  backgroundImageIsAnimated = state.background.imageSrc.toLowerCase().endsWith(".gif");
  backgroundImage.onload = () => {
    render();
    if (backgroundImageIsAnimated) {
      scheduleBackgroundAnimation();
    }
  };
  backgroundImage.onerror = () => {
    clearBackgroundImage();
    syncControls();
    render();
  };
  backgroundImageUrl = state.background.imageSrc;
  backgroundImage.src = state.background.imageSrc;
}
ensureGradientPoints();
ensureRadialDefaults();
syncControls();
setActiveTab("tab-symbol");
setSymbolMode(state.symbol.source === "upload" ? "upload" : "library");
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
function resetSymbolTransform() {
  state.symbol.x = 0;
  state.symbol.y = 0;
  state.symbol.rotation = 0;
  state.symbol.scaleX = 100;
  state.symbol.scaleY = 100;
  state.symbol.shearX = 0;
  state.symbol.shearY = 0;
  syncControls();
  saveState();
  render();
}

function resetSymbolAppearance() {
  state.symbol.opacity = 100;
  state.symbol.tintEnabled = false;
  state.symbol.tintColor = "#ffffff";
  syncControls();
  saveState();
  render();
}

function resetTextTransform() {
  const layer = getActiveTextLayer();
  layer.x = 256;
  layer.y = 488;
  layer.size = 36;
  syncControls();
  saveState();
  render();
}
