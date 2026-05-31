/**
 * AI Companion - Premium Chat Application
 * Main JavaScript File
 */

// Application State
const App = {
    currentChat: null,
    chats: [],
    memories: [],
    settings: {},
    aiConfig: {},
    isGenerating: false,
    abortController: null,
    
    // API Base URL
    apiBase: '/api/chat.php',
    adminApiBase: '/api/admin.php'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    await loadSettings();
    await loadAIConfig();
    await loadChats();
    await loadMemories();
    setupEventListeners();
    applySettings();
}

// Event Listeners Setup
function setupEventListeners() {
    // New Chat Button
    document.getElementById('newChatBtn').addEventListener('click', createNewChat);
    
    // Send Message
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    document.getElementById('messageInput').addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
    
    // Stop Generation
    document.getElementById('stopBtn').addEventListener('click', stopGeneration);
    
    // Chat Actions
    document.getElementById('pinChatBtn').addEventListener('click', togglePinChat);
    document.getElementById('renameChatBtn').addEventListener('click', showRenameModal);
    document.getElementById('deleteChatBtn').addEventListener('click', deleteCurrentChat);
    
    // Search
    document.getElementById('chatSearch').addEventListener('input', filterChats);
    
    // Mobile Menu
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    
    // Settings Modal
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    
    // Memory Modal
    document.getElementById('memoryBtn').addEventListener('click', openMemoryModal);
    document.getElementById('addMemoryBtn').addEventListener('click', showAddMemoryModal);
    document.getElementById('confirmAddMemoryBtn').addEventListener('click', addMemory);
    document.getElementById('memorySearch').addEventListener('input', filterMemories);
    
    // Data Management
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importData);
    document.getElementById('clearMemoriesBtn').addEventListener('click', clearMemories);
    document.getElementById('deleteAllChatsBtn').addEventListener('click', deleteAllChats);
    
    // Modal Close Buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Rename Modal
    document.getElementById('confirmRenameBtn').addEventListener('click', confirmRename);
    
    // Background Type Change
    document.getElementById('backgroundType').addEventListener('change', (e) => {
        document.getElementById('imageUploadRow').style.display = 
            e.target.value === 'image' ? 'block' : 'none';
    });
    
    // Color Presets
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            document.getElementById('accentColor').value = preset.dataset.color;
        });
    });
    
    // Close message menu on click outside
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('messageMenu');
        if (!menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
}

// Load Settings
async function loadSettings() {
    try {
        const response = await fetch(`${App.apiBase}?action=get_settings`);
        const data = await response.json();
        App.settings = data.settings || {};
    } catch (error) {
        console.error('Failed to load settings:', error);
        App.settings = getDefaultSettings();
    }
}

function getDefaultSettings() {
    return {
        theme: 'dark',
        accent_color: '#6366f1',
        dark_mode: true,
        amoled_mode: false,
        glassmorphism: true
    };
}

// Load AI Configuration
async function loadAIConfig() {
    try {
        const response = await fetch(`${App.apiBase}?action=get_ai_config`);
        const data = await response.json();
        App.aiConfig = data.config || {};
        updateAIIdentity();
    } catch (error) {
        console.error('Failed to load AI config:', error);
    }
}

function updateAIIdentity() {
    const name = App.aiConfig.name || 'Luna';
    const avatar = App.aiConfig.avatar;
    
    document.getElementById('aiName').textContent = `${name} • Online`;
    
    const initials = name.charAt(0).toUpperCase();
    document.querySelectorAll('.ai-avatar span').forEach(span => {
        span.textContent = initials;
    });
    
    if (avatar) {
        document.querySelectorAll('.ai-avatar').forEach(el => {
            el.innerHTML = `<img src="${avatar}" alt="${name}">`;
        });
    }
}

// Load Chats
async function loadChats() {
    try {
        const response = await fetch(`${App.apiBase}?action=get_chats`);
        const data = await response.json();
        App.chats = data.chats || [];
        renderChatList();
        
        // Load first chat or create new one
        if (App.chats.length > 0) {
            selectChat(App.chats[0].id);
        }
    } catch (error) {
        console.error('Failed to load chats:', error);
    }
}

// Render Chat List
function renderChatList(filteredChats = null) {
    const chatList = document.getElementById('chatList');
    const chats = filteredChats || App.chats;
    
    chatList.innerHTML = chats.map(chat => `
        <div class="chat-item ${App.currentChat?.id === chat.id ? 'active' : ''}" 
             data-id="${chat.id}" onclick="selectChat('${chat.id}')">
            <div class="chat-item-icon">
                💬
            </div>
            <div class="chat-item-info">
                <div class="chat-item-title">${escapeHtml(chat.title)}</div>
                <div class="chat-item-date">${formatDate(chat.updated_at)}</div>
            </div>
            ${chat.pinned ? '<svg class="chat-item-pinned" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>' : ''}
        </div>
    `).join('');
}

// Select Chat
async function selectChat(chatId) {
    try {
        const response = await fetch(`${App.apiBase}?action=get_chat&id=${chatId}`);
        const data = await response.json();
        
        if (data.chat) {
            App.currentChat = data.chat;
            renderMessages();
            renderChatList();
            updateChatHeader();
            
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
        }
    } catch (error) {
        console.error('Failed to load chat:', error);
    }
}

// Render Messages
function renderMessages() {
    const messagesContainer = document.getElementById('messages');
    
    if (!App.currentChat || App.currentChat.messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="ai-avatar large">
                    <span>${(App.aiConfig.name || 'Luna').charAt(0).toUpperCase()}</span>
                </div>
                <h2>Welcome to AI Companion</h2>
                <p>Start a conversation with your personalized AI assistant.</p>
            </div>
        `;
        return;
    }
    
    messagesContainer.innerHTML = App.currentChat.messages.map(msg => `
        <div class="message ${msg.role}" data-id="${msg.id}">
            <div class="message-avatar">
                ${msg.role === 'user' ? '👤' : (App.aiConfig.name || 'Luna').charAt(0).toUpperCase()}
            </div>
            <div class="message-body">
                <div class="message-content">${formatMessage(msg.content)}</div>
                ${msg.edited ? '<span class="message-edited">(edited)</span>' : ''}
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>
        </div>
    `).join('');
    
    // Add context menu to messages
    messagesContainer.querySelectorAll('.message').forEach(msgEl => {
        msgEl.addEventListener('contextmenu', (e) => showMessageMenu(e, msgEl.dataset.id));
    });
    
    scrollToBottom();
}

// Show Message Menu
function showMessageMenu(e, messageId) {
    e.preventDefault();
    const menu = document.getElementById('messageMenu');
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.classList.remove('hidden');
    menu.dataset.messageId = messageId;
}

// Send Message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content || App.isGenerating) return;
    
    // Create new chat if needed
    if (!App.currentChat) {
        await createNewChat();
    }
    
    App.isGenerating = true;
    updateSendButtonState();
    
    input.value = '';
    input.style.height = 'auto';
    
    // Add user message optimistically
    const userMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: content,
        timestamp: Math.floor(Date.now() / 1000)
    };
    
    App.currentChat.messages.push(userMessage);
    renderMessages();
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        App.abortController = new AbortController();
        
        const response = await fetch(`${App.apiBase}?action=send_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: App.currentChat.id,
                content: content
            })
        });
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let assistantMessage = null;
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'message' && !assistantMessage) {
                            // User message confirmed
                            continue;
                        }
                        
                        if (data.type === 'chunk') {
                            if (!assistantMessage) {
                                assistantMessage = {
                                    id: 'msg_' + Date.now(),
                                    role: 'assistant',
                                    content: '',
                                    timestamp: Math.floor(Date.now() / 1000)
                                };
                                App.currentChat.messages.push(assistantMessage);
                            }
                            
                            assistantContent += data.content;
                            assistantMessage.content = assistantContent;
                            renderMessages();
                            scrollToBottom();
                        }
                        
                        if (data.type === 'done') {
                            break;
                        }
                        
                        if (data.type === 'error') {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
        
        // Reload chat to get saved state
        await selectChat(App.currentChat.id);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Failed to send message:', error);
            showError('Failed to send message. Please try again.');
        }
    } finally {
        hideTypingIndicator();
        App.isGenerating = false;
        App.abortController = null;
        updateSendButtonState();
    }
}

// Show Typing Indicator
function showTypingIndicator() {
    const messages = document.getElementById('messages');
    const indicator = document.createElement('div');
    indicator.id = 'typingIndicator';
    indicator.className = 'message assistant';
    indicator.innerHTML = `
        <div class="message-avatar">
            ${(App.aiConfig.name || 'Luna').charAt(0).toUpperCase()}
        </div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    messages.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Stop Generation
function stopGeneration() {
    if (App.abortController) {
        App.abortController.abort();
    }
}

// Update Send Button State
function updateSendButtonState() {
    const sendBtn = document.getElementById('sendBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (App.isGenerating) {
        sendBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
    } else {
        sendBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
}

// Create New Chat
async function createNewChat() {
    try {
        const response = await fetch(`${App.apiBase}?action=create_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.chat) {
            App.chats.unshift(data.chat);
            await selectChat(data.chat.id);
            renderChatList();
        }
    } catch (error) {
        console.error('Failed to create chat:', error);
    }
}

// Toggle Pin Chat
async function togglePinChat() {
    if (!App.currentChat) return;
    
    try {
        await fetch(`${App.apiBase}?action=pin_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: App.currentChat.id,
                pinned: !App.currentChat.pinned
            })
        });
        
        App.currentChat.pinned = !App.currentChat.pinned;
        
        // Update in list
        const chat = App.chats.find(c => c.id === App.currentChat.id);
        if (chat) chat.pinned = App.currentChat.pinned;
        
        renderChatList();
    } catch (error) {
        console.error('Failed to pin chat:', error);
    }
}

// Show Rename Modal
function showRenameModal() {
    if (!App.currentChat) return;
    
    document.getElementById('renameInput').value = App.currentChat.title;
    document.getElementById('renameModal').classList.remove('hidden');
    document.getElementById('renameInput').focus();
}

// Confirm Rename
async function confirmRename() {
    const title = document.getElementById('renameInput').value.trim();
    if (!title || !App.currentChat) return;
    
    try {
        await fetch(`${App.apiBase}?action=rename_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: App.currentChat.id,
                title: title
            })
        });
        
        App.currentChat.title = title;
        document.getElementById('chatTitle').textContent = title;
        
        // Update in list
        const chat = App.chats.find(c => c.id === App.currentChat.id);
        if (chat) chat.title = title;
        
        renderChatList();
        document.getElementById('renameModal').classList.add('hidden');
    } catch (error) {
        console.error('Failed to rename chat:', error);
    }
}

// Delete Current Chat
async function deleteCurrentChat() {
    if (!App.currentChat) return;
    
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    try {
        await fetch(`${App.apiBase}?action=delete_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: App.currentChat.id })
        });
        
        App.chats = App.chats.filter(c => c.id !== App.currentChat.id);
        App.currentChat = null;
        
        renderChatList();
        renderMessages();
        document.getElementById('chatTitle').textContent = 'New Conversation';
    } catch (error) {
        console.error('Failed to delete chat:', error);
    }
}

// Filter Chats
function filterChats() {
    const query = document.getElementById('chatSearch').value.toLowerCase();
    
    if (!query) {
        renderChatList();
        return;
    }
    
    const filtered = App.chats.filter(chat => 
        chat.title.toLowerCase().includes(query)
    );
    
    renderChatList(filtered);
}

// Toggle Sidebar (Mobile)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// Update Chat Header
function updateChatHeader() {
    if (App.currentChat) {
        document.getElementById('chatTitle').textContent = App.currentChat.title;
    }
}

// Scroll to Bottom
function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    container.scrollTop = container.scrollHeight;
}

// Format Message (basic markdown)
function formatMessage(content) {
    // Escape HTML
    let formatted = escapeHtml(content);
    
    // Code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format Date
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    return date.toLocaleDateString();
}

// Format Time
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Show Error
function showError(message) {
    alert(message);
}

// Settings Functions
async function openSettings() {
    // Populate settings form
    document.getElementById('darkModeToggle').checked = App.settings.dark_mode ?? true;
    document.getElementById('amoledToggle').checked = App.settings.amoled_mode ?? false;
    document.getElementById('glassToggle').checked = App.settings.glassmorphism ?? true;
    document.getElementById('accentColor').value = App.settings.accent_color ?? '#6366f1';
    document.getElementById('backgroundType').value = App.settings.background_type ?? 'color';
    document.getElementById('backgroundBlur').value = App.settings.background_blur ?? 0;
    
    // Populate AI config form
    document.getElementById('aiNameInput').value = App.aiConfig.name ?? '';
    document.getElementById('aiAvatarInput').value = App.aiConfig.avatar ?? '';
    document.getElementById('aiPersonality').value = App.aiConfig.personality ?? 'caring';
    document.getElementById('aiCommunicationStyle').value = App.aiConfig.communication_style ?? 'casual';
    document.getElementById('aiTone').value = App.aiConfig.tone ?? 'warm';
    document.getElementById('aiBiography').value = App.aiConfig.biography ?? '';
    document.getElementById('aiBackgroundStory').value = App.aiConfig.background_story ?? '';
    document.getElementById('aiCustomPrompts').value = App.aiConfig.custom_prompts ?? '';
    
    document.getElementById('settingsModal').classList.remove('hidden');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

async function saveSettings() {
    // Collect appearance settings
    const newSettings = {
        dark_mode: document.getElementById('darkModeToggle').checked,
        amoled_mode: document.getElementById('amoledToggle').checked,
        glassmorphism: document.getElementById('glassToggle').checked,
        accent_color: document.getElementById('accentColor').value,
        background_type: document.getElementById('backgroundType').value,
        background_blur: parseInt(document.getElementById('backgroundBlur').value)
    };
    
    // Collect AI config
    const newAIConfig = {
        name: document.getElementById('aiNameInput').value.trim() || 'Luna',
        avatar: document.getElementById('aiAvatarInput').value.trim(),
        personality: document.getElementById('aiPersonality').value,
        communication_style: document.getElementById('aiCommunicationStyle').value,
        tone: document.getElementById('aiTone').value,
        biography: document.getElementById('aiBiography').value.trim(),
        background_story: document.getElementById('aiBackgroundStory').value.trim(),
        custom_prompts: document.getElementById('aiCustomPrompts').value.trim()
    };
    
    try {
        await fetch(`${App.apiBase}?action=save_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        
        await fetch(`${App.apiBase}?action=save_ai_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAIConfig)
        });
        
        App.settings = { ...App.settings, ...newSettings };
        App.aiConfig = { ...App.aiConfig, ...newAIConfig };
        
        applySettings();
        updateAIIdentity();
        
        document.getElementById('settingsModal').classList.add('hidden');
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

function applySettings() {
    const body = document.body;
    
    // Theme
    if (App.settings.dark_mode) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
    
    // AMOLED
    if (App.settings.amoled_mode) {
        body.classList.add('amoled-mode');
    } else {
        body.classList.remove('amoled-mode');
    }
    
    // Glassmorphism
    if (App.settings.glassmorphism) {
        body.classList.add('glass-effect');
    } else {
        body.classList.remove('glass-effect');
    }
    
    // Accent color
    if (App.settings.accent_color) {
        document.documentElement.style.setProperty('--primary', App.settings.accent_color);
    }
    
    // Background
    if (App.settings.background_type === 'image' && App.settings.background_value) {
        document.getElementById('chatContainer').style.backgroundImage = `url(${App.settings.background_value})`;
        document.getElementById('chatContainer').style.backgroundSize = 'cover';
        document.getElementById('chatContainer').style.backgroundPosition = 'center';
    }
    
    if (App.settings.background_blur > 0) {
        document.getElementById('chatContainer').style.filter = `blur(${App.settings.background_blur}px)`;
    }
}

// Memory Functions
async function loadMemories() {
    try {
        const response = await fetch(`${App.apiBase}?action=get_memories`);
        const data = await response.json();
        App.memories = data.memories || [];
    } catch (error) {
        console.error('Failed to load memories:', error);
    }
}

async function openMemoryModal() {
    await loadMemories();
    renderMemories();
    document.getElementById('memoryModal').classList.remove('hidden');
}

function renderMemories(filteredMemories = null) {
    const memoryList = document.getElementById('memoryList');
    const memories = filteredMemories || App.memories;
    
    if (memories.length === 0) {
        memoryList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No memories yet. Memories are automatically created from your conversations.</p>';
        return;
    }
    
    memoryList.innerHTML = memories.map(memory => `
        <div class="memory-item">
            <div class="memory-item-content">
                <div class="memory-item-text">${escapeHtml(memory.content)}</div>
                <div class="memory-item-meta">
                    <span>${memory.type}</span>
                    <span>Importance: ${(memory.importance * 100).toFixed(0)}%</span>
                    <span>${formatDate(memory.created_at)}</span>
                </div>
            </div>
            <div class="memory-item-actions">
                <button class="btn-icon" onclick="deleteMemory('${memory.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function filterMemories() {
    const query = document.getElementById('memorySearch').value.toLowerCase();
    
    if (!query) {
        renderMemories();
        return;
    }
    
    const filtered = App.memories.filter(memory =>
        memory.content.toLowerCase().includes(query) ||
        memory.type.toLowerCase().includes(query)
    );
    
    renderMemories(filtered);
}

function showAddMemoryModal() {
    document.getElementById('newMemoryContent').value = '';
    document.getElementById('newMemoryType').value = 'general';
    document.getElementById('addMemoryModal').classList.remove('hidden');
}

async function addMemory() {
    const content = document.getElementById('newMemoryContent').value.trim();
    const type = document.getElementById('newMemoryType').value;
    
    if (!content) return;
    
    try {
        await fetch(`${App.apiBase}?action=add_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type })
        });
        
        await loadMemories();
        renderMemories();
        document.getElementById('addMemoryModal').classList.add('hidden');
    } catch (error) {
        console.error('Failed to add memory:', error);
    }
}

async function deleteMemory(id) {
    if (!confirm('Delete this memory?')) return;
    
    try {
        await fetch(`${App.apiBase}?action=delete_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        await loadMemories();
        renderMemories();
    } catch (error) {
        console.error('Failed to delete memory:', error);
    }
}

async function clearMemories() {
    if (!confirm('Are you sure you want to clear all memories? This cannot be undone.')) return;
    
    try {
        App.memories = [];
        await fetch(`${App.apiBase}?action=delete_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'all' })
        });
        
        document.getElementById('memoryList').innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">All memories cleared.</p>';
    } catch (error) {
        console.error('Failed to clear memories:', error);
    }
}

// Data Management
function exportData() {
    window.location.href = `${App.apiBase}?action=export_data`;
}

async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        await fetch(`${App.apiBase}?action=import_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        alert('Data imported successfully! Reloading...');
        location.reload();
    } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please check the file format.');
    }
}

async function deleteAllChats() {
    if (!confirm('Are you sure you want to delete ALL chats? This cannot be undone.')) return;
    
    try {
        for (const chat of App.chats) {
            await fetch(`${App.apiBase}?action=delete_chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: chat.id })
            });
        }
        
        App.chats = [];
        App.currentChat = null;
        renderChatList();
        renderMessages();
    } catch (error) {
        console.error('Failed to delete all chats:', error);
    }
}

// Message Actions Menu
document.addEventListener('DOMContentLoaded', () => {
    const messageMenu = document.getElementById('messageMenu');
    
    messageMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const action = item.dataset.action;
            const messageId = messageMenu.dataset.messageId;
            
            messageMenu.classList.add('hidden');
            
            switch (action) {
                case 'copy':
                    copyMessage(messageId);
                    break;
                case 'edit':
                    editMessage(messageId);
                    break;
                case 'regenerate':
                    regenerateResponse(messageId);
                    break;
                case 'delete':
                    deleteMessage(messageId);
                    break;
            }
        });
    });
});

function copyMessage(messageId) {
    const msg = App.currentChat?.messages.find(m => m.id === messageId);
    if (!msg) return;
    
    navigator.clipboard.writeText(msg.content);
}

async function editMessage(messageId) {
    const msg = App.currentChat?.messages.find(m => m.id === messageId);
    if (!msg || msg.role !== 'user') return;
    
    const newContent = prompt('Edit message:', msg.content);
    if (newContent === null || newContent === msg.content) return;
    
    try {
        await fetch(`${App.apiBase}?action=edit_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: App.currentChat.id,
                message_id: messageId,
                content: newContent
            })
        });
        
        msg.content = newContent;
        msg.edited = true;
        renderMessages();
    } catch (error) {
        console.error('Failed to edit message:', error);
    }
}

async function regenerateResponse(messageId) {
    if (!App.currentChat) return;
    
    try {
        const response = await fetch(`${App.apiBase}?action=regenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: App.currentChat.id,
                message_id: messageId
            })
        });
        
        // Handle streaming response similar to sendMessage
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let assistantMessage = null;
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'chunk') {
                            if (!assistantMessage) {
                                assistantMessage = {
                                    id: 'msg_' + Date.now(),
                                    role: 'assistant',
                                    content: '',
                                    timestamp: Math.floor(Date.now() / 1000)
                                };
                                App.currentChat.messages.push(assistantMessage);
                            }
                            
                            assistantContent += data.content;
                            assistantMessage.content = assistantContent;
                            renderMessages();
                            scrollToBottom();
                        }
                        
                        if (data.type === 'done') break;
                    } catch (e) {}
                }
            }
        }
        
        await selectChat(App.currentChat.id);
    } catch (error) {
        console.error('Failed to regenerate:', error);
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Delete this message?')) return;
    
    try {
        await fetch(`${App.apiBase}?action=delete_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: App.currentChat.id,
                message_id: messageId
            })
        });
        
        App.currentChat.messages = App.currentChat.messages.filter(m => m.id !== messageId);
        renderMessages();
    } catch (error) {
        console.error('Failed to delete message:', error);
    }
}
