// Gemini问题列表 - Popup Script

const STORAGE_KEY = 'gemini_questions';

// 获取当前标签页
async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// 从content script获取实时问题列表
async function fetchQuestionsFromPage() {
    const tab = await getCurrentTab();

    if (!tab.url.includes('gemini.google.com')) {
        return null;
    }

    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getQuestions' });
        return response.questions || [];
    } catch (error) {
        console.log('无法从页面获取问题，尝试从存储读取');
        return null;
    }
}

// 从Storage获取问题列表
async function getQuestionsFromStorage() {
    const tab = await getCurrentTab();
    const sessionId = tab.url.split('/').pop() || 'default';

    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const allData = result[STORAGE_KEY] || {};
            const sessionData = allData[sessionId];
            resolve(sessionData ? sessionData.questions : []);
        });
    });
}

// 渲染问题列表
function renderQuestions(questions, filter = '') {
    const listContainer = document.getElementById('questionList');
    const countElement = document.getElementById('questionCount');

    // 过滤问题
    const filteredQuestions = filter
        ? questions.filter(q => q.text.toLowerCase().includes(filter.toLowerCase()))
        : questions;

    countElement.textContent = filteredQuestions.length;

    if (filteredQuestions.length === 0) {
        listContainer.innerHTML = `
      <div class="empty-state">
        <p>${filter ? '未找到匹配的问题' : '暂无问题'}</p>
        <p class="hint">${filter ? '尝试其他关键词' : '在Gemini中提问后，问题将自动显示在这里'}</p>
      </div>
    `;
        return;
    }

    listContainer.innerHTML = filteredQuestions.map((q, idx) => `
    <div class="question-item" data-turn-id="${q.id}">
      <span class="question-number">${q.index}</span>
      <span class="question-text">${escapeHtml(q.preview)}</span>
    </div>
  `).join('');

    // 添加点击事件
    listContainer.querySelectorAll('.question-item').forEach(item => {
        item.addEventListener('click', async () => {
            const turnId = item.dataset.turnId;
            const tab = await getCurrentTab();

            chrome.tabs.sendMessage(tab.id, {
                action: 'scrollTo',
                turnId: turnId
            });

            // 关闭popup
            window.close();
        });
    });
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 刷新问题列表
async function refreshQuestions() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.classList.add('spinning');

    let questions = await fetchQuestionsFromPage();

    if (questions === null) {
        questions = await getQuestionsFromStorage();
    }

    renderQuestions(questions, document.getElementById('searchInput').value);

    setTimeout(() => {
        refreshBtn.classList.remove('spinning');
    }, 500);
}

// 清空记录
async function clearRecords() {
    if (confirm('确定要清空所有问题记录吗？')) {
        const tab = await getCurrentTab();
        const sessionId = tab.url.split('/').pop() || 'default';

        chrome.storage.local.get([STORAGE_KEY], (result) => {
            const allData = result[STORAGE_KEY] || {};
            delete allData[sessionId];
            chrome.storage.local.set({ [STORAGE_KEY]: allData }, () => {
                renderQuestions([]);
            });
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 加载问题列表
    await refreshQuestions();

    // 搜索框事件
    const searchInput = document.getElementById('searchInput');
    let debounceTimer;

    searchInput.addEventListener('input', async () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            let questions = await fetchQuestionsFromPage();
            if (questions === null) {
                questions = await getQuestionsFromStorage();
            }
            renderQuestions(questions, searchInput.value);
        }, 200);
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', refreshQuestions);

    // 清空按钮
    document.getElementById('clearBtn').addEventListener('click', (e) => {
        e.preventDefault();
        clearRecords();
    });
});
