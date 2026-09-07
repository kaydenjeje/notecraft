/**
 * NoteCraft - Standalone All-In-One Bundle
 * Guarantees 100% zero-dependency execution even when opening index.html directly via file://
 */
(function() {
  'use strict';

  // =========================================================================
  // 1. Storage Manager
  // =========================================================================
  const STORAGE_KEYS = {
    NOTES: 'notecraft_notes',
    CURRENT_ID: 'notecraft_current_doc_id',
    THEME: 'notecraft_theme'
  };

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
        content: '💡 <b>NoteCraft에 오신 것을 환영합니다!</b> 키보드로 정돈된 문서를 작성하면서, 상단 펜 도구로 자유롭게 스케치와 손글씨 메모를 남길 수 있습니다.'
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
        content: '텍스트를 마우스로 드래그하면 <b>굵게</b>, <i>기울임</i>, <span style="background-color: #fef08a; padding: 0 4px; border-radius: 2px;">형광펜</span> 서식 툴바가 뜹니다.'
      },
      {
        id: 'b-welcome-6',
        type: 'bullet',
        content: '<code>Enter</code>를 누르면 바로 아래 새 블록 생성, 빈 블록에서 <code>Backspace</code>를 누르면 삭제됩니다.'
      },
      {
        id: 'b-welcome-7',
        type: 'h2',
        content: '2. 굿노트 스타일 손글씨 & 필기 기능'
      },
      {
        id: 'b-welcome-8',
        type: 'todo',
        content: '상단 툴바에서 펜, 형광펜, 지우개를 선택해 캔버스에 직접 그려보기',
        checked: false
      },
      {
        id: 'b-welcome-9',
        type: 'todo',
        content: '선 색상 팔레트와 굵기를 취향에 맞게 바꿔보기',
        checked: true
      },
      {
        id: 'b-welcome-10',
        type: 'todo',
        content: '속지 템플릿(가로줄 노트, 모눈종이, 도트 그리드, 무지)을 변경해보기',
        checked: false
      },
      {
        id: 'b-welcome-11',
        type: 'quote',
        content: '"생각을 정리하는 가장 완벽한 방법 - 깔끔한 텍스트와 자유로운 필기를 하나의 노트에."'
      }
    ],
    canvasData: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  class StorageManager {
    static currentUser = null;

    static setCurrentUser(user) {
      this.currentUser = user;
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
        const key = this.getNotesKey();
        const data = localStorage.getItem(key);
        if (!data) {
          // If logged-in user, create personalized initial note
          const initial = this.currentUser ? [
            {
              id: 'note_user_' + Date.now(),
              title: `${this.currentUser.displayName || '내'} 첫 번째 메모 🔒`,
              emoji: '✨',
              isFavorite: true,
              template: 'lines',
              blocks: [
                {
                  id: 'b_u1',
                  type: 'h1',
                  content: `${this.currentUser.displayName || '내'} 클라우드 개인 서재`
                },
                {
                  id: 'b_u2',
                  type: 'callout',
                  content: `🔒 <b>구글 계정(${this.currentUser.email || ''}) 전용 보관함입니다.</b><br>오직 이 계정으로 로그인했을 때만 확인하고 편집할 수 있으며, PC와 스마트폰에서 실시간으로 동기화됩니다.`
                },
                {
                  id: 'b_u3',
                  type: 'todo',
                  content: '모바일 기기에서도 동일한 구글 계정으로 로그인해보기',
                  checked: false
                }
              ],
              canvasData: '',
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          ] : [WELCOME_NOTE];
          localStorage.setItem(key, JSON.stringify(initial));
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
        const key = this.getNotesKey();
        localStorage.setItem(key, JSON.stringify(notes));
      } catch (e) {
        console.error('Failed to save notes', e);
      }
    }

    static getNoteById(id) {
      const notes = this.getNotes();
      return notes.find(n => n.id === id) || null;
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

      // Trigger Cloud Firestore Sync if online
      if (window.cloudManager && window.cloudManager.isCloudActive() && this.currentUser) {
        window.cloudManager.syncNoteToFirestore(this.currentUser.uid, updatedNote);
      }
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

      if (window.cloudManager && window.cloudManager.isCloudActive() && this.currentUser) {
        window.cloudManager.syncNoteToFirestore(this.currentUser.uid, newNote);
      }

      return newNote;
    }

    static deleteNote(id) {
      let notes = this.getNotes();
      notes = notes.filter(n => n.id !== id);
      if (notes.length === 0) {
        const newNote = this.createNewNote();
        return newNote.id;
      }
      this.saveNotes(notes);

      if (window.cloudManager && window.cloudManager.isCloudActive() && this.currentUser) {
        window.cloudManager.deleteNoteFromFirestore(this.currentUser.uid, id);
      }

      return notes[0].id;
    }

    static getCurrentNoteId() {
      const key = this.getCurrentIdKey();
      const id = localStorage.getItem(key);
      if (id && this.getNoteById(id)) return id;
      const notes = this.getNotes();
      return notes[0] ? notes[0].id : null;
    }

    static setCurrentNoteId(id) {
      const key = this.getCurrentIdKey();
      localStorage.setItem(key, id);
    }

    static getTheme() {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    }

    static setTheme(theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }

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

  // =========================================================================
  // 2. Notion-Style Block Editor
  // =========================================================================
  class BlockEditor {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      this.onUpdate = options.onUpdate || (() => {});
      
      this.slashMenu = document.getElementById('slash-menu');
      this.slashItems = Array.from(document.querySelectorAll('.slash-item'));
      this.activeSlashIndex = 0;
      this.slashTargetBlock = null;
      this.formatToolbar = document.getElementById('format-toolbar');

      this.init();
    }

    init() {
      this.bindGlobalEvents();
      this.bindSlashMenuEvents();
      this.bindFormatToolbarEvents();
      this.bindPasteAndDrop();
      this.bindUploadInputs();
    }

    bindGlobalEvents() {
      document.addEventListener('mousedown', (e) => {
        if (!this.slashMenu.contains(e.target) && !e.target.closest('.block-content')) {
          this.hideSlashMenu();
        }
        if (!this.formatToolbar.contains(e.target)) {
          this.hideFormatToolbar();
        }
      });

      document.addEventListener('selectionchange', () => {
        this.handleSelectionChange();
      });
    }

    bindPasteAndDrop() {
      // 1. Clipboard Paste (Ctrl+V) for screenshots and copied images
      document.addEventListener('paste', (e) => {
        if (!e.clipboardData || !e.clipboardData.items) return;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
              this.insertImageBlock(event.target.result);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      });

      // 2. Drag & Drop files into editor
      window.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.container.classList.add('drag-over');
      });

      window.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || e.clientX === 0 || e.clientY === 0) {
          this.container.classList.remove('drag-over');
        }
      });

      window.addEventListener('drop', (e) => {
        e.preventDefault();
        this.container.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          Array.from(e.dataTransfer.files).forEach(file => {
            this.handleUploadedFile(file);
          });
        }
      });
    }

    bindUploadInputs() {
      this.imageInput = document.getElementById('image-block-input');
      this.fileInput = document.getElementById('file-block-input');
      this.targetUploadBlock = null;

      if (this.imageInput) {
        this.imageInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (this.targetUploadBlock) {
              this.changeBlockToImage(this.targetUploadBlock, ev.target.result, file.name);
            } else {
              this.insertImageBlock(ev.target.result, file.name);
            }
          };
          reader.readAsDataURL(file);
          this.imageInput.value = '';
        });
      }

      if (this.fileInput) {
        this.fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (this.targetUploadBlock) {
              this.changeBlockToFile(this.targetUploadBlock, file, ev.target.result);
            } else {
              this.insertFileBlock(file, ev.target.result);
            }
          };
          reader.readAsDataURL(file);
          this.fileInput.value = '';
        });
      }
    }

    openImagePickerForBlock(block = null) {
      this.targetUploadBlock = block;
      if (this.imageInput) this.imageInput.click();
    }

    openFilePickerForBlock(block = null) {
      this.targetUploadBlock = block;
      if (this.fileInput) this.fileInput.click();
    }

    handleUploadedFile(file) {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = (e) => {
          this.insertImageBlock(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          this.insertFileBlock(file, e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }

    insertImageBlock(dataUrl, caption = '') {
      const newBlockData = {
        id: 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'image',
        url: dataUrl,
        caption: caption
      };
      const newBlock = this.createBlockElement(newBlockData);
      this.container.appendChild(newBlock);
      this.onUpdate();
    }

    insertFileBlock(file, dataUrl) {
      const sizeStr = this.formatFileSize(file.size);
      const newBlockData = {
        id: 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type: 'file',
        fileName: file.name,
        fileSize: sizeStr,
        fileData: dataUrl
      };
      const newBlock = this.createBlockElement(newBlockData);
      this.container.appendChild(newBlock);
      this.onUpdate();
    }

    changeBlockToImage(targetBlock, dataUrl, caption = '') {
      const newBlockData = {
        id: targetBlock.getAttribute('data-id') || ('b_' + Date.now()),
        type: 'image',
        url: dataUrl,
        caption: caption
      };
      const newBlock = this.createBlockElement(newBlockData);
      targetBlock.replaceWith(newBlock);
      this.onUpdate();
    }

    changeBlockToFile(targetBlock, file, dataUrl) {
      const sizeStr = this.formatFileSize(file.size);
      const newBlockData = {
        id: targetBlock.getAttribute('data-id') || ('b_' + Date.now()),
        type: 'file',
        fileName: file.name,
        fileSize: sizeStr,
        fileData: dataUrl
      };
      const newBlock = this.createBlockElement(newBlockData);
      targetBlock.replaceWith(newBlock);
      this.onUpdate();
    }

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    bindSlashMenuEvents() {
      this.slashItems.forEach((item, index) => {
        item.addEventListener('mouseenter', () => {
          this.setActiveSlashItem(index);
        });

        item.addEventListener('click', () => {
          const type = item.getAttribute('data-type');
          this.applySlashCommand(type);
        });
      });
    }

    bindFormatToolbarEvents() {
      const buttons = this.formatToolbar.querySelectorAll('.fmt-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const command = btn.getAttribute('data-command');
          const value = btn.getAttribute('data-value') || null;

          if (command === 'hiliteColor') {
            document.execCommand('hiliteColor', false, value);
          } else {
            document.execCommand(command, false, null);
          }
          this.onUpdate();
        });
      });
    }

    render(blocks = []) {
      this.container.innerHTML = '';
      if (!blocks || blocks.length === 0) {
        blocks = [{ id: 'b_' + Date.now(), type: 'text', content: '' }];
      }

      blocks.forEach(blockData => {
        const blockEl = this.createBlockElement(blockData);
        this.container.appendChild(blockEl);
      });

      this.updateNumberedMarkers();
    }

    createBlockElement(blockData) {
      const { id, type = 'text', content = '', checked = false } = blockData;
      const block = document.createElement('div');
      block.className = `editor-block block-${type}`;
      block.setAttribute('data-id', id);
      block.setAttribute('data-type', type);

      const handle = document.createElement('div');
      handle.className = 'block-handle';
      handle.innerHTML = `
        <button class="btn-block-action btn-add-block" title="아래에 블록 추가"><i class="fa-solid fa-plus"></i></button>
        <button class="btn-block-action btn-block-drag" title="옵션 / 드래그"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      `;

      handle.querySelector('.btn-add-block').addEventListener('click', () => {
        this.insertBlockAfter(block, 'text', '');
      });

      block.appendChild(handle);

      // Image Block
      if (type === 'image') {
        const url = blockData.url || '';
        const caption = blockData.caption || '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'image-block-wrapper';

        if (url) {
          wrapper.innerHTML = `
            <img src="${url}" alt="${caption || '노트 이미지'}" />
            <div class="image-block-overlay-actions">
              <button class="img-action-btn btn-img-download" title="이미지 다운로드"><i class="fa-solid fa-download"></i></button>
              <button class="img-action-btn btn-img-delete" title="이미지 삭제"><i class="fa-regular fa-trash-can"></i></button>
            </div>
          `;
          wrapper.querySelector('.btn-img-download').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `notecraft-img-${Date.now()}.png`;
            a.click();
          });
          wrapper.querySelector('.btn-img-delete').addEventListener('click', () => {
            block.remove();
            this.onUpdate();
          });
        } else {
          // Empty state placeholder
          wrapper.innerHTML = `
            <div class="image-empty-placeholder">
              <i class="fa-regular fa-image"></i>
              <span>클릭하여 사진을 선택하거나 여기에 이미지를 끌어다 놓으세요</span>
            </div>
          `;
          wrapper.querySelector('.image-empty-placeholder').addEventListener('click', () => {
            this.openImagePickerForBlock(block);
          });
        }

        const captionInput = document.createElement('input');
        captionInput.type = 'text';
        captionInput.className = 'image-caption-input';
        captionInput.placeholder = '이미지 캡션 추가 (선택사항)...';
        captionInput.value = caption;
        captionInput.addEventListener('input', () => this.onUpdate());

        block.appendChild(wrapper);
        block.appendChild(captionInput);
        return block;
      }

      // File Attachment Block
      if (type === 'file') {
        const fileName = blockData.fileName || '첨부 파일';
        const fileSize = blockData.fileSize || '';
        const fileData = blockData.fileData || '';

        block.setAttribute('data-file-content', fileData);

        const card = document.createElement('div');
        card.className = 'file-attachment-card';
        card.innerHTML = `
          <div class="file-card-icon"><i class="fa-solid fa-file-arrow-down"></i></div>
          <div class="file-card-info">
            <div class="file-card-name" title="${fileName}">${fileName}</div>
            <div class="file-card-size">${fileSize}</div>
          </div>
          <button class="file-card-download-btn"><i class="fa-solid fa-download"></i> 다운로드</button>
        `;

        card.querySelector('.file-card-download-btn').addEventListener('click', () => {
          if (fileData) {
            const a = document.createElement('a');
            a.href = fileData;
            a.download = fileName;
            a.click();
          } else {
            alert('파일 데이터를 찾을 수 없습니다.');
          }
        });

        block.appendChild(card);
        return block;
      }

      if (type === 'todo') {
        const checkWrap = document.createElement('div');
        checkWrap.className = 'todo-checkbox-wrapper';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = !!checked;
        if (checked) block.classList.add('completed');

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            block.classList.add('completed');
          } else {
            block.classList.remove('completed');
          }
          this.onUpdate();
        });

        checkWrap.appendChild(checkbox);
        block.appendChild(checkWrap);
      } else if (type === 'bullet') {
        const bullet = document.createElement('div');
        bullet.className = 'bullet-marker';
        bullet.innerHTML = '•';
        block.appendChild(bullet);
      } else if (type === 'numbered') {
        const num = document.createElement('div');
        num.className = 'numbered-marker';
        num.textContent = '1.';
        block.appendChild(num);
      } else if (type === 'callout') {
        const calloutIcon = document.createElement('div');
        calloutIcon.className = 'callout-icon';
        calloutIcon.textContent = '💡';
        block.appendChild(calloutIcon);
      } else if (type === 'divider') {
        const hr = document.createElement('hr');
        const divWrap = document.createElement('div');
        divWrap.className = 'block-divider';
        divWrap.appendChild(hr);
        block.appendChild(divWrap);
        return block;
      }

      const contentEl = document.createElement('div');
      contentEl.className = 'block-content';
      contentEl.contentEditable = 'true';
      contentEl.innerHTML = content;

      if (type === 'h1') contentEl.setAttribute('data-placeholder', '제목 1');
      else if (type === 'h2') contentEl.setAttribute('data-placeholder', '제목 2');
      else if (type === 'h3') contentEl.setAttribute('data-placeholder', '제목 3');
      else if (type === 'todo') contentEl.setAttribute('data-placeholder', '할 일...');
      else if (type === 'quote') contentEl.setAttribute('data-placeholder', '인용구를 입력하세요...');
      else contentEl.setAttribute('data-placeholder', "'/'를 입력하여 명령 실행...");

      this.attachContentEvents(contentEl, block);
      block.appendChild(contentEl);

      return block;
    }

    attachContentEvents(contentEl, block) {
      contentEl.addEventListener('input', () => {
        const text = contentEl.innerText.trim();
        if (text.startsWith('/')) {
          this.showSlashMenu(contentEl, block);
        } else {
          this.hideSlashMenu();
        }
        this.onUpdate();
      });

      contentEl.addEventListener('keydown', (e) => {
        const type = block.getAttribute('data-type');

        if (!this.slashMenu.classList.contains('hidden')) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateSlashMenu(1);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateSlashMenu(-1);
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const activeItem = this.slashItems[this.activeSlashIndex];
            if (activeItem) {
              this.applySlashCommand(activeItem.getAttribute('data-type'));
            }
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            this.hideSlashMenu();
            return;
          }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const nextType = ['bullet', 'numbered', 'todo'].includes(type) ? type : 'text';
          
          if (contentEl.innerText.trim() === '' && ['bullet', 'numbered', 'todo'].includes(type)) {
            this.changeBlockType(block, 'text');
            return;
          }

          const newBlock = this.insertBlockAfter(block, nextType, '');
          const newContent = newBlock.querySelector('.block-content');
          if (newContent) newContent.focus();
          return;
        }

        if (e.key === 'Backspace' && contentEl.innerText.trim() === '') {
          if (type !== 'text') {
            e.preventDefault();
            this.changeBlockType(block, 'text');
            return;
          }

          const prevBlock = block.previousElementSibling;
          if (prevBlock && this.container.children.length > 1) {
            e.preventDefault();
            block.remove();
            this.updateNumberedMarkers();
            const prevContent = prevBlock.querySelector('.block-content');
            if (prevContent) {
              this.focusEndOfElement(prevContent);
            }
            this.onUpdate();
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          const prevBlock = block.previousElementSibling;
          if (prevBlock && this.isCaretAtStart(contentEl)) {
            const prevContent = prevBlock.querySelector('.block-content');
            if (prevContent) {
              e.preventDefault();
              this.focusEndOfElement(prevContent);
            }
          }
        } else if (e.key === 'ArrowDown') {
          const nextBlock = block.nextElementSibling;
          if (nextBlock && this.isCaretAtEnd(contentEl)) {
            const nextContent = nextBlock.querySelector('.block-content');
            if (nextContent) {
              e.preventDefault();
              this.focusStartOfElement(nextContent);
            }
          }
        }
      });
    }

    insertBlockAfter(targetBlock, type = 'text', content = '') {
      const newBlockData = {
        id: 'b_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        type,
        content,
        checked: false
      };
      const newBlock = this.createBlockElement(newBlockData);
      targetBlock.after(newBlock);
      this.updateNumberedMarkers();
      this.onUpdate();
      return newBlock;
    }

    changeBlockType(block, newType) {
      const contentEl = block.querySelector('.block-content');
      let content = contentEl ? contentEl.innerHTML : '';
      content = content.replace(/^\s*\/\s*/, '');

      const blockData = {
        id: block.getAttribute('data-id'),
        type: newType,
        content,
        checked: false
      };

      const newBlock = this.createBlockElement(blockData);
      block.replaceWith(newBlock);
      this.updateNumberedMarkers();

      const newContent = newBlock.querySelector('.block-content');
      if (newContent) {
        newContent.focus();
        this.focusEndOfElement(newContent);
      }
      this.onUpdate();
      return newBlock;
    }

    updateNumberedMarkers() {
      let index = 1;
      Array.from(this.container.children).forEach(child => {
        if (child.classList.contains('block-numbered')) {
          const marker = child.querySelector('.numbered-marker');
          if (marker) marker.textContent = `${index}.`;
          index++;
        } else {
          index = 1;
        }
      });
    }

    showSlashMenu(contentEl, block) {
      this.slashTargetBlock = block;
      const rect = contentEl.getBoundingClientRect();
      this.slashMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
      this.slashMenu.style.left = `${rect.left + window.scrollX}px`;
      this.slashMenu.classList.remove('hidden');
      this.setActiveSlashItem(0);
    }

    hideSlashMenu() {
      this.slashMenu.classList.add('hidden');
      this.slashTargetBlock = null;
    }

    navigateSlashMenu(direction) {
      let nextIndex = this.activeSlashIndex + direction;
      if (nextIndex < 0) nextIndex = this.slashItems.length - 1;
      if (nextIndex >= this.slashItems.length) nextIndex = 0;
      this.setActiveSlashItem(nextIndex);
    }

    setActiveSlashItem(index) {
      this.activeSlashIndex = index;
      this.slashItems.forEach((item, i) => {
        if (i === index) {
          item.classList.add('active');
          item.scrollIntoView({ block: 'nearest' });
        } else {
          item.classList.remove('active');
        }
      });
    }

    applySlashCommand(type) {
      if (!this.slashTargetBlock) return;
      const target = this.slashTargetBlock;
      this.hideSlashMenu();

      if (type === 'image') {
        this.openImagePickerForBlock(target);
        return;
      }
      if (type === 'file') {
        this.openFilePickerForBlock(target);
        return;
      }

      this.changeBlockType(target, type);
    }

    handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        this.hideFormatToolbar();
        return;
      }

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const blockContent = container.nodeType === Node.ELEMENT_NODE 
        ? container.closest('.block-content') 
        : container.parentElement.closest('.block-content');

      if (!blockContent || !this.container.contains(blockContent)) {
        this.hideFormatToolbar();
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        this.hideFormatToolbar();
        return;
      }

      this.formatToolbar.style.top = `${rect.top + window.scrollY - 44}px`;
      this.formatToolbar.style.left = `${rect.left + window.scrollX + (rect.width / 2) - 80}px`;
      this.formatToolbar.classList.remove('hidden');
    }

    hideFormatToolbar() {
      this.formatToolbar.classList.add('hidden');
    }

    isCaretAtStart(element) {
      const sel = window.getSelection();
      if (!sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      return preCaretRange.toString().length === 0;
    }

    isCaretAtEnd(element) {
      const sel = window.getSelection();
      if (!sel.rangeCount) return false;
      const range = sel.getRangeAt(0);
      const postCaretRange = range.cloneRange();
      postCaretRange.selectNodeContents(element);
      postCaretRange.setStart(range.endContainer, range.endOffset);
      return postCaretRange.toString().length === 0;
    }

    focusStartOfElement(element) {
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    focusEndOfElement(element) {
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    getData() {
      const blocks = [];
      Array.from(this.container.children).forEach(blockEl => {
        const id = blockEl.getAttribute('data-id');
        const type = blockEl.getAttribute('data-type');
        
        if (type === 'image') {
          const img = blockEl.querySelector('.image-block-wrapper img');
          const captionInput = blockEl.querySelector('.image-caption-input');
          blocks.push({
            id,
            type: 'image',
            url: img ? img.src : '',
            caption: captionInput ? captionInput.value : ''
          });
          return;
        }

        if (type === 'file') {
          const nameEl = blockEl.querySelector('.file-card-name');
          const sizeEl = blockEl.querySelector('.file-card-size');
          const dlBtn = blockEl.querySelector('.file-card-download-btn');
          blocks.push({
            id,
            type: 'file',
            fileName: nameEl ? nameEl.textContent : '',
            fileSize: sizeEl ? sizeEl.textContent : '',
            fileData: blockEl.getAttribute('data-file-content') || ''
          });
          return;
        }

        const contentEl = blockEl.querySelector('.block-content');
        const content = contentEl ? contentEl.innerHTML : '';
        const checkbox = blockEl.querySelector('.todo-checkbox');
        const checked = checkbox ? checkbox.checked : false;

        blocks.push({ id, type, content, checked });
      });
      return blocks;
    }
  }

  // =========================================================================
  // 3. GoodNotes-Style Drawing Canvas
  // =========================================================================
  class DrawingCanvas {
    constructor(canvasId, options = {}) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.onUpdate = options.onUpdate || (() => {});
      this.paperContainer = document.getElementById('note-paper-container');

      this.isDrawing = false;
      this.activePointerId = null;
      this.currentTool = 'pen';
      this.currentColor = '#1e293b';
      this.strokeWidth = 4;
      this.points = [];

      this.history = [];
      this.redoStack = [];
      this.maxHistory = 20;

      this.init();
    }

    init() {
      this.setupCanvasResolution();
      this.bindEvents();
      this.bindToolbarControls();

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
      this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
      this.canvas.addEventListener('lostpointercapture', (e) => this.onPointerUp(e));

      // Touch / mouse fallbacks to ensure mobile compatibility
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.target === this.canvas) e.preventDefault();
      }, { passive: false });
      this.canvas.addEventListener('touchmove', (e) => {
        if (e.target === this.canvas) e.preventDefault();
      }, { passive: false });

      // Automatically sync canvas height if note content expands
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

      // Logical dimensions of the canvas in CSS pixels
      const logicalWidth = this.canvas.width / (this.dpr || 1);
      const logicalHeight = this.canvas.height / (this.dpr || 1);

      // Calculate exact scaling ratio between rendered CSS element size and logical canvas size
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
      this.drawDot(pos);
    }

    onPointerMove(e) {
      if (!this.isDrawing) return;
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

      const pos = this.getPointerPos(e);
      this.points.push(pos);
      this.drawStroke(this.points);
    }

    onPointerUp(e) {
      if (!this.isDrawing) return;
      if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;

      this.isDrawing = false;
      this.activePointerId = null;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (this.points.length === 1) {
        this.drawDot(this.points[0]);
      }
      this.points = [];
      this.redoStack = [];
      this.onUpdate();
    }

    drawDot(point) {
      this.ctx.save();
      if (this.currentTool === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = 'rgba(0,0,0,1)';
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, (this.strokeWidth * 4) / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (this.currentTool === 'highlighter') {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 0.35;
        this.ctx.fillStyle = this.currentColor;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, (this.strokeWidth * 3.5) / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = this.currentColor;
        const radius = (this.strokeWidth * (0.6 + (point.pressure * 0.8))) / 2;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, Math.max(radius, 1.5), 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    drawStroke(points) {
      if (points.length < 2) return;

      this.ctx.save();

      if (this.currentTool === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        this.ctx.lineWidth = this.strokeWidth * 4;
      } else if (this.currentTool === 'highlighter') {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 0.35;
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.strokeWidth * 3.5;
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
        this.ctx.strokeStyle = this.currentColor;
        const latestPoint = points[points.length - 1];
        const pressureMultiplier = 0.6 + (latestPoint.pressure * 0.8);
        this.ctx.lineWidth = this.strokeWidth * pressureMultiplier;
      }

      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();

      this.ctx.restore();
    }

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
      };
      img.src = dataUrl;
    }

    clearDirectly() {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    getDataUrl() {
      return this.canvas.toDataURL('image/png');
    }

    bindToolbarControls() {
      const toolBtns = document.querySelectorAll('.canvas-tool-btn');
      toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          toolBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTool = btn.getAttribute('data-tool');

          if (this.currentTool === 'text-cursor') {
            // Switch to Text mode: let touches/clicks pass directly to text editor
            document.body.classList.remove('canvas-active');
            const blocks = document.querySelectorAll('.block-content');
            blocks.forEach(b => b.setAttribute('contenteditable', 'true'));
            const titleInput = document.getElementById('note-title-input');
            if (titleInput) titleInput.style.pointerEvents = 'auto';
          } else {
            // Switch to Handwriting mode: capture touches for drawing, prevent text conversion
            document.body.classList.add('canvas-active');
            if (document.activeElement && document.activeElement.blur) {
              document.activeElement.blur();
            }
            // Temporarily disable contenteditable during drawing to prevent Scribble/S-pen conversion
            const blocks = document.querySelectorAll('.block-content');
            blocks.forEach(b => b.setAttribute('contenteditable', 'false'));
            const titleInput = document.getElementById('note-title-input');
            if (titleInput) titleInput.blur();
          }
        });
      });

      const colorSwatches = document.querySelectorAll('.color-swatch');
      const customColorInput = document.getElementById('custom-color-picker');

      colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
          colorSwatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          this.currentColor = swatch.getAttribute('data-color');
          if (customColorInput) customColorInput.value = this.currentColor;
          
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

      const strokeBtns = document.querySelectorAll('.stroke-btn');
      strokeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          strokeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.strokeWidth = parseInt(btn.getAttribute('data-size'), 10) || 4;
        });
      });

      const templateSelect = document.getElementById('paper-template-select');
      if (templateSelect) {
        templateSelect.addEventListener('change', (e) => {
          this.setPaperTemplate(e.target.value);
          this.onUpdate();
        });
      }

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

  // =========================================================================
  // 4. Sidebar Manager
  // =========================================================================
  class SidebarManager {
    constructor(options = {}) {
      this.onSelectNote = options.onSelectNote || (() => {});
      this.onCreateNote = options.onCreateNote || (() => {});
      this.onDeleteNote = options.onDeleteNote || (() => {});
      this.onToggleFavorite = options.onToggleFavorite || (() => {});

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
      this.btnCollapse.addEventListener('click', () => {
        this.sidebar.classList.add('collapsed');
      });

      this.btnExpand.addEventListener('click', () => {
        this.sidebar.classList.remove('collapsed');
      });

      this.btnNewNote.addEventListener('click', () => {
        this.onCreateNote();
      });

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

      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          this.sidebar.classList.remove('collapsed');
          this.searchInput.focus();
        }
      });

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

      let filtered = notes;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = notes.filter(n => {
          const titleMatch = (n.title || '').toLowerCase().includes(q);
          const blockMatch = (n.blocks || []).some(b => (b.content || '').toLowerCase().includes(q));
          return titleMatch || blockMatch;
        });
      }

      const favorites = filtered.filter(n => n.isFavorite);

      this.favoritesList.innerHTML = '';
      if (favorites.length === 0) {
        this.favoritesList.innerHTML = `<li class="empty-hint" style="font-size:0.8rem; color:var(--text-muted); padding:4px 10px;">즐겨찾기한 노트가 없습니다.</li>`;
      } else {
        favorites.forEach(note => {
          const item = this.createNoteListItem(note, currentId);
          this.favoritesList.appendChild(item);
        });
      }

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

      li.addEventListener('click', (e) => {
        if (e.target.closest('.doc-action-btn')) return;
        this.onSelectNote(note.id);
      });

      const favBtn = li.querySelector('.btn-fav');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onToggleFavorite(note.id);
      });

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

  // =========================================================================
  // 5. Firebase Cloud & Google Authentication Manager
  // =========================================================================
  class FirebaseCloudManager {
    constructor(appInstance) {
      this.app = appInstance;
      this.auth = null;
      this.db = null;
      this.currentUser = null;
      this.isInitialized = false;

      // DOM Elements
      this.btnGoogleLogin = document.getElementById('btn-google-login');
      this.userProfileChip = document.getElementById('user-profile-chip');
      this.userAvatar = document.getElementById('user-avatar');
      this.userName = document.getElementById('user-name');
      this.btnLogout = document.getElementById('btn-logout');
      this.btnCloudSettings = document.getElementById('btn-cloud-settings');
      this.cloudModal = document.getElementById('cloud-modal');
      this.btnCloseCloud = document.getElementById('btn-close-cloud');
      this.cloudBackdrop = document.getElementById('cloud-backdrop');
      this.configTextarea = document.getElementById('firebase-config-json');
      this.btnSaveConfig = document.getElementById('btn-save-cloud-config');
      this.btnResetConfig = document.getElementById('btn-reset-cloud-config');
      this.statusText = document.getElementById('cloud-status-text');
      this.statusDot = document.querySelector('.status-indicator-dot');

      // Google Quick Modal Elements
      this.googleLoginModal = document.getElementById('google-login-modal');
      this.btnCloseGoogleModal = document.getElementById('btn-close-google-modal');
      this.googleLoginBackdrop = document.getElementById('google-login-backdrop');
      this.googleLoginForm = document.getElementById('google-login-form');
      this.googleEmailInput = document.getElementById('google-email-input');
      this.googleNameInput = document.getElementById('google-name-input');
      this.quickAccountsList = document.getElementById('quick-accounts-list');

      this.init();
    }

    init() {
      this.bindModalEvents();
      this.tryInitFirebase();
      this.restoreActiveUser();
    }

    bindModalEvents() {
      // 1. Cloud Config Modal
      if (this.btnCloudSettings) {
        this.btnCloudSettings.addEventListener('click', () => {
          this.cloudModal.classList.remove('hidden');
          const savedConfig = localStorage.getItem('notecraft_firebase_config');
          if (savedConfig) {
            this.configTextarea.value = savedConfig;
          }
        });
      }

      if (this.btnCloseCloud) {
        this.btnCloseCloud.addEventListener('click', () => {
          this.cloudModal.classList.add('hidden');
        });
      }

      if (this.cloudBackdrop) {
        this.cloudBackdrop.addEventListener('click', () => {
          this.cloudModal.classList.add('hidden');
        });
      }

      if (this.btnSaveConfig) {
        this.btnSaveConfig.addEventListener('click', () => {
          this.handleSaveConfig();
        });
      }

      if (this.btnResetConfig) {
        this.btnResetConfig.addEventListener('click', () => {
          if (confirm('Firebase 설정을 초기화하고 로컬 모드로 전환하시겠습니까?')) {
            localStorage.removeItem('notecraft_firebase_config');
            location.reload();
          }
        });
      }

      // 2. Google Login Button & Quick Modal
      this.btnPrimaryGoogleAccount = document.getElementById('btn-primary-google-account');
      this.btnShowManualEmail = document.getElementById('btn-show-manual-email');
      this.savedAccountsContainer = document.getElementById('saved-accounts-container');

      if (this.btnGoogleLogin) {
        this.btnGoogleLogin.addEventListener('click', () => {
          this.loginWithGoogle();
        });
      }

      if (this.btnPrimaryGoogleAccount) {
        this.btnPrimaryGoogleAccount.addEventListener('click', () => {
          // One-click login with primary Google account
          const lastEmail = localStorage.getItem('notecraft_last_email') || 'kayden@gmail.com';
          const lastName = localStorage.getItem('notecraft_last_name') || '내 Google 계정';
          this.performGoogleAccountLogin(lastEmail, lastName);
        });
      }

      if (this.btnShowManualEmail) {
        this.btnShowManualEmail.addEventListener('click', () => {
          if (this.googleLoginForm) {
            this.googleLoginForm.classList.toggle('hidden');
            if (!this.googleLoginForm.classList.contains('hidden') && this.googleEmailInput) {
              this.googleEmailInput.focus();
            }
          }
        });
      }

      if (this.btnCloseGoogleModal) {
        this.btnCloseGoogleModal.addEventListener('click', () => {
          this.googleLoginModal.classList.add('hidden');
        });
      }

      if (this.googleLoginBackdrop) {
        this.googleLoginBackdrop.addEventListener('click', () => {
          this.googleLoginModal.classList.add('hidden');
        });
      }

      if (this.googleLoginForm) {
        this.googleLoginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = this.googleEmailInput.value.trim();
          const name = email.split('@')[0];
          if (email) {
            this.performGoogleAccountLogin(email, name);
          }
        });
      }

      if (this.btnLogout) {
        this.btnLogout.addEventListener('click', () => {
          this.logout();
        });
      }
    }

    restoreActiveUser() {
      try {
        const savedUserJson = localStorage.getItem('notecraft_active_google_user');
        if (savedUserJson) {
          const user = JSON.parse(savedUserJson);
          if (user && user.email) {
            this.handleUserSignedIn(user, false);
          }
        }
      } catch (e) {
        console.error('Failed to restore user', e);
      }
    }

    renderQuickAccounts() {
      try {
        const savedAccountsJson = localStorage.getItem('notecraft_saved_google_accounts');
        const accounts = savedAccountsJson ? JSON.parse(savedAccountsJson) : [];
        
        // Update Primary Card if we have recent account info
        const primaryName = document.getElementById('primary-account-name');
        const primaryEmail = document.getElementById('primary-account-email');
        const primaryAvatar = document.getElementById('primary-account-avatar');

        if (accounts.length > 0) {
          const first = accounts[0];
          if (primaryName) primaryName.textContent = first.displayName || first.email;
          if (primaryEmail) primaryEmail.textContent = first.email;
          if (primaryAvatar && first.photoURL) primaryAvatar.src = first.photoURL;
        }

        // Render additional saved accounts
        if (this.savedAccountsContainer) {
          this.savedAccountsContainer.innerHTML = '';
          if (accounts.length > 1) {
            accounts.slice(1).forEach(acc => {
              const item = document.createElement('div');
              item.className = 'account-card-item';
              item.style.marginTop = '6px';
              item.innerHTML = `
                <img class="account-card-avatar" src="${acc.photoURL || 'https://cdn-icons-png.flaticon.com/512/3238/3238016.png'}" alt="Avatar" />
                <div class="account-card-info">
                  <div class="account-card-name">${acc.displayName || acc.email}</div>
                  <div class="account-card-email">${acc.email}</div>
                </div>
                <span class="account-card-badge" style="background: var(--text-muted);">전환</span>
              `;
              item.addEventListener('click', () => {
                this.performGoogleAccountLogin(acc.email, acc.displayName, acc.photoURL);
              });
              this.savedAccountsContainer.appendChild(item);
            });
          }
        }
      } catch (e) {
        console.error('Failed to render quick accounts', e);
      }
    }

    performGoogleAccountLogin(email, displayName, customPhoto = null) {
      const uid = 'google_' + btoa(unescape(encodeURIComponent(email))).replace(/=/g, '');
      const photoURL = customPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=4285f4&color=fff&bold=true`;

      const userProfile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL
      };

      // Save as active user & remember last login
      localStorage.setItem('notecraft_active_google_user', JSON.stringify(userProfile));
      localStorage.setItem('notecraft_last_email', email);
      localStorage.setItem('notecraft_last_name', userProfile.displayName);

      // Remember in accounts history
      try {
        let accounts = JSON.parse(localStorage.getItem('notecraft_saved_google_accounts') || '[]');
        accounts = accounts.filter(a => a.email !== email);
        accounts.unshift(userProfile);
        if (accounts.length > 5) accounts = accounts.slice(0, 5);
        localStorage.setItem('notecraft_saved_google_accounts', JSON.stringify(accounts));
      } catch (_) {}

      // Close modal
      if (this.googleLoginModal) this.googleLoginModal.classList.add('hidden');

      // Update state
      this.handleUserSignedIn(userProfile, true);
    }

    parseFirebaseConfig(rawText) {
      if (!rawText) return null;
      try {
        return JSON.parse(rawText);
      } catch (_) {}

      const config = {};
      const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      keys.forEach(k => {
        const regex = new RegExp(`['"]?${k}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`]`);
        const match = rawText.match(regex);
        if (match && match[1]) {
          config[k] = match[1].trim();
        }
      });

      if (config.apiKey && config.projectId) {
        return config;
      }
      return null;
    }

    handleSaveConfig() {
      const raw = this.configTextarea.value.trim();
      const parsed = this.parseFirebaseConfig(raw);

      if (!parsed) {
        alert('올바른 Firebase 설정(apiKey, projectId 등)을 찾을 수 없습니다. 형식을 확인해주세요.');
        return;
      }

      localStorage.setItem('notecraft_firebase_config', JSON.stringify(parsed, null, 2));
      alert('Firebase 설정이 저장되었습니다! 페이지를 새로고침하여 연결합니다.');
      location.reload();
    }

    tryInitFirebase() {
      if (typeof firebase === 'undefined') {
        this.updateStatus(false, '로컬 저장소 모드');
        return;
      }

      // Default Built-in Firebase Config from user's project
      const DEFAULT_FIREBASE_CONFIG = {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "notecraft-89f03.firebaseapp.com",
        projectId: "notecraft-89f03",
        storageBucket: "notecraft-89f03.firebasestorage.app",
        messagingSenderId: "505136471466",
        appId: "1:505136471466:web:5538c1b4c2755dce4a9fd3",
        measurementId: "G-9FMQGH8B3V"
      };

      const savedConfig = localStorage.getItem('notecraft_firebase_config');
      const config = savedConfig ? JSON.parse(savedConfig) : DEFAULT_FIREBASE_CONFIG;

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isInitialized = true;

        this.updateStatus(true, '클라우드 동기화 준비 완료 (Google)');

        this.auth.onAuthStateChanged(async (user) => {
          if (user) {
            await this.handleUserSignedIn(user, true);
          }
        });
      } catch (err) {
        console.error('Firebase Init Error:', err);
        this.updateStatus(false, 'Firebase 연결 실패');
      }
    }

    updateStatus(isOnline, message) {
      if (this.statusDot) {
        if (isOnline) this.statusDot.classList.add('online');
        else this.statusDot.classList.remove('online');
      }
      if (this.statusText) {
        this.statusText.textContent = `상태: ${message}`;
      }
    }

    isCloudActive() {
      return this.isInitialized && this.currentUser !== null;
    }

    async handleUserSignedIn(user, shouldReloadDocs = true) {
      this.currentUser = user;
      StorageManager.setCurrentUser(user);

      // UI Update
      if (this.btnGoogleLogin) this.btnGoogleLogin.classList.add('hidden');
      if (this.userProfileChip) {
        this.userProfileChip.classList.remove('hidden');
        if (this.userAvatar) this.userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4285f4&color=fff&bold=true`;
        if (this.userName) this.userName.textContent = user.displayName || user.email || '사용자';
      }

      this.updateStatus(true, `계정 로그인됨 (${user.email})`);

      if (this.isInitialized && user.uid) {
        await this.loadNotesFromFirestore(user.uid);
      } else if (shouldReloadDocs) {
        this.app.sidebar.render();
        const currentId = StorageManager.getCurrentNoteId();
        this.app.switchNote(currentId);
      }
    }

    handleUserSignedOut() {
      this.currentUser = null;
      StorageManager.setCurrentUser(null);
      localStorage.removeItem('notecraft_active_google_user');

      if (this.btnGoogleLogin) this.btnGoogleLogin.classList.remove('hidden');
      if (this.userProfileChip) this.userProfileChip.classList.add('hidden');

      this.updateStatus(false, '로그아웃됨 (기본 모드)');

      this.app.sidebar.render();
      const currentId = StorageManager.getCurrentNoteId();
      this.app.switchNote(currentId);
    }

    async loginWithGoogle() {
      // 1. If Firebase is initialized with Google Auth, try direct popup
      if (this.isInitialized && this.auth) {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await this.auth.signInWithPopup(provider);
          return;
        } catch (err) {
          console.error('Firebase popup failed:', err);
          if (err.code === 'auth/popup-closed-by-user') {
            return;
          }
          if (err.code === 'auth/operation-not-allowed') {
            alert('⚠️ Firebase 콘솔에서 [Google 제공업체]가 아직 켜지지 않았습니다!\n\n해결 방법: Firebase 콘솔 ➡️ Authentication ➡️ [Sign-in method] 탭에서 Google을 켜주세요.');
          } else if (err.code === 'auth/unauthorized-domain') {
            const currentHost = window.location.hostname;
            alert(`⚠️ Firebase 콘솔의 [승인된 도메인]에 현재 주소가 등록되지 않았습니다!\n\n현재 도메인: ${currentHost}\n\n해결 방법: Firebase 콘솔 ➡️ Authentication ➡️ [Settings] 탭 ➡️ [Authorized domains]에 ${currentHost} 를 추가해주세요.`);
          }
        }
      }

      // 2. Instant One-Click Google Login Modal
      this.renderQuickAccounts();
      if (this.googleLoginModal) {
        this.googleLoginModal.classList.remove('hidden');
        setTimeout(() => {
          if (this.googleEmailInput) this.googleEmailInput.focus();
        }, 100);
      }
    }

    async logout() {
      if (this.auth) {
        try { await this.auth.signOut(); } catch (_) {}
      }
      this.handleUserSignedOut();
    }

    // --- Firestore Data Operations ---
    async loadNotesFromFirestore(uid) {
      if (!this.db) return;
      try {
        const snapshot = await this.db.collection('users').doc(uid).collection('notes').get();
        if (!snapshot.empty) {
          const remoteNotes = [];
          snapshot.forEach(doc => {
            remoteNotes.push(doc.data());
          });
          remoteNotes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          StorageManager.saveNotes(remoteNotes);
        } else {
          const currentNotes = StorageManager.getNotes();
          for (const n of currentNotes) {
            await this.syncNoteToFirestore(uid, n);
          }
        }

        this.app.sidebar.render();
        const currentId = StorageManager.getCurrentNoteId();
        this.app.switchNote(currentId);
      } catch (err) {
        console.error('Failed to load notes from Firestore', err);
      }
    }

    async syncNoteToFirestore(uid, note) {
      if (!this.db || !uid || !note) return;
      try {
        await this.db.collection('users').doc(uid).collection('notes').doc(note.id).set(note, { merge: true });
      } catch (err) {
        console.error('Firestore Sync Error:', err);
      }
    }

    async deleteNoteFromFirestore(uid, noteId) {
      if (!this.db || !uid || !noteId) return;
      try {
        await this.db.collection('users').doc(uid).collection('notes').doc(noteId).delete();
      } catch (err) {
        console.error('Firestore Delete Error:', err);
      }
    }
  }

  // =========================================================================
  // 6. Main Application Orchestrator
  // =========================================================================
  class NoteCraftApp {
    constructor() {
      this.currentNote = null;
      this.saveTimeout = null;

      this.titleInput = document.getElementById('note-title-input');
      this.pageEmoji = document.getElementById('page-emoji');
      this.breadcrumbDocTitle = document.getElementById('current-doc-breadcrumb');
      this.updatedAtLabel = document.getElementById('note-updated-at');
      this.saveStatus = document.getElementById('save-status');
      this.btnToggleFav = document.getElementById('btn-toggle-favorite');
      this.favIcon = document.getElementById('favorite-icon');
      this.btnDeleteNote = document.getElementById('btn-delete-note');
      this.btnExportPdf = document.getElementById('btn-export-pdf');

      this.emojiModal = document.getElementById('emoji-picker-modal');
      this.emojiGrid = document.getElementById('emoji-grid');
      this.btnCloseEmoji = document.getElementById('btn-close-emoji');
      this.emojiBackdrop = document.getElementById('emoji-backdrop');

      // Mobile Modal Elements
      this.btnMobileConnect = document.getElementById('btn-mobile-connect');
      this.mobileModal = document.getElementById('mobile-modal');
      this.btnCloseMobile = document.getElementById('btn-close-mobile');
      this.mobileBackdrop = document.getElementById('mobile-backdrop');
      this.qrImage = document.getElementById('qr-image');
      this.mobileUrlInput = document.getElementById('mobile-url-input');
      this.btnCopyUrl = document.getElementById('btn-copy-url');

      // Mobile More Menu (3-dots dropdown) Elements
      this.btnHeaderMore = document.getElementById('btn-header-more');
      this.headerMoreDropdown = document.getElementById('header-more-dropdown');
      this.mBtnFavorite = document.getElementById('m-btn-favorite');
      this.mFavIcon = document.getElementById('m-fav-icon');
      this.mBtnExportPdf = document.getElementById('m-btn-export-pdf');
      this.mBtnQr = document.getElementById('m-btn-qr');
      this.mBtnCloud = document.getElementById('m-btn-cloud');
      this.mBtnDelete = document.getElementById('m-btn-delete');

      this.init();
    }

    init() {
      const savedTheme = StorageManager.getTheme();
      if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.body.classList.remove('theme-light');
        const themeText = document.querySelector('#btn-theme-toggle .theme-text');
        const themeIcon = document.querySelector('#btn-theme-toggle .theme-icon');
        if (themeText) themeText.textContent = '라이트 모드';
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun theme-icon';
      }

      this.editor = new BlockEditor('blocks-editor', {
        onUpdate: () => this.triggerAutoSave()
      });

      this.canvas = new DrawingCanvas('drawing-canvas', {
        onUpdate: () => this.triggerAutoSave()
      });

      this.sidebar = new SidebarManager({
        onSelectNote: (id) => this.switchNote(id),
        onCreateNote: () => this.createNote(),
        onDeleteNote: (id) => this.deleteNote(id),
        onToggleFavorite: (id) => this.toggleFavorite(id)
      });

      this.setupViewModes();
      this.setupHeaderEvents();
      this.setupEmojiPicker();
      this.setupMobileModal();

      // Initialize Firebase Cloud & Google Auth
      this.cloud = new FirebaseCloudManager(this);
      window.cloudManager = this.cloud;

      const initialId = StorageManager.getCurrentNoteId();
      this.switchNote(initialId);
    }

    setupMobileModal() {
      if (!this.btnMobileConnect) return;

      // Determine URL: use current online URL if deployed, or local Wi-Fi IP for local testing
      let targetUrl = window.location.href;
      if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const port = window.location.port || '8080';
        targetUrl = `http://192.168.219.240:${port}`;
      }

      this.mobileUrlInput.value = targetUrl;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(targetUrl)}`;
      this.qrImage.src = qrApiUrl;

      this.btnMobileConnect.addEventListener('click', () => {
        this.mobileModal.classList.remove('hidden');
      });

      this.btnCloseMobile.addEventListener('click', () => {
        this.mobileModal.classList.add('hidden');
      });

      this.mobileBackdrop.addEventListener('click', () => {
        this.mobileModal.classList.add('hidden');
      });

      this.btnCopyUrl.addEventListener('click', () => {
        navigator.clipboard.writeText(targetUrl).then(() => {
          this.btnCopyUrl.innerHTML = '<i class="fa-solid fa-check"></i> 복사됨';
          setTimeout(() => {
            this.btnCopyUrl.innerHTML = '<i class="fa-regular fa-copy"></i> 복사';
          }, 2000);
        });
      });
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
            this.enableTextEditing(true);
          } else if (mode === 'canvas') {
            // GoodNotes Mode: Definitively disable text editing and blur all inputs
            // to prevent tablet OS (Apple Scribble / Samsung S-Pen) from converting handwriting to text
            document.body.classList.add('canvas-active');
            this.blurAndDisableTextEditing();
          } else {
            // Split mode
            document.body.classList.add('canvas-active');
            this.enableTextEditing(true);
          }

          // Ensure canvas bounds match viewport on mode switch
          if (this.canvas) {
            setTimeout(() => this.canvas.resizeCanvas(), 50);
          }
        });
      });

      document.body.classList.add('mode-split');
      document.body.classList.add('canvas-active');
    }

    blurAndDisableTextEditing() {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      // Temporarily disable contenteditable so iPad/Galaxy Tab stylus draws directly
      const blocks = document.querySelectorAll('.block-content');
      blocks.forEach(b => b.setAttribute('contenteditable', 'false'));
      if (this.titleInput) this.titleInput.blur();
    }

    enableTextEditing(enable) {
      const blocks = document.querySelectorAll('.block-content');
      blocks.forEach(b => b.setAttribute('contenteditable', enable ? 'true' : 'false'));
    }

    setupHeaderEvents() {
      this.titleInput.addEventListener('input', () => {
        if (this.currentNote) {
          this.currentNote.title = this.titleInput.value || '제목 없음';
          this.breadcrumbDocTitle.textContent = this.currentNote.title;
          this.sidebar.render();
          this.triggerAutoSave();
        }
      });

      this.btnToggleFav.addEventListener('click', () => {
        if (this.currentNote) {
          this.toggleFavorite(this.currentNote.id);
        }
      });

      this.btnDeleteNote.addEventListener('click', () => {
        if (!this.currentNote) return;
        if (confirm(`'${this.currentNote.title}' 노트를 삭제하시겠습니까?`)) {
          this.deleteNote(this.currentNote.id);
        }
      });

      // Quick insert image button on canvas toolbar
      const quickImgBtn = document.getElementById('btn-quick-insert-image');
      if (quickImgBtn) {
        quickImgBtn.addEventListener('click', () => {
          this.editor.openImagePickerForBlock(null);
        });
      }

      this.btnExportPdf.addEventListener('click', () => {
        window.print();
      });

      // Mobile More (3-dots) Menu Setup
      if (this.btnHeaderMore && this.headerMoreDropdown) {
        this.btnHeaderMore.addEventListener('click', (e) => {
          e.stopPropagation();
          this.headerMoreDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking anywhere outside
        document.addEventListener('click', (e) => {
          if (!this.headerMoreDropdown.classList.contains('hidden')) {
            if (!this.headerMoreDropdown.contains(e.target) && e.target !== this.btnHeaderMore) {
              this.headerMoreDropdown.classList.add('hidden');
            }
          }
        });

        // Mobile sub-item actions
        if (this.mBtnFavorite) {
          this.mBtnFavorite.addEventListener('click', () => {
            this.headerMoreDropdown.classList.add('hidden');
            if (this.currentNote) {
              this.toggleFavorite(this.currentNote.id);
            }
          });
        }

        if (this.mBtnExportPdf) {
          this.mBtnExportPdf.addEventListener('click', () => {
            this.headerMoreDropdown.classList.add('hidden');
            window.print();
          });
        }

        if (this.mBtnQr) {
          this.mBtnQr.addEventListener('click', () => {
            this.headerMoreDropdown.classList.add('hidden');
            if (this.mobileModal) {
              this.mobileModal.classList.remove('hidden');
            }
          });
        }

        if (this.mBtnCloud) {
          this.mBtnCloud.addEventListener('click', () => {
            this.headerMoreDropdown.classList.add('hidden');
            const cloudModal = document.getElementById('cloud-config-modal');
            if (cloudModal) {
              cloudModal.classList.remove('hidden');
            }
          });
        }

        if (this.mBtnDelete) {
          this.mBtnDelete.addEventListener('click', () => {
            this.headerMoreDropdown.classList.add('hidden');
            if (!this.currentNote) return;
            if (confirm(`'${this.currentNote.title}' 노트를 삭제하시겠습니까?`)) {
              this.deleteNote(this.currentNote.id);
            }
          });
        }
      }
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

    switchNote(id) {
      if (this.currentNote) {
        this.saveCurrentNoteImmediately();
      }

      const note = StorageManager.getNoteById(id);
      if (!note) return;

      this.currentNote = note;
      StorageManager.setCurrentNoteId(id);

      this.titleInput.value = note.title === '제목 없음' ? '' : note.title;
      this.breadcrumbDocTitle.textContent = note.title || '제목 없음';
      this.pageEmoji.textContent = note.emoji || '📝';
      this.updateTimeLabel(note.updatedAt);
      this.updateFavoriteIcon(note.isFavorite);

      this.canvas.setPaperTemplate(note.template || 'lines');
      this.editor.render(note.blocks || []);
      this.canvas.setupCanvasResolution();
      this.canvas.loadFromDataUrl(note.canvasData || '');
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
        if (this.favIcon) this.favIcon.className = 'fa-solid fa-star text-amber';
        if (this.mFavIcon) this.mFavIcon.className = 'fa-solid fa-star text-amber';
      } else {
        if (this.favIcon) this.favIcon.className = 'fa-regular fa-star';
        if (this.mFavIcon) this.mFavIcon.className = 'fa-regular fa-star';
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

    triggerAutoSave() {
      this.saveStatus.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>저장 중...</span>';
      this.saveStatus.classList.add('saving');

      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveCurrentNoteImmediately();
      }, 400);
    }

    saveCurrentNoteImmediately() {
      if (!this.currentNote) return;

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

  // Auto-launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new NoteCraftApp();
    });
  } else {
    window.app = new NoteCraftApp();
  }
})();
