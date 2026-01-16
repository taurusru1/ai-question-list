// Gemini问题列表 - Content Script (侧边栏版本)
// 直接在Gemini页面上显示问题列表

(function () {
  'use strict';

  console.log('[Gemini问题列表] 插件已加载');

  // 存储键名
  const STORAGE_KEY = 'gemini_questions';

  // 创建侧边栏UI
  function createSidebar() {
    // 检查是否已存在
    if (document.getElementById('gemini-helper-sidebar')) {
      return;
    }

    const sidebar = document.createElement('div');
    sidebar.id = 'gemini-helper-sidebar';
    sidebar.innerHTML = `
      <div class="gh-header">
        <span class="gh-title">💬 问题列表</span>
        <div class="gh-actions">
          <button id="gh-refresh" title="刷新">🔄</button>
          <button id="gh-toggle" title="收起">💬</button>
        </div>
      </div>
      <div class="gh-search">
        <input type="text" id="gh-search-input" placeholder="搜索问题..." />
      </div>
      <div class="gh-stats">
        <span id="gh-count">0</span> 个问题
      </div>
      <div id="gh-list" class="gh-list">
        <div class="gh-empty">暂无问题<br><small>在Gemini中提问后会自动显示</small></div>
      </div>
    `;

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
      #gemini-helper-sidebar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 200px;
        height: 350px;
        background: rgba(26, 26, 46, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        font-family: 'Segoe UI', -apple-system, sans-serif;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        box-sizing: border-box;
      }
      #gemini-helper-sidebar * {
        box-sizing: border-box;
      }
      #gemini-helper-sidebar.collapsed {
        height: 48px;
        width: 48px;
        border-radius: 50%;
        overflow: hidden;
      }
      #gemini-helper-sidebar.collapsed .gh-header { 
        border-radius: 50%;
        cursor: move; /* 确保可拖动 */
        padding: 0;
        width: 100%; /* 填满父容器 */
        height: 100%;
        justify-content: center;
        border: none;
        position: absolute; /* 覆盖在最上层 */
        top: 0;
        left: 0;
        z-index: 2;
      }
      #gemini-helper-sidebar.collapsed .gh-title { display: none; }
      #gemini-helper-sidebar.collapsed .gh-actions { 
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
      }
      #gemini-helper-sidebar.collapsed #gh-refresh { display: none; }
      #gemini-helper-sidebar.collapsed #gh-toggle { 
        font-size: 20px;
        padding: 0;
        background: transparent;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none; /* 让点击穿透到header处理拖动 */
      }
      #gemini-helper-sidebar.collapsed .gh-search,
      #gemini-helper-sidebar.collapsed .gh-stats,
      #gemini-helper-sidebar.collapsed .gh-list { display: none; }
      .gh-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 14px;
        background: rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px 12px 0 0;
        cursor: move;
        user-select: none;
      }
      #gemini-helper-sidebar.dragging {
        transition: none !important;
        opacity: 0.9;
      }
      .gh-title {
        color: #fff;
        font-size: 14px;
        font-weight: 600;
      }
      .gh-actions { display: flex; gap: 6px; }
      .gh-actions button {
        background: rgba(255,255,255,0.1);
        border: none;
        border-radius: 6px;
        padding: 6px 8px;
        cursor: pointer;
        color: #a1a1aa;
        font-size: 12px;
        transition: all 0.2s;
      }
      .gh-actions button:hover {
        background: rgba(66,133,244,0.3);
        color: #fff;
      }
      #gh-toggle { transition: transform 0.3s; }
      .gh-search {
        padding: 8px 12px;
      }
      .gh-search input {
        width: 100%;
        padding: 6px 10px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        background: rgba(0,0,0,0.2);
        color: #fff;
        font-size: 12px;
        outline: none;
        transition: all 0.2s;
      }
      .gh-search input:focus {
        border-color: rgba(66,133,244,0.5);
        background: rgba(0,0,0,0.3);
      }
      .gh-stats {
        padding: 0 14px 8px;
        font-size: 11px;
        color: #71717a;
      }
      .gh-list {
        flex: 1;
        overflow-y: auto;
        padding: 0 10px 10px;
      }
      .gh-list::-webkit-scrollbar { width: 3px; }
      .gh-list::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15);
        border-radius: 3px;
      }
      .gh-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px;
        margin-bottom: 6px;
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }
      .gh-item:hover {
        background: rgba(255,255,255,0.08);
        transform: translateX(2px);
      }
      .gh-num {
        flex-shrink: 0;
        width: 18px;
        height: 18px;
        background: rgba(66, 133, 244, 0.8);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        color: #fff;
      }
      .gh-text {
        flex: 1;
        font-size: 11px;
        line-height: 1.4;
        color: rgba(255,255,255,0.8);
      }
      .gh-empty {
        text-align: center;
        color: #71717a;
        padding: 40px 20px;
        font-size: 13px;
      }
      .gh-empty small {
        color: #52525b;
        font-size: 11px;
      }
      .gh-empty {
        text-align: center;
        color: #71717a;
        padding: 40px 20px;
        font-size: 13px;
      }
      .gh-empty small {
        color: #52525b;
        font-size: 11px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(sidebar);

    // 绑定事件 - 点击toggle按钮或header都可以展开
    // 绑定事件 - 点击toggle按钮切换
    document.getElementById('gh-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      // 如果不在收缩状态，点击按钮可以收起
      if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
      }
    });

    // 收起状态下点击header区域展开（由拖拽逻辑处理点击区分）

    document.getElementById('gh-refresh').addEventListener('click', () => {
      updateQuestionList();
    });

    document.getElementById('gh-search-input').addEventListener('input', (e) => {
      updateQuestionList(e.target.value);
    });

    // 拖拽功能
    initDrag(sidebar);

    console.log('[AI问题列表] 侧边栏已创建');
  }

  // 初始化拖拽功能
  function initDrag(sidebar) {
    const header = sidebar.querySelector('.gh-header');
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      // 展开状态下不拦截按钮点击
      if (!sidebar.classList.contains('collapsed') && e.target.tagName === 'BUTTON') return;

      isDragging = true;
      hasMoved = false;
      sidebar.classList.add('dragging');

      const rect = sidebar.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      // 防止文字选中
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // 只有移动超过一定距离才算是拖动，防止误触
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved = true;
      }

      if (!hasMoved) return;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // 限制在窗口范围内
      // 考虑当前sidebar的尺寸（收缩或展开）
      const width = sidebar.offsetWidth;
      const height = sidebar.offsetHeight;
      const maxLeft = window.innerWidth - width;
      const maxTop = window.innerHeight - height;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      sidebar.style.right = 'auto';
      sidebar.style.bottom = 'auto';
      sidebar.style.left = newLeft + 'px';
      sidebar.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        // 如果是点击（没有移动），且处于收缩状态，则展开
        if (!hasMoved && sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
        }

        isDragging = false;
        sidebar.classList.remove('dragging');

        if (hasMoved) {
          savePosition(sidebar);
        }
      }
    });

    // 恢复保存的位置
    restorePosition(sidebar);
  }

  // 保存位置
  function savePosition(sidebar) {
    const pos = {
      left: sidebar.style.left,
      top: sidebar.style.top
    };
    localStorage.setItem('gh_sidebar_position', JSON.stringify(pos));
  }

  // 恢复位置
  function restorePosition(sidebar) {
    try {
      const saved = localStorage.getItem('gh_sidebar_position');
      if (saved) {
        const pos = JSON.parse(saved);
        if (pos.left && pos.top) {
          sidebar.style.right = 'auto';
          sidebar.style.bottom = 'auto';
          sidebar.style.left = pos.left;
          sidebar.style.top = pos.top;
        }
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 不同AI网站的DOM选择器配置
  const SITE_CONFIGS = {
    'gemini.google.com': {
      userQuery: 'user-query',
      textSelector: '.query-text-line',
      container: '.conversation-container'
    },
    'chat.openai.com': {
      userQuery: '[data-message-author-role="user"]',
      textSelector: '.whitespace-pre-wrap',
      container: '[data-message-id]'
    },
    'chatgpt.com': {
      userQuery: '[data-message-author-role="user"]',
      textSelector: '.whitespace-pre-wrap',
      container: '[data-message-id]'
    },
    'claude.ai': {
      userQuery: '[data-testid="user-message"]',
      textSelector: 'p',
      container: null
    },
    'kimi.moonshot.cn': {
      userQuery: '.chat-message-user',
      textSelector: '.message-content',
      container: null
    },
    'tongyi.aliyun.com': {
      userQuery: '.questionItem',
      textSelector: '.content',
      container: null
    },
    'yiyan.baidu.com': {
      userQuery: '.question-wrapper',
      textSelector: '.text',
      container: null
    },
    'chat.deepseek.com': {
      userQuery: '.fbb737a4',
      textSelector: null,
      container: null
    },
    'doubao.com': {
      userQuery: '[class*="user-message"], [class*="human"]',
      textSelector: '[class*="content"], p',
      container: null
    }
  };

  // 获取当前网站配置
  function getSiteConfig() {
    const host = window.location.hostname;
    for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
      if (host.includes(domain.replace('www.', ''))) {
        return config;
      }
    }
    // 默认配置：通用选择器
    return {
      userQuery: '[class*="user"], [class*="question"], [data-role="user"]',
      textSelector: 'p, span, div',
      container: null
    };
  }

  // 提取所有用户问题
  function extractQuestions() {
    const questions = [];
    const config = getSiteConfig();

    const userQueries = document.querySelectorAll(config.userQuery);

    userQueries.forEach((query, index) => {
      let text = '';

      if (config.textSelector) {
        const textElement = query.querySelector(config.textSelector);
        text = textElement ? textElement.innerText.trim() : query.innerText.trim();
      } else {
        text = query.innerText.trim();
      }

      if (text) {
        const container = config.container ? query.closest(config.container) : null;
        const turnId = container?.id || `question-${index}`;
        const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;

        questions.push({
          id: turnId,
          element: query, // 保存元素引用用于滚动
          text: text,
          preview: preview,
          index: index + 1
        });
      }
    });

    console.log('[AI问题列表] 找到', questions.length, '个问题');
    return questions;
  }

  // 更新问题列表UI
  function updateQuestionList(filter = '') {
    const listContainer = document.getElementById('gh-list');
    const countElement = document.getElementById('gh-count');

    if (!listContainer) return;

    const questions = extractQuestions();
    const filtered = filter
      ? questions.filter(q => q.text.toLowerCase().includes(filter.toLowerCase()))
      : questions;

    countElement.textContent = filtered.length;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="gh-empty">
          ${filter ? '未找到匹配的问题' : '暂无问题'}
          <br><small>${filter ? '尝试其他关键词' : '在Gemini中提问后会自动显示'}</small>
        </div>
      `;
      return;
    }

    // 存储当前问题列表用于定位
    window._ghQuestions = filtered;

    listContainer.innerHTML = filtered.map((q, idx) => `
      <div class="gh-item" data-index="${idx}">
        <span class="gh-num">${q.index}</span>
        <span class="gh-text">${escapeHtml(q.preview)}</span>
      </div>
    `).join('');

    // 绑定点击事件
    listContainer.querySelectorAll('.gh-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        scrollToQuestion(idx);
      });
    });
  }

  // HTML转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 滚动到指定问题
  function scrollToQuestion(idx) {
    const questions = window._ghQuestions || [];
    const q = questions[idx];

    if (!q) return;

    // 优先使用保存的元素引用
    let element = q.element;

    // 如果元素引用失效，尝试通过ID获取
    if (!element || !document.contains(element)) {
      element = document.getElementById(q.id);
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 高亮效果
      element.style.transition = 'background-color 0.3s, box-shadow 0.3s';
      element.style.backgroundColor = 'rgba(66, 133, 244, 0.2)';
      element.style.boxShadow = '0 0 0 2px rgba(66, 133, 244, 0.5)';

      setTimeout(() => {
        element.style.backgroundColor = '';
        element.style.boxShadow = '';
      }, 2000);
    }
  }

  // 初始化MutationObserver
  function initObserver() {
    const config = getSiteConfig();

    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 通用检测：检查是否有新的用户消息元素
              try {
                if (node.matches && node.matches(config.userQuery)) {
                  hasNewContent = true;
                  break;
                }
                if (node.querySelector && node.querySelector(config.userQuery)) {
                  hasNewContent = true;
                  break;
                }
              } catch (e) {
                // 选择器可能无效，忽略
              }
            }
          }
        }
        if (hasNewContent) break;
      }

      if (hasNewContent) {
        setTimeout(() => {
          updateQuestionList(document.getElementById('gh-search-input')?.value || '');
        }, 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[AI问题列表] 监听器已启动');
  }

  // 初始化
  function init() {
    createSidebar();
    updateQuestionList();
    initObserver();
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // 延迟一下确保页面完全加载
    setTimeout(init, 1000);
  }
})();

