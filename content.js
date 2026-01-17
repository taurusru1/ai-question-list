// Gemini问题列表 - Content Script (侧边栏版本)
// 直接在Gemini页面上显示问题列表

(function () {
  'use strict';

  console.log('[Gemini问题列表] 插件已加载');

  // 存储键名
  const STORAGE_KEY = 'gemini_questions';

  // 拖拽控制（全局，供多个事件处理器访问）
  const dragControl = {
    isDragging: false,
    shouldStop: false
  };

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
          <button id="gh-export" title="导出问题">📥</button>
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
        bottom: 24px;
        right: 24px;
        width: 260px;
        height: 400px;
        background: rgba(248, 250, 252, 0.85); /* Slate-50 base */
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
        box-sizing: border-box;
        overflow: hidden;
        will-change: left, top, width, height;
      }
      #gemini-helper-sidebar * {
        box-sizing: border-box;
      }
      
      /* 侧边栏折叠状态 - 悬浮球样式 */
      #gemini-helper-sidebar.collapsed {
        height: 56px;
        width: 56px;
        border-radius: 28px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.4);
      }
      #gemini-helper-sidebar.collapsed .gh-header { 
        height: 100%;
        width: 100%;
        padding: 0;
        background: transparent;
        border: none;
        cursor: move;
      }
      #gemini-helper-sidebar.collapsed .gh-title,
      #gemini-helper-sidebar.collapsed .gh-actions > button:not(#gh-toggle) { 
        display: none; 
      }
      #gemini-helper-sidebar.collapsed .gh-actions { 
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
        margin: 0;
        padding: 0;
      }
      #gemini-helper-sidebar.collapsed #gh-toggle { 
        font-size: 24px;
        padding: 0;
        margin: 0;
        background: transparent;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        opacity: 1;
      }
      #gemini-helper-sidebar.collapsed .gh-search,
      #gemini-helper-sidebar.collapsed .gh-stats,
      #gemini-helper-sidebar.collapsed .gh-list { display: none; }

      /* 头部样式 */
      .gh-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 18px;
        background: rgba(255, 255, 255, 0.4);
        border-bottom: 1px solid rgba(255, 255, 255, 0.6);
        cursor: move;
        user-select: none;
      }
      .gh-title {
        color: #334155;
        font-size: 15px;
        font-weight: 700;
        background: linear-gradient(to right, #334155, #64748b);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.5px;
      }
      
      .gh-actions { display: flex; gap: 6px; }
      .gh-actions button {
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 8px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        cursor: pointer;
        color: #64748b;
        font-size: 14px;
        transition: all 0.2s;
      }
      .gh-actions button:hover {
        background: rgba(255, 255, 255, 0.9);
        color: #4f46e5;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      /* 搜索框 */
      .gh-search {
        padding: 12px 16px 8px;
      }
      .gh-search input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.6);
        color: #1e293b;
        font-size: 13px;
        outline: none;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      }
      .gh-search input:focus {
        border-color: rgba(79, 70, 229, 0.5);
        background: #fff;
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1);
      }
      
      /* 统计 */
      .gh-stats {
        padding: 0 16px 8px;
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
      }
      
      /* 列表 */
      .gh-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 12px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .gh-list::-webkit-scrollbar { width: 4px; }
      .gh-list::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }
      .gh-list::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }
      
      /* 列表项 */
      .gh-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px;
        margin-bottom: 0;
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      }
      .gh-item:hover {
        background: rgba(255, 255, 255, 0.9);
        border-color: rgba(79, 70, 229, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .gh-num {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        box-shadow: 0 2px 6px rgba(79, 70, 229, 0.2);
      }
      .gh-text {
        flex: 1;
        font-size: 12px;
        line-height: 1.5;
        color: #334155;
        word-break: break-word;
      }
      
      /* 空状态 */
      .gh-empty {
        text-align: center;
        color: #64748b;
        padding: 40px 20px;
        font-size: 13px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      .gh-empty small {
        color: #94a3b8;
        font-size: 11px;
        margin-top: 4px;
      }
      
      /* ... (previous styles) ... */
      
      #gemini-helper-sidebar.dragging {
        transition: none !important;
        opacity: 0.95;
        transform: scale(1.02);
        cursor: grabbing;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(sidebar);

    // 绑定事件 - 点击toggle按钮或header都可以展开
    // 绑定事件 - 点击toggle按钮切换
    document.getElementById('gh-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      // 切换收缩/展开状态
      if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
      } else {
        sidebar.classList.add('collapsed');
      }
    });

    // 收缩状态下点击展开
    sidebar.addEventListener('click', (e) => {
      if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
      }
    });

    document.getElementById('gh-refresh').addEventListener('click', () => {
      updateQuestionList();
    });

    document.getElementById('gh-export').addEventListener('click', () => {
      exportQuestions();
    });

    document.getElementById('gh-search-input').addEventListener('input', (e) => {
      updateQuestionList(e.target.value);
    });

    // 拖拽功能
    initDrag(sidebar);

    console.log('[AI问题列表] 侧边栏已创建');
  }

  // 导出完整对话为Markdown文档（问答流格式）
  function exportQuestions() {
    const config = getSiteConfig();

    // 提取所有对话消息（用户和AI）
    const conversation = extractConversation(config);

    if (conversation.length === 0) {
      alert('暂无对话可导出！');
      return;
    }

    // 获取当前网站名称
    const host = window.location.hostname;
    let siteName = 'AI对话';
    if (host.includes('gemini')) siteName = 'Gemini';
    else if (host.includes('chatgpt') || host.includes('openai')) siteName = 'ChatGPT';
    else if (host.includes('claude')) siteName = 'Claude';
    else if (host.includes('kimi')) siteName = 'Kimi';
    else if (host.includes('tongyi')) siteName = '通义千问';
    else if (host.includes('yiyan')) siteName = '文心一言';
    else if (host.includes('deepseek')) siteName = 'DeepSeek';
    else if (host.includes('doubao')) siteName = '豆包';

    // 生成Markdown内容
    const now = new Date();
    const dateStr = now.toLocaleString('zh-CN');
    const questionCount = conversation.filter(m => m.role === 'user').length;

    let markdown = `# ${siteName} 对话记录\n\n`;
    markdown += `> 导出时间：${dateStr}\n`;
    markdown += `> 对话轮数：${questionCount} 轮\n\n`;
    markdown += `---\n\n`;

    let turnNumber = 0;
    conversation.forEach((msg) => {
      if (msg.role === 'user') {
        turnNumber++;
        markdown += `## 🧑 问题 ${turnNumber}\n\n`;
        markdown += `${msg.text}\n\n`;
      } else {
        markdown += `## 🤖 回答 ${turnNumber}\n\n`;
        markdown += `${msg.text}\n\n`;
        markdown += `---\n\n`;
      }
    });

    // 创建并下载文件
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName}_对话记录_${now.toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[AI问题列表] 已导出', questionCount, '轮对话');
  }

  // 提取完整对话（用户问题和AI回答）
  function extractConversation(config) {
    const conversation = [];

    // 获取所有用户消息元素
    const userMessages = document.querySelectorAll(config.userQuery);
    // 获取所有AI回答元素
    const aiMessages = config.aiResponse ? document.querySelectorAll(config.aiResponse) : [];

    // 尝试按DOM顺序交替提取
    // 方案1：如果用户消息和AI消息数量匹配，直接配对
    if (userMessages.length > 0 && aiMessages.length > 0) {
      const allMessages = [];

      // 收集所有消息及其位置
      userMessages.forEach(el => {
        const text = extractTextFromElement(el, config.textSelector);
        if (text) {
          allMessages.push({
            element: el,
            role: 'user',
            text: text,
            position: getElementPosition(el)
          });
        }
      });

      aiMessages.forEach(el => {
        const text = extractTextFromElement(el, config.aiTextSelector);
        if (text) {
          allMessages.push({
            element: el,
            role: 'assistant',
            text: text,
            position: getElementPosition(el)
          });
        }
      });

      // 按DOM位置排序
      allMessages.sort((a, b) => a.position - b.position);

      // 返回排序后的对话
      return allMessages.map(m => ({ role: m.role, text: m.text }));
    }

    // 方案2：只有用户消息，没有AI回答选择器匹配
    userMessages.forEach(el => {
      const text = extractTextFromElement(el, config.textSelector);
      if (text) {
        conversation.push({ role: 'user', text: text });
      }
    });

    return conversation;
  }

  // 从元素中提取文本
  function extractTextFromElement(element, textSelector) {
    let text = '';
    if (textSelector) {
      const textElement = element.querySelector(textSelector);
      text = textElement ? textElement.innerText.trim() : element.innerText.trim();
    } else {
      text = element.innerText.trim();
    }
    return text;
  }

  // 获取元素在文档中的位置（用于排序）
  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return rect.top + window.scrollY;
  }

  // 初始化拖拽功能（只在展开状态下允许拖拽）
  function initDrag(sidebar) {
    const header = sidebar.querySelector('.gh-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      // 收缩状态下不启动拖拽，让click事件处理展开
      if (sidebar.classList.contains('collapsed')) return;
      // 不拦截按钮点击
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      sidebar.classList.add('dragging');

      const rect = sidebar.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // 限制在窗口范围内
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

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        sidebar.classList.remove('dragging');
        savePosition(sidebar);
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
      container: '.conversation-container',
      aiResponse: 'model-response',
      aiTextSelector: '.model-response-text'
    },
    'chat.openai.com': {
      userQuery: '[data-message-author-role="user"]',
      textSelector: '.whitespace-pre-wrap',
      container: '[data-message-id]',
      aiResponse: '[data-message-author-role="assistant"]',
      aiTextSelector: '.whitespace-pre-wrap'
    },
    'chatgpt.com': {
      userQuery: '[data-message-author-role="user"]',
      textSelector: '.whitespace-pre-wrap',
      container: '[data-message-id]',
      aiResponse: '[data-message-author-role="assistant"]',
      aiTextSelector: '.whitespace-pre-wrap'
    },
    'claude.ai': {
      userQuery: '[data-testid="user-message"]',
      textSelector: 'p',
      container: null,
      aiResponse: '[data-testid="ai-message"]',
      aiTextSelector: 'p'
    },
    'kimi.moonshot.cn': {
      userQuery: '.chat-message-user',
      textSelector: '.message-content',
      container: null,
      aiResponse: '.chat-message-assistant',
      aiTextSelector: '.message-content'
    },
    'tongyi.aliyun.com': {
      userQuery: '.questionItem',
      textSelector: '.content',
      container: null,
      aiResponse: '.answerItem',
      aiTextSelector: '.content'
    },
    'yiyan.baidu.com': {
      userQuery: '.question-wrapper',
      textSelector: '.text',
      container: null,
      aiResponse: '.answer-wrapper',
      aiTextSelector: '.text'
    },
    'chat.deepseek.com': {
      userQuery: '.fbb737a4',
      textSelector: null,
      container: null,
      aiResponse: '.ds-markdown',
      aiTextSelector: null
    },
    'doubao.com': {
      userQuery: '[class*="user-message"], [class*="human"]',
      textSelector: '[class*="content"], p',
      container: null,
      aiResponse: '[class*="assistant-message"], [class*="ai"]',
      aiTextSelector: '[class*="content"], p'
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

