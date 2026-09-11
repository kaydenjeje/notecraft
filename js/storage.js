/**
 * NoteCraft - Storage Manager
 * Handles LocalStorage persistence, backup export/import, and initial templates
 */

const STORAGE_KEYS = {
  NOTES: 'notecraft_notes',
  CURRENT_ID: 'notecraft_current_doc_id',
  THEME: 'notecraft_theme'
};

// Initial Welcome Note with sample blocks
const WELCOME_NOTE = {
  id: 'welcome-guide',
  title: 'NoteCraft 시작 가이드 🚀',
  emoji: '✨',
  isFavorite: true,
  template: 'lines',
  blocks: [
    {
      id: 'b-welcome-1',
      type: 'h1',
      content: '노션과 굿노트의 완벽한 만남!'
    },
    {
      id: 'b-welcome-2',
      type: 'callout',
      content: '💡 <b>NoteCraft에 오신 것을 환영합니다!</b> 키보드로 정돈된 문서를 작성하면서, 동시에 펜으로 자유롭게 아이디어를 스케치해보세요.'
    },
    {
      id: 'b-welcome-3',
      type: 'h2',
      content: '1. 노션 스타일 블록 작성법'
    },
    {
      id: 'b-welcome-4',
      type: 'bullet',
      content: '빈 줄에서 <code>/</code> (슬래시)를 입력하면 제목, 체크리스트, 인용구 등 다양한 블록 메뉴가 나타납니다.'
    },
    {
      id: 'b-welcome-5',
      type: 'bullet',
      content: '텍스트를 드래그하여 선택하면 <b>굵게</b>, <i>기울임</i>, <span style="background-color: #fef08a;">형광펜</span> 등의 서식 툴바가 뜹니다.'
    },
    {
      id: 'b-welcome-6',
      type: 'bullet',
      content: '<code>Enter</code>를 누르면 바로 아래에 새 블록이 생성되고, 빈 블록에서 <code>Backspace</code>를 누르면 삭제됩니다.'
    },
    {
      id: 'b-welcome-7',
      type: 'h2',
      content: '2. 굿노트 스타일 손글씨 & 드로잉'
    },
    {
      id: 'b-welcome-8',
      type: 'todo',
      content: '상단 툴바에서 펜, 형광펜, 지우개를 선택해 바로 화면에 필기해보기',
      checked: false
    },
    {
      id: 'b-welcome-9',
      type: 'todo',
      content: '원하는 컬러 팔레트와 펜 굵기를 조절해보기',
      checked: true
    },
    {
      id: 'b-welcome-10',
      type: 'todo',
      content: '속지 템플릿(가로줄, 모눈종이, 도트, 무지)을 변경해보기',
      checked: false
    },
    {
      id: 'b-welcome-11',
      type: 'quote',
      content: '"생각을 정리하는 가장 자유로운 방법 - 텍스트와 드로잉을 하나의 페이지에 담으세요."'
    }
  ],
  canvasData: '', // Drawing canvas data URL
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export class StorageManager {
  static currentUser = null;

  static setCurrentUser(user) {
    this.currentUser = user;
  }

  static getStorage() {
    return (this.currentUser && this.currentUser.uid) ? localStorage : sessionStorage;
  }

  static getNotesKey() {
    if (this.currentUser && this.currentUser.uid) {
      return `${STORAGE_KEYS.NOTES}_user_${this.currentUser.uid}`;
    }
    return STORAGE_KEYS.NOTES;
  }

  static getCurrentIdKey() {
    if (this.currentUser && this.currentUser.uid) {
      return `${STORAGE_KEYS.CURRENT_ID}_user_${this.currentUser.uid}`;
    }
    return STORAGE_KEYS.CURRENT_ID;
  }

  static getNotes() {
    try {
      const storage = this.getStorage();
      const key = this.getNotesKey();
      const data = storage.getItem(key);
      if (!data) {
        // First visit: save initial welcome guide
        const initial = [WELCOME_NOTE];
        storage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load notes from storage', e);
      return [WELCOME_NOTE];
    }
  }

  static saveNotes(notes) {
    try {
      const storage = this.getStorage();
      const key = this.getNotesKey();
      storage.setItem(key, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save notes', e);
    }
  }

  static getNoteById(id) {
    const notes = this.getNotes();
    return notes.find(n => n.id === id) || null;
  }

  static getSyncQueueKey() {
    if (this.currentUser && this.currentUser.uid) {
      return `notecraft_sync_queue_user_${this.currentUser.uid}`;
    }
    return 'notecraft_sync_queue';
  }

  static getSyncQueue() {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(this.getSyncQueueKey());
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  static saveSyncQueue(queue) {
    try {
      const storage = this.getStorage();
      storage.setItem(this.getSyncQueueKey(), JSON.stringify(queue));
    } catch (_) {}
  }

  static enqueueSync(action, data) {
    const queue = this.getSyncQueue();
    if (action === 'save') {
      const existingIdx = queue.findIndex(item => item.action === 'save' && item.data.id === data.id);
      if (existingIdx >= 0) {
        queue[existingIdx] = { action, data, timestamp: Date.now() };
      } else {
        queue.push({ action, data, timestamp: Date.now() });
      }
    } else if (action === 'delete') {
      const filtered = queue.filter(item => !(item.action === 'save' && item.data.id === data.id));
      filtered.push({ action, data, timestamp: Date.now() });
      this.saveSyncQueue(filtered);
      return;
    }
    this.saveSyncQueue(queue);
  }

  static saveNote(updatedNote) {
    const notes = this.getNotes();
    const index = notes.findIndex(n => n.id === updatedNote.id);
    updatedNote.updatedAt = Date.now();

    if (index >= 0) {
      notes[index] = updatedNote;
    } else {
      notes.unshift(updatedNote);
    }
    this.saveNotes(notes);
    this.enqueueSync('save', updatedNote);
  }

  static createNewNote() {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: '제목 없음',
      emoji: '📝',
      isFavorite: false,
      template: 'lines',
      blocks: [
        {
          id: 'b_' + Date.now(),
          type: 'text',
          content: ''
        }
      ],
      canvasData: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const notes = this.getNotes();
    notes.unshift(newNote);
    this.saveNotes(notes);
    this.setCurrentNoteId(newNote.id);
    this.enqueueSync('save', newNote);
    return newNote;
  }

  static deleteNote(id) {
    let notes = this.getNotes();
    notes = notes.filter(n => n.id !== id);
    this.enqueueSync('delete', { id });
    if (notes.length === 0) {
      const newNote = this.createNewNote();
      return newNote.id;
    }
    this.saveNotes(notes);
    return notes[0].id;
  }

  static getCurrentNoteId() {
    const storage = this.getStorage();
    const key = this.getCurrentIdKey();
    const id = storage.getItem(key);
    if (id && this.getNoteById(id)) return id;
    const notes = this.getNotes();
    return notes[0] ? notes[0].id : null;
  }

  static setCurrentNoteId(id) {
    const storage = this.getStorage();
    const key = this.getCurrentIdKey();
    storage.setItem(key, id);
  }

  static getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  }

  static setTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }

  // Backup: JSON Export
  static exportBackup() {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      notes: this.getNotes()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notecraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Backup: JSON Import
  static importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (json && Array.isArray(json.notes)) {
            this.saveNotes(json.notes);
            if (json.notes.length > 0) {
              this.setCurrentNoteId(json.notes[0].id);
            }
            resolve(json.notes);
          } else {
            reject(new Error('올바른 백업 파일 형식이 아닙니다.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      reader.readAsText(file);
    });
  }
}
