/**
 * NoteCraft - Main Application Orchestrator
 */
import { StorageManager } from './storage.js';
import { BlockEditor } from './editor.js';
import { DrawingCanvas } from './canvas.js';
import { SidebarManager } from './sidebar.js';

class NoteCraftApp {
  constructor() {
    this.currentNote = null;
    this.saveTimeout = null;

    // DOM Elements
    this.titleInput = document.getElementById('note-title-input');
    this.pageEmoji = document.getElementById('page-emoji');
    this.breadcrumbDocTitle = document.getElementById('current-doc-breadcrumb');
    this.updatedAtLabel = document.getElementById('note-updated-at');
    this.saveStatus = document.getElementById('save-status');
    this.btnToggleFav = document.getElementById('btn-toggle-favorite');
    this.favIcon = document.getElementById('favorite-icon');
    this.btnDeleteNote = document.getElementById('btn-delete-note');
    this.btnExportPdf = document.getElementById('btn-export-pdf');

    // Emoji Modal Elements
    this.emojiModal = document.getElementById('emoji-picker-modal');
    this.emojiGrid = document.getElementById('emoji-grid');
    this.btnCloseEmoji = document.getElementById('btn-close-emoji');
    this.emojiBackdrop = document.getElementById('emoji-backdrop');

    // Initialize Subsystems
    this.init();
  }

  init() {
    // 1. Theme setup
    const savedTheme = StorageManager.getTheme();
    if (savedTheme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
      const themeText = document.querySelector('#btn-theme-toggle .theme-text');
      const themeIcon = document.querySelector('#btn-theme-toggle .theme-icon');
      if (themeText) themeText.textContent = '라이트 모드';
      if (themeIcon) themeIcon.className = 'fa-solid fa-sun theme-icon';
    }

    // 2. Editor & Canvas Instances
    this.editor = new BlockEditor('blocks-editor', {
      onUpdate: () => this.triggerAutoSave()
    });

    this.canvas = new DrawingCanvas('drawing-canvas', {
      onUpdate: () => this.triggerAutoSave()
    });

    // 3. Sidebar Instance
    this.sidebar = new SidebarManager({
      onSelectNote: (id) => this.switchNote(id),
      onCreateNote: () => this.createNote(),
      onDeleteNote: (id) => this.deleteNote(id),
      onToggleFavorite: (id) => this.toggleFavorite(id)
    });

    // 4. View Mode Selectors (Split, Text, Canvas)
    this.setupViewModes();

    // 5. Note Header Events (Title & Emoji)
    this.setupHeaderEvents();

    // 6. Emoji Modal setup
    this.setupEmojiPicker();

    // 7. Load Initial Note
    const initialId = StorageManager.getCurrentNoteId();
    this.switchNote(initialId);
  }

  setupViewModes() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mode = btn.getAttribute('data-mode');
        document.body.classList.remove('mode-split', 'mode-text', 'mode-canvas');
        document.body.classList.add(`mode-${mode}`);

        if (mode === 'text') {
          document.body.classList.remove('canvas-active');
        } else if (mode === 'canvas') {
          document.body.classList.add('canvas-active');
        }
      });
    });

    // Default to split mode
    document.body.classList.add('mode-split');
  }

  setupHeaderEvents() {
    // Title changes
    this.titleInput.addEventListener('input', () => {
      if (this.currentNote) {
        this.currentNote.title = this.titleInput.value || '제목 없음';
        this.breadcrumbDocTitle.textContent = this.currentNote.title;
        this.sidebar.render();
        this.triggerAutoSave();
      }
    });

    // Header favorite button
    this.btnToggleFav.addEventListener('click', () => {
      if (this.currentNote) {
        this.toggleFavorite(this.currentNote.id);
      }
    });

    // Header delete button
    this.btnDeleteNote.addEventListener('click', () => {
      if (!this.currentNote) return;
      if (confirm(`'${this.currentNote.title}' 노트를 삭제하시겠습니까?`)) {
        this.deleteNote(this.currentNote.id);
      }
    });

    // PDF / Print button
    this.btnExportPdf.addEventListener('click', () => {
      window.print();
    });
  }

  setupEmojiPicker() {
    const emojis = [
      '📝', '📌', '💡', '✨', '🚀', '🎯', '🔥', '💻', 
      '🎨', '📚', '⭐', '☕', '🗓️', '💼', '📊', '📈', 
      '🌱', '🏷️', '✅', '❤️', '🔍', '⚙️', '💬', '🎉'
    ];

    this.emojiGrid.innerHTML = '';
    emojis.forEach(emo => {
      const btn = document.createElement('button');
      btn.className = 'emoji-btn';
      btn.textContent = emo;
      btn.addEventListener('click', () => {
        if (this.currentNote) {
          this.currentNote.emoji = emo;
          this.pageEmoji.textContent = emo;
          this.sidebar.render();
          this.triggerAutoSave();
        }
        this.hideEmojiModal();
      });
      this.emojiGrid.appendChild(btn);
    });

    this.pageEmoji.addEventListener('click', () => {
      this.emojiModal.classList.remove('hidden');
    });

    this.btnCloseEmoji.addEventListener('click', () => this.hideEmojiModal());
    this.emojiBackdrop.addEventListener('click', () => this.hideEmojiModal());
  }

  hideEmojiModal() {
    this.emojiModal.classList.add('hidden');
  }

  // --- Note Lifecycle Operations ---
  switchNote(id) {
    // Save current if exists
    if (this.currentNote) {
      this.saveCurrentNoteImmediately();
    }

    const note = StorageManager.getNoteById(id);
    if (!note) return;

    this.currentNote = note;
    StorageManager.setCurrentNoteId(id);

    // Update UI Elements
    this.titleInput.value = note.title === '제목 없음' ? '' : note.title;
    this.breadcrumbDocTitle.textContent = note.title || '제목 없음';
    this.pageEmoji.textContent = note.emoji || '📝';
    this.updateTimeLabel(note.updatedAt);
    this.updateFavoriteIcon(note.isFavorite);

    // Set paper template
    this.canvas.setPaperTemplate(note.template || 'lines');

    // Render Blocks in Editor
    this.editor.render(note.blocks || []);

    // Load Drawing onto Canvas
    this.canvas.loadFromDataUrl(note.canvasData || '');

    // Refresh Sidebar selection
    this.sidebar.render();
  }

  createNote() {
    const newNote = StorageManager.createNewNote();
    this.switchNote(newNote.id);
  }

  deleteNote(id) {
    const nextId = StorageManager.deleteNote(id);
    this.switchNote(nextId);
  }

  toggleFavorite(id) {
    const note = StorageManager.getNoteById(id);
    if (!note) return;
    note.isFavorite = !note.isFavorite;
    StorageManager.saveNote(note);

    if (this.currentNote && this.currentNote.id === id) {
      this.currentNote.isFavorite = note.isFavorite;
      this.updateFavoriteIcon(note.isFavorite);
    }
    this.sidebar.render();
  }

  updateFavoriteIcon(isFav) {
    if (isFav) {
      this.favIcon.className = 'fa-solid fa-star text-amber';
    } else {
      this.favIcon.className = 'fa-regular fa-star';
    }
  }

  updateTimeLabel(timestamp) {
    if (!timestamp) {
      this.updatedAtLabel.textContent = '최근 수정: 방금 전';
      return;
    }
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    this.updatedAtLabel.textContent = `최근 수정: 오늘 ${timeString}`;
  }

  // --- Auto-Save Mechanism ---
  triggerAutoSave() {
    this.saveStatus.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>저장 중...</span>';
    this.saveStatus.classList.add('saving');

    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentNoteImmediately();
    }, 400); // 400ms debounce
  }

  saveCurrentNoteImmediately() {
    if (!this.currentNote) return;

    // Collect latest data from components
    this.currentNote.title = this.titleInput.value.trim() || '제목 없음';
    this.currentNote.blocks = this.editor.getData();
    this.currentNote.canvasData = this.canvas.getDataUrl();
    this.currentNote.template = document.getElementById('paper-template-select').value;

    StorageManager.saveNote(this.currentNote);

    this.saveStatus.innerHTML = '<i class="fa-solid fa-check"></i><span>저장됨</span>';
    this.saveStatus.classList.remove('saving');
    this.updateTimeLabel(this.currentNote.updatedAt);
  }
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new NoteCraftApp();
});
