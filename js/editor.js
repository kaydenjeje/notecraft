/**
 * NoteCraft - Notion-Style Block Editor Engine
 */

export class BlockEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onUpdate = options.onUpdate || (() => {});
    
    // Slash Menu elements
    this.slashMenu = document.getElementById('slash-menu');
    this.slashItems = Array.from(document.querySelectorAll('.slash-item'));
    this.activeSlashIndex = 0;
    this.slashTargetBlock = null;

    // Format Toolbar elements
    this.formatToolbar = document.getElementById('format-toolbar');

    this.init();
  }

  init() {
    this.bindGlobalEvents();
    this.bindSlashMenuEvents();
    this.bindFormatToolbarEvents();
  }

  bindGlobalEvents() {
    // Hide floating menus when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (!this.slashMenu.contains(e.target) && !e.target.closest('.block-content')) {
        this.hideSlashMenu();
      }
      if (!this.formatToolbar.contains(e.target)) {
        this.hideFormatToolbar();
      }
    });

    // Check text selection for format toolbar
    document.addEventListener('selectionchange', () => {
      this.handleSelectionChange();
    });
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

  // Render a list of blocks into the editor
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

  // Create single block DOM structure
  createBlockElement(blockData) {
    const { id, type = 'text', content = '', checked = false } = blockData;
    const block = document.createElement('div');
    block.className = `editor-block block-${type}`;
    block.setAttribute('data-id', id);
    block.setAttribute('data-type', type);

    // 1. Left handle
    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = `
      <button class="btn-block-action btn-add-block" title="아래에 블록 추가"><i class="fa-solid fa-plus"></i></button>
      <button class="btn-block-action btn-block-drag" title="옵션 / 드래그"><i class="fa-solid fa-ellipsis-vertical"></i></button>
    `;

    // Add block button click
    handle.querySelector('.btn-add-block').addEventListener('click', () => {
      this.insertBlockAfter(block, 'text', '');
    });

    block.appendChild(handle);

    // 2. Type-specific prefix elements
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
      return block; // Divider has no editable content
    }

    // 3. Editable content area
    const contentEl = document.createElement('div');
    contentEl.className = 'block-content';
    contentEl.contentEditable = 'true';
    contentEl.innerHTML = content;

    // Placeholder
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
    // Input event
    contentEl.addEventListener('input', () => {
      const text = contentEl.innerText.trim();

      // Check for slash menu trigger
      if (text.startsWith('/')) {
        this.showSlashMenu(contentEl, block);
      } else {
        this.hideSlashMenu();
      }

      this.onUpdate();
    });

    // Keyboard navigation & shortcuts
    contentEl.addEventListener('keydown', (e) => {
      const type = block.getAttribute('data-type');

      // Slash menu navigation when open
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

      // Enter key: create new block
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // If in bullet/numbered/todo, retain type on enter
        const nextType = ['bullet', 'numbered', 'todo'].includes(type) ? type : 'text';
        
        // If current item is empty bullet/todo, convert back to text
        if (contentEl.innerText.trim() === '' && ['bullet', 'numbered', 'todo'].includes(type)) {
          this.changeBlockType(block, 'text');
          return;
        }

        const newBlock = this.insertBlockAfter(block, nextType, '');
        const newContent = newBlock.querySelector('.block-content');
        if (newContent) newContent.focus();
        return;
      }

      // Backspace key on empty block: delete or revert type
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

      // Arrow Up/Down navigation across blocks
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
    // Strip leading slash if any
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
        index = 1; // Reset when sequence breaks
      }
    });
  }

  // --- Slash Menu Logic ---
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
    this.hideSlashMenu();
    this.changeBlockType(this.slashTargetBlock, type);
  }

  // --- Floating Format Toolbar Logic ---
  handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      this.hideFormatToolbar();
      return;
    }

    // Check if selection is within our blocks editor
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const blockContent = container.nodeType === Node.ELEMENT_NODE 
      ? container.closest('.block-content') 
      : container.parentElement.closest('.block-content');

    if (!blockContent || !this.container.contains(blockContent)) {
      this.hideFormatToolbar();
      return;
    }

    // Position format toolbar above selection
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

  // --- Caret Helpers ---
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

  // --- Data extraction for saving ---
  getData() {
    const blocks = [];
    Array.from(this.container.children).forEach(blockEl => {
      const id = blockEl.getAttribute('data-id');
      const type = blockEl.getAttribute('data-type');
      const contentEl = blockEl.querySelector('.block-content');
      const content = contentEl ? contentEl.innerHTML : '';
      const checkbox = blockEl.querySelector('.todo-checkbox');
      const checked = checkbox ? checkbox.checked : false;

      blocks.push({ id, type, content, checked });
    });
    return blocks;
  }
}
