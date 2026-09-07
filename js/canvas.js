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

    // Drawing States
    this.isDrawing = false;
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
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual resolution
    this.canvas.width = (rect.width || 800) * dpr;
    this.canvas.height = Math.max(rect.height || 1000, 1000) * dpr;

    // Reset transform and scale for high DPI
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.dpr = dpr;
  }

  resizeCanvas() {
    // Save current drawing
    const currentData = this.canvas.toDataURL();
    this.setupCanvasResolution();
    // Restore drawing
    this.loadFromDataUrl(currentData);
  }

  bindEvents() {
    // Use PointerEvents for unified Mouse, Touch, and Stylus Pen support
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    // Logical dimensions of the canvas in CSS pixels
    const logicalWidth = this.canvas.width / (this.dpr || 1);
    const logicalHeight = this.canvas.height / (this.dpr || 1);

    // Calculate exact scaling ratio between rendered CSS element size and logical canvas size
    const scaleX = rect.width > 0 ? (logicalWidth / rect.width) : 1;
    const scaleY = rect.height > 0 ? (logicalHeight / rect.height) : 1;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      pressure: e.pressure > 0 ? e.pressure : 0.5
    };
  }

  onPointerDown(e) {
    // Only handle primary pointer (e.g. left click or single touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isDrawing = true;
    this.canvas.setPointerCapture(e.pointerId);

    const pos = this.getPointerPos(e);
    this.points = [pos];

    this.saveState(); // Save current canvas for undo before new stroke
  }

  onPointerMove(e) {
    if (!this.isDrawing) return;

    const pos = this.getPointerPos(e);
    this.points.push(pos);

    this.drawStroke(this.points);
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Finalize stroke
    if (this.points.length > 0) {
      this.drawStroke(this.points, true);
    }
    this.points = [];
    this.redoStack = []; // Clear redo on new action
    this.onUpdate();
  }

  drawStroke(points, isFinal = false) {
    if (points.length < 2) return;

    this.ctx.save();

    // Tool Configurations
    if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0,0,0,1)';
      this.ctx.lineWidth = this.strokeWidth * 4; // Eraser is wider
    } else if (this.currentTool === 'highlighter') {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 0.35;
      this.ctx.strokeStyle = this.currentColor;
      this.ctx.lineWidth = this.strokeWidth * 3.5;
    } else {
      // Standard Pen (Ballpoint / Fountain)
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1.0;
      this.ctx.strokeStyle = this.currentColor;
      // Adjust line width slightly with pressure if available
      const latestPoint = points[points.length - 1];
      const pressureMultiplier = 0.6 + (latestPoint.pressure * 0.8);
      this.ctx.lineWidth = this.strokeWidth * pressureMultiplier;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw smooth quadratic bezier curve between last points
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];

    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    
    // Midpoint curve interpolation for silky smoothness
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    this.ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
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
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.ctx.scale(this.dpr, this.dpr);
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
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      this.ctx.restore();
      this.ctx.scale(this.dpr, this.dpr);
    };
    img.src = dataUrl;
  }

  clearDirectly() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
    this.ctx.scale(this.dpr, this.dpr);
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
