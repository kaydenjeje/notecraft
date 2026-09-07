/**
 * NoteCraft - GoodNotes-Style Drawing Canvas Engine
 * Hi-DPI canvas, pointer events with pressure support, smooth bezier curves,
 * pen/highlighter/eraser, undo/redo history, and paper templates.
 */

export class DrawingCanvas {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.onUpdate = options.onUpdate || (() => {});
    this.paperContainer = document.getElementById('note-paper-container');

    // Dedicated active stroke overlay canvas to eliminate overlapping joint dots
    let activeCanvas = document.getElementById('drawing-canvas-active');
    if (!activeCanvas && this.canvas && this.canvas.parentElement) {
      activeCanvas = document.createElement('canvas');
      activeCanvas.id = 'drawing-canvas-active';
      activeCanvas.style.position = 'absolute';
      activeCanvas.style.top = '0';
      activeCanvas.style.left = '0';
      activeCanvas.style.width = '100%';
      activeCanvas.style.height = '100%';
      activeCanvas.style.pointerEvents = 'none';
      this.canvas.parentElement.appendChild(activeCanvas);
    }
    this.activeCanvas = activeCanvas;
    if (this.activeCanvas) {
      this.activeCtx = this.activeCanvas.getContext('2d');
    }

    // Drawing States
    this.isDrawing = false;
    this.activePointerId = null;
    this.currentTool = 'pen'; // 'pen' | 'highlighter' | 'eraser'
    this.currentColor = '#1e293b';
    this.strokeWidth = 4;
    this.points = [];

    // History stack for Undo / Redo
    this.history = [];
    this.redoStack = [];
    this.maxHistory = 20;

    this.init();
  }

  init() {
    this.setupCanvasResolution();
    this.bindEvents();
    this.bindToolbarControls();

    // Listen for window resize to adjust canvas resolution without losing content
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  setupCanvasResolution() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const width = Math.round(container.clientWidth || rect.width || 800);
    const height = Math.round(container.clientHeight || rect.height || 800);

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.dpr = dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.activeCanvas) {
      this.activeCanvas.width = this.canvas.width;
      this.activeCanvas.height = this.canvas.height;
      this.activeCanvas.style.width = `${width}px`;
      this.activeCanvas.style.height = `${height}px`;
      if (this.activeCtx) {
        this.activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }

  resizeCanvas() {
    const currentData = this.canvas.toDataURL();
    this.setupCanvasResolution();
    this.loadFromDataUrl(currentData);
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
    this.canvas.addEventListener('lostpointercapture', (e) => this.onPointerCancel(e));

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.target === this.canvas) e.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.target === this.canvas) e.preventDefault();
    }, { passive: false });

    // Sync canvas resolution if container changes size
    const contentLayers = document.getElementById('note-content-layers');
    if (window.ResizeObserver && contentLayers) {
      const ro = new ResizeObserver(() => {
        if (this.isDrawing) return;
        const newH = contentLayers.clientHeight;
        const newW = contentLayers.clientWidth;
        const curH = this.canvas.height / (this.dpr || 1);
        const curW = this.canvas.width / (this.dpr || 1);
        if (newH > 0 && (Math.abs(newH - curH) > 30 || Math.abs(newW - curW) > 30)) {
          this.resizeCanvas();
        }
      });
      ro.observe(contentLayers);
    }
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const logicalWidth = this.canvas.width / (this.dpr || 1);
    const logicalHeight = this.canvas.height / (this.dpr || 1);

    const scaleX = rect.width > 0 ? (logicalWidth / rect.width) : 1;
    const scaleY = rect.height > 0 ? (logicalHeight / rect.height) : 1;

    let pressure = 0.5;
    if (typeof e.pressure === 'number' && e.pressure > 0) {
      pressure = e.pressure;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      pressure: Math.min(Math.max(pressure, 0.1), 1.0)
    };
  }

  onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (this.isDrawing) return;

    this.activePointerId = e.pointerId;
    this.isDrawing = true;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    const pos = this.getPointerPos(e);
    this.points = [pos];
    this.saveState();

    if (this.currentTool === 'eraser') {
      this.erasePoint(pos);
    } else {
      this.renderActiveStroke();
    }
  }

  onPointerMove(e) {
    if (!this.isDrawing) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    const pos = this.getPointerPos(e);
    this.points.push(pos);

    if (this.currentTool === 'eraser') {
      this.eraseSegment(this.points[this.points.length - 2], pos);
    } else {
      this.renderActiveStroke();
    }
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    this.isDrawing = false;
    this.activePointerId = null;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (this.currentTool !== 'eraser' && this.points.length > 0 && this.activeCanvas) {
      // Bake the clean, continuous stroke into main canvas at 1:1 physical resolution
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.drawImage(this.activeCanvas, 0, 0);
      this.ctx.restore();

      // Clear active stroke canvas
      if (this.activeCtx) {
        this.activeCtx.save();
        this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
        this.activeCtx.restore();
      }
    }

    this.points = [];
    this.redoStack = [];
    this.onUpdate();
  }

  onPointerCancel(e) {
    if (!this.isDrawing) return;
    if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

    this.isDrawing = false;
    this.activePointerId = null;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (this.activeCtx && this.activeCanvas) {
      this.activeCtx.save();
      this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
      this.activeCtx.restore();
    }
    this.points = [];
  }

  renderActiveStroke() {
    if (!this.activeCtx || this.points.length === 0) return;

    // Clear active canvas in physical coordinates
    this.activeCtx.save();
    this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
    this.activeCtx.restore();

    if (this.points.length === 1) {
      const pt = this.points[0];
      this.activeCtx.save();
      if (this.currentTool === 'highlighter') {
        this.activeCtx.globalAlpha = 0.35;
        this.activeCtx.fillStyle = this.currentColor;
        this.activeCtx.beginPath();
        this.activeCtx.arc(pt.x, pt.y, (this.strokeWidth * 3.5) / 2, 0, Math.PI * 2);
        this.activeCtx.fill();
      } else {
        this.activeCtx.globalAlpha = 1.0;
        this.activeCtx.fillStyle = this.currentColor;
        const radius = (this.strokeWidth * (0.6 + (pt.pressure * 0.8))) / 2;
        this.activeCtx.beginPath();
        this.activeCtx.arc(pt.x, pt.y, Math.max(radius, 1.5), 0, Math.PI * 2);
        this.activeCtx.fill();
      }
      this.activeCtx.restore();
      return;
    }

    // Render entire continuous path in a single GPU pass (prevents any joint dot overlap!)
    this.activeCtx.save();
    this.activeCtx.lineCap = 'round';
    this.activeCtx.lineJoin = 'round';

    if (this.currentTool === 'highlighter') {
      this.activeCtx.globalAlpha = 0.35;
      this.activeCtx.strokeStyle = this.currentColor;
      this.activeCtx.lineWidth = this.strokeWidth * 3.5;
    } else {
      this.activeCtx.globalAlpha = 1.0;
      this.activeCtx.strokeStyle = this.currentColor;
      const latestPoint = this.points[this.points.length - 1];
      const pressureMultiplier = 0.6 + (latestPoint.pressure * 0.8);
      this.activeCtx.lineWidth = this.strokeWidth * pressureMultiplier;
    }

    this.activeCtx.beginPath();
    this.activeCtx.moveTo(this.points[0].x, this.points[0].y);

    if (this.points.length === 2) {
      this.activeCtx.lineTo(this.points[1].x, this.points[1].y);
    } else {
      for (let i = 1; i < this.points.length - 1; i++) {
        const midX = (this.points[i].x + this.points[i + 1].x) / 2;
        const midY = (this.points[i].y + this.points[i + 1].y) / 2;
        this.activeCtx.quadraticCurveTo(this.points[i].x, this.points[i].y, midX, midY);
      }
      const last = this.points[this.points.length - 1];
      this.activeCtx.lineTo(last.x, last.y);
    }

    this.activeCtx.stroke();
    this.activeCtx.restore();
  }

  erasePoint(pt) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(0,0,0,1)';
    this.ctx.beginPath();
    this.ctx.arc(pt.x, pt.y, (this.strokeWidth * 4) / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  eraseSegment(p1, p2) {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.lineWidth = this.strokeWidth * 4;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  // --- History (Undo / Redo) ---
  saveState() {
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(this.canvas.toDataURL());
  }

  undo() {
    if (this.history.length === 0) return;
    this.redoStack.push(this.canvas.toDataURL());
    const prevState = this.history.pop();
    this.loadFromDataUrl(prevState);
    this.onUpdate();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.history.push(this.canvas.toDataURL());
    const nextState = this.redoStack.pop();
    this.loadFromDataUrl(nextState);
    this.onUpdate();
  }

  clear() {
    this.saveState();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.activeCtx && this.activeCanvas) {
      this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
      this.activeCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    this.redoStack = [];
    this.onUpdate();
  }

  loadFromDataUrl(dataUrl) {
    if (!dataUrl) {
      this.clearDirectly();
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      if (this.activeCtx && this.activeCanvas) {
        this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
        this.activeCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    };
    img.src = dataUrl;
  }

  clearDirectly() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.activeCtx && this.activeCanvas) {
      this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
      this.activeCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  getDataUrl() {
    // Check if canvas has any pixels
    return this.canvas.toDataURL('image/png');
  }

  // --- Toolbar Controls Binding ---
  bindToolbarControls() {
    // Tool buttons (Pen, Highlighter, Eraser)
    const toolBtns = document.querySelectorAll('.canvas-tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.getAttribute('data-tool');
        document.body.classList.add('canvas-active');
      });
    });

    // Color Swatches
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const customColorInput = document.getElementById('custom-color-picker');

    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.currentColor = swatch.getAttribute('data-color');
        if (customColorInput) customColorInput.value = this.currentColor;
        
        // Switch back to pen if on eraser
        if (this.currentTool === 'eraser') {
          const penBtn = document.querySelector('.canvas-tool-btn[data-tool="pen"]');
          if (penBtn) penBtn.click();
        }
      });
    });

    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        colorSwatches.forEach(s => s.classList.remove('active'));
        this.currentColor = e.target.value;
      });
    }

    // Stroke width buttons
    const strokeBtns = document.querySelectorAll('.stroke-btn');
    strokeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        strokeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.strokeWidth = parseInt(btn.getAttribute('data-size'), 10) || 4;
      });
    });

    // Paper template dropdown
    const templateSelect = document.getElementById('paper-template-select');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => {
        this.setPaperTemplate(e.target.value);
        this.onUpdate();
      });
    }

    // History buttons
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const clearBtn = document.getElementById('btn-clear-canvas');

    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
    if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('캔버스에 작성된 모든 필기를 지우시겠습니까?')) {
          this.clear();
        }
      });
    }
  }

  setPaperTemplate(templateName) {
    if (!this.paperContainer) return;
    this.paperContainer.classList.remove('paper-lines', 'paper-grid', 'paper-dots', 'paper-blank');
    this.paperContainer.classList.add(`paper-${templateName}`);

    const templateSelect = document.getElementById('paper-template-select');
    if (templateSelect && templateSelect.value !== templateName) {
      templateSelect.value = templateName;
    }
  }
}
