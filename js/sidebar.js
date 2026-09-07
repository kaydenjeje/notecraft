/**
 * NoteCraft - Sidebar & Navigation Manager
 */
import { StorageManager } from './storage.js';

export class SidebarManager {
  constructor(options = {}) {
    this.onSelectNote = options.onSelectNote || (() => {});
    this.onCreateNote = options.onCreateNote || (() => {});
    this.onDeleteNote = options.onDeleteNote || (() => {});
    this.onToggleFavorite = options.onToggleFavorite || (() => {});

    // Elements
    this.sidebar = document.getElementById('sidebar');
    this.btnCollapse = document.getElementById('btn-collapse-sidebar');
    this.btnExpand = document.getElementById('btn-expand-sidebar');
    this.searchInput = document.getElementById('search-input');
    this.btnClearSearch = document.getElementById('btn-clear-search');
    this.btnNewNote = document.getElementById('btn-new-note');
    this.favoritesList = document.getElementById('favorites-list');
    this.notesList = document.getElementById('notes-list');
    this.notesCount = document.getElementById('notes-count');
    this.btnThemeToggle = document.getElementById('btn-theme-toggle');
    this.btnExport = document.getElementById('btn-backup-export');
    this.btnImport = document.getElementById('btn-backup-import');
    this.importFileInput = document.getElementById('import-file-input');

    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Collapse / Expand
    this.btnCollapse.addEventListener('click', () => {
      this.sidebar.classList.add('collapsed');
    });

    this.btnExpand.addEventListener('click', () => {
      this.sidebar.classList.remove('collapsed');
    });

    // New Note
    this.btnNewNote.addEventListener('click', () => {
      this.onCreateNote();
    });

    // Search
    this.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 0) {
        this.btnClearSearch.classList.remove('hidden');
      } else {
        this.btnClearSearch.classList.add('hidden');
      }
      this.render(query);
    });

    this.btnClearSearch.addEventListener('click', () => {
      this.searchInput.value = '';
      this.btnClearSearch.classList.add('hidden');
      this.render();
    });

    // Keyboard shortcut Ctrl+K for search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.sidebar.classList.remove('collapsed');
        this.searchInput.focus();
      }
    });

    // Theme toggle
    this.btnThemeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('theme-dark');
      document.body.classList.toggle('theme-light', !isDark);
      
      const themeText = this.btnThemeToggle.querySelector('.theme-text');
      const themeIcon = this.btnThemeToggle.querySelector('.theme-icon');
      
      if (isDark) {
        themeText.textContent = '라이트 모드';
        themeIcon.className = 'fa-solid fa-sun theme-icon';
        StorageManager.setTheme('dark');
      } else {
        themeText.textContent = '다크 모드';
        themeIcon.className = 'fa-solid fa-moon theme-icon';
        StorageManager.setTheme('light');
      }
    });

    // Backup Export & Import
    this.btnExport.addEventListener('click', () => {
      StorageManager.exportBackup();
    });

    this.btnImport.addEventListener('click', () => {
      this.importFileInput.click();
    });

    this.importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await StorageManager.importBackup(file);
        alert('노트 데이터를 성공적으로 복원했습니다!');
        location.reload();
      } catch (err) {
        alert(err.message || '가져오기 중 오류가 발생했습니다.');
      }
      this.importFileInput.value = '';
    });
  }

  render(searchQuery = '') {
    const notes = StorageManager.getNotes();
    const currentId = StorageManager.getCurrentNoteId();
    this.notesCount.textContent = notes.length;

    // Filter by query if any
    let filtered = notes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = notes.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const blockMatch = (n.blocks || []).some(b => (b.content || '').toLowerCase().includes(q));
        return titleMatch || blockMatch;
      });
    }

    // Separate favorites
    const favorites = filtered.filter(n => n.isFavorite);

    // Render Favorites
    this.favoritesList.innerHTML = '';
    if (favorites.length === 0) {
      this.favoritesList.innerHTML = `<li class="empty-hint" style="font-size:0.8rem; color:var(--text-muted); padding:4px 10px;">즐겨찾기한 노트가 없습니다.</li>`;
    } else {
      favorites.forEach(note => {
        const item = this.createNoteListItem(note, currentId);
        this.favoritesList.appendChild(item);
      });
    }

    // Render All Notes
    this.notesList.innerHTML = '';
    if (filtered.length === 0) {
      this.notesList.innerHTML = `<li class="empty-hint" style="font-size:0.8rem; color:var(--text-muted); padding:4px 10px;">일치하는 노트가 없습니다.</li>`;
    } else {
      filtered.forEach(note => {
        const item = this.createNoteListItem(note, currentId);
        this.notesList.appendChild(item);
      });
    }
  }

  createNoteListItem(note, currentId) {
    const li = document.createElement('li');
    li.className = `doc-item ${note.id === currentId ? 'active' : ''}`;
    li.setAttribute('data-id', note.id);

    li.innerHTML = `
      <div class="doc-item-main">
        <span class="doc-item-emoji">${note.emoji || '📝'}</span>
        <span class="doc-item-title">${note.title || '제목 없음'}</span>
      </div>
      <div class="doc-item-actions">
        <button class="doc-action-btn btn-fav" title="${note.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
          <i class="${note.isFavorite ? 'fa-solid text-amber' : 'fa-regular'} fa-star"></i>
        </button>
        <button class="doc-action-btn btn-del" title="삭제">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;

    // Click note to open
    li.addEventListener('click', (e) => {
      if (e.target.closest('.doc-action-btn')) return;
      this.onSelectNote(note.id);
    });

    // Favorite button
    const favBtn = li.querySelector('.btn-fav');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onToggleFavorite(note.id);
    });

    // Delete button
    const delBtn = li.querySelector('.btn-del');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`'${note.title || '제목 없음'}' 노트를 삭제하시겠습니까?`)) {
        this.onDeleteNote(note.id);
      }
    });

    return li;
  }
}
