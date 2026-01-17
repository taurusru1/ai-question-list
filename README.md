# 💬 AI问题列表 (AI Question List)

一个轻量级的 Chrome 浏览器扩展，帮助你在使用各种 AI 聊天工具时，快速浏览和定位历史对话中的问题。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)

## ✨ 功能特点

- 🔍 **自动提取问题**：自动识别并提取你在 AI 对话中提出的所有问题
- 📋 **清晰列表展示**：问题以列表形式展示，支持搜索过滤
- 🎯 **快速定位**：点击问题即可滚动到对应位置并高亮显示
- 🖱️ **自由拖拽**：侧边栏可以自由拖动到任意位置，位置自动保存
- 🔘 **收起/展开**：可收缩为小圆球，不遮挡页面内容
- 🌐 **多平台支持**：支持多个主流 AI 聊天平台

## 🌍 支持的平台

| 平台 | 网址 |
|------|------|
| Google Gemini | gemini.google.com |
| ChatGPT | chat.openai.com / chatgpt.com |
| Claude | claude.ai |
| Kimi | kimi.moonshot.cn |
| 通义千问 | tongyi.aliyun.com |
| 文心一言 | yiyan.baidu.com |
| DeepSeek | chat.deepseek.com |
| 豆包 | www.doubao.com |

## 📦 安装方法

### 方法一：从源码安装（推荐）

1. **下载项目**
   
   **GitHub:**
   ```bash
   git clone https://github.com/taurusru1/ai-question-list.git
   ```
   
   **Gitee (国内用户推荐):**
   ```bash
   git clone git@gitee.com:taurusru1/ai-question-list.git
   ```
   
   或者直接下载 ZIP 并解压

2. **打开 Chrome 扩展管理页面**
   - 在地址栏输入 `chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

3. **开启开发者模式**
   - 点击页面右上角的「开发者模式」开关

4. **加载扩展**
   - 点击「加载已解压的扩展程序」
   - 选择下载的项目文件夹

5. **开始使用**
   - 打开任意支持的 AI 聊天网站
   - 右下角会出现问题列表侧边栏

### 方法二：从 Release 安装

1. 前往 [Releases](../../releases) 页面
2. 下载最新版本的 ZIP 文件
3. 解压后按照上述步骤 2-5 进行安装

## 🎮 使用说明

### 基本操作

- **查看问题列表**：侧边栏自动显示当前对话中的所有问题
- **搜索问题**：在搜索框中输入关键词过滤问题
- **定位问题**：点击列表中的问题，页面会自动滚动到对应位置
- **刷新列表**：点击 🔄 按钮手动刷新问题列表

### 侧边栏操作

- **拖动位置**：按住标题栏拖动，可以移动侧边栏到任意位置
- **收起/展开**：点击 💬 按钮收起为小圆球，再次点击展开
- **位置记忆**：侧边栏位置会自动保存，刷新页面后恢复

## 📁 项目结构

```
geminiHelper/
├── manifest.json      # 扩展配置文件
├── content.js         # 内容脚本（核心逻辑）
├── popup.html         # 弹出窗口 HTML
├── popup.js           # 弹出窗口逻辑
├── styles.css         # 弹出窗口样式
├── icons/             # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 说明文档
```

## 🔧 开发

如果你想参与开发或自定义功能：

1. Fork 本项目
2. 修改代码
3. 在 `chrome://extensions/` 点击刷新按钮重新加载
4. 提交 Pull Request

### 添加新平台支持

在 `content.js` 中找到 `SITE_CONFIGS` 对象，添加新平台的配置：

```javascript
'example.com': {
  userQuery: '.user-message-selector',  // 用户消息的选择器
  textSelector: '.text-content',        // 消息文本的选择器
  container: null                        // 容器选择器（可选）
}
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## ⭐ 支持

如果这个项目对你有帮助，请给一个 Star ⭐ 支持一下！
