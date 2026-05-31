/**
 * Admin Panel JavaScript
 */

const AdminApp = {
    apiBase: '/api/admin.php',
    currentPage: 'dashboard'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    
    // Modal Close
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
    
    // Provider Management
    document.getElementById('addProviderBtn').addEventListener('click', showAddProviderModal);
    document.getElementById('saveProviderBtn').addEventListener('click', saveProvider);
    document.getElementById('testProviderBtn').addEventListener('click', testProvider);
    
    // Prompts Form
    document.getElementById('promptsForm').addEventListener('submit', savePrompts);
    
    // Backups
    document.getElementById('createBackupBtn').addEventListener('click', createBackup);
    
    // Logs
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    
    // Search inputs
    document.getElementById('memorySearchInput')?.addEventListener('input', filterMemories);
    document.getElementById('chatSearchInput')?.addEventListener('input', filterChats);
}

// Authentication
async function checkAuth() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=check_auth`);
        const data = await response.json();
        
        if (data.authenticated) {
            showAdminPanel(data.username);
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAdminPanel(username);
        } else {
            document.getElementById('loginError').textContent = data.error || 'Invalid credentials';
            document.getElementById('loginError').classList.remove('hidden');
        }
    } catch (error) {
        document.getElementById('loginError').textContent = 'Login failed. Please try again.';
        document.getElementById('loginError').classList.remove('hidden');
    }
}

async function handleLogout() {
    try {
        await fetch(`${AdminApp.apiBase}?action=logout`);
        location.reload();
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

function showAdminPanel(username) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    document.getElementById('adminUsername').textContent = username;
    
    loadDashboard();
}

// Navigation
function navigateTo(page) {
    AdminApp.currentPage = page;
    
    // Update nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        providers: 'API Providers',
        prompts: 'Prompts & Settings',
        memories: 'Memory Management',
        chats: 'Conversation Management',
        backups: 'Backups',
        logs: 'System Logs'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    
    // Show page
    document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    
    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'providers':
            loadProviders();
            break;
        case 'prompts':
            loadPrompts();
            break;
        case 'memories':
            loadMemories();
            break;
        case 'chats':
            loadChats();
            break;
        case 'backups':
            loadBackups();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=dashboard`);
        const data = await response.json();
        
        // Stats
        document.getElementById('totalChats').textContent = data.stats?.total_chats || 0;
        document.getElementById('totalMessages').textContent = data.stats?.total_messages || 0;
        document.getElementById('totalMemories').textContent = data.stats?.total_memories || 0;
        document.getElementById('storageUsage').textContent = data.stats?.storage_usage_formatted || '0 B';
        
        // Recent chats
        const recentChatsEl = document.getElementById('recentChats');
        if (data.recent_chats && data.recent_chats.length > 0) {
            recentChatsEl.innerHTML = data.recent_chats.map(chat => `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-title">${escapeHtml(chat.title)}</div>
                        <div class="list-item-subtitle">${new Date(chat.updated_at * 1000).toLocaleString()}</div>
                    </div>
                </div>
            `).join('');
        } else {
            recentChatsEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No chats yet</p>';
        }
        
        // Active providers
        const providersEl = document.getElementById('activeProviders');
        if (data.providers && data.providers.length > 0) {
            providersEl.innerHTML = data.providers.map(p => `
                <div class="list-item">
                    <div class="list-item-info">
                        <div class="list-item-title">${escapeHtml(p.name)}</div>
                        <div class="list-item-subtitle">${escapeHtml(p.base_url)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            providersEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No active providers</p>';
        }
        
        // AI Config summary
        const configEl = document.getElementById('aiConfigSummary');
        if (data.ai_config) {
            configEl.innerHTML = `
                <div class="config-item">
                    <span class="config-label">AI Name</span>
                    <span class="config-value">${escapeHtml(data.ai_config.name || 'Luna')}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Personality</span>
                    <span class="config-value">${escapeHtml(data.ai_config.personality || 'caring')}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Tone</span>
                    <span class="config-value">${escapeHtml(data.ai_config.tone || 'warm')}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// Providers
async function loadProviders() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=get_providers`);
        const data = await response.json();
        
        const container = document.getElementById('providersList');
        
        if (!data.providers || data.providers.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No providers configured</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>URL</th>
                        <th>Models</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.providers.map(p => `
                        <tr>
                            <td>${escapeHtml(p.name)}</td>
                            <td><code>${escapeHtml(p.base_url)}</code></td>
                            <td>${(p.models || []).length} models</td>
                            <td>
                                <label class="switch">
                                    <input type="checkbox" 
                                           onchange="toggleProvider('${p.id}', this.checked)" 
                                           ${p.enabled ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </td>
                            <td>
                                <button class="btn-icon" onclick="editProvider('${p.id}')" title="Edit">✏️</button>
                                <button class="btn-icon" onclick="deleteProvider('${p.id}')" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load providers:', error);
    }
}

function showAddProviderModal() {
    document.getElementById('providerForm').reset();
    document.getElementById('providerId').value = '';
    document.getElementById('providerModalTitle').textContent = 'Add Provider';
    document.getElementById('providerModal').classList.remove('hidden');
}

function editProvider(id) {
    // Implementation would load provider data into modal
    alert('Edit provider functionality - would load provider data');
}

async function saveProvider() {
    const provider = {
        id: document.getElementById('providerIdInput').value,
        name: document.getElementById('providerNameInput').value,
        base_url: document.getElementById('providerUrlInput').value,
        api_key: document.getElementById('providerApiKeyInput').value,
        models: document.getElementById('providerModelsInput').value.split(',').map(m => m.trim()).filter(m => m),
        enabled: document.getElementById('providerEnabledInput').checked
    };
    
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=save_provider`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(provider)
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('providerModal').classList.add('hidden');
            loadProviders();
        }
    } catch (error) {
        console.error('Failed to save provider:', error);
    }
}

async function toggleProvider(id, enabled) {
    try {
        await fetch(`${AdminApp.apiBase}?action=toggle_provider`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, enabled })
        });
        loadProviders();
    } catch (error) {
        console.error('Failed to toggle provider:', error);
    }
}

async function deleteProvider(id) {
    if (!confirm('Delete this provider?')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=delete_provider`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadProviders();
    } catch (error) {
        console.error('Failed to delete provider:', error);
    }
}

async function testProvider() {
    const id = document.getElementById('providerIdInput').value;
    if (!id) {
        alert('Please enter a provider ID first');
        return;
    }
    
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=test_provider`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Connection successful!');
        } else {
            alert(`Connection failed: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert('Test failed: ' + error.message);
    }
}

// Prompts
async function loadPrompts() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=get_settings`);
        const data = await response.json();
        const settings = data.settings || {};
        
        document.getElementById('masterPrompt').value = settings.master_prompt || '';
        document.getElementById('systemPrompt').value = settings.system_prompt || '';
        document.getElementById('memoryPrompt').value = settings.memory_prompt || '';
        document.getElementById('temperature').value = settings.temperature || 0.7;
        document.getElementById('maxTokens').value = settings.max_tokens || 2048;
        document.getElementById('contextLength').value = settings.context_length || 4096;
    } catch (error) {
        console.error('Failed to load prompts:', error);
    }
}

async function savePrompts(e) {
    e.preventDefault();
    
    const settings = {
        master_prompt: document.getElementById('masterPrompt').value,
        system_prompt: document.getElementById('systemPrompt').value,
        memory_prompt: document.getElementById('memoryPrompt').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        max_tokens: parseInt(document.getElementById('maxTokens').value),
        context_length: parseInt(document.getElementById('contextLength').value)
    };
    
    try {
        await fetch(`${AdminApp.apiBase}?action=save_settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Failed to save prompts:', error);
    }
}

// Memories
async function loadMemories() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=get_all_memories`);
        const data = await response.json();
        
        const container = document.getElementById('memoriesTable');
        
        if (!data.memories || data.memories.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No memories found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Content</th>
                        <th>Type</th>
                        <th>Importance</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.memories.map(m => `
                        <tr>
                            <td>${escapeHtml(m.content.substring(0, 100))}${m.content.length > 100 ? '...' : ''}</td>
                            <td>${m.type}</td>
                            <td>${(m.importance * 100).toFixed(0)}%</td>
                            <td>${new Date(m.created_at * 1000).toLocaleDateString()}</td>
                            <td>
                                <button class="btn-icon" onclick="deleteMemory('${m.id}')" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load memories:', error);
    }
}

function filterMemories() {
    // Implementation for filtering memories table
}

async function deleteMemory(id) {
    if (!confirm('Delete this memory?')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=delete_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadMemories();
    } catch (error) {
        console.error('Failed to delete memory:', error);
    }
}

// Chats
async function loadChats() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=get_all_chats`);
        const data = await response.json();
        
        const container = document.getElementById('chatsTable');
        
        if (!data.chats || data.chats.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No chats found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Messages</th>
                        <th>Updated</th>
                        <th>Pinned</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.chats.map(c => `
                        <tr>
                            <td>${escapeHtml(c.title)}</td>
                            <td>-</td>
                            <td>${new Date(c.updated_at * 1000).toLocaleString()}</td>
                            <td>${c.pinned ? '📌' : '-'}</td>
                            <td>
                                <button class="btn-icon" onclick="deleteChat('${c.id}')" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load chats:', error);
    }
}

function filterChats() {
    // Implementation for filtering chats table
}

async function deleteChat(id) {
    if (!confirm('Delete this chat?')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=delete_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadChats();
    } catch (error) {
        console.error('Failed to delete chat:', error);
    }
}

// Backups
async function loadBackups() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=list_backups`);
        const data = await response.json();
        
        const container = document.getElementById('backupsTable');
        
        if (!data.backups || data.backups.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No backups found</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Chats</th>
                        <th>Memories</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.backups.map(b => `
                        <tr>
                            <td>${escapeHtml(b.name)}</td>
                            <td>${new Date(b.timestamp * 1000).toLocaleString()}</td>
                            <td>${b.chat_count || 0}</td>
                            <td>${b.memory_count || 0}</td>
                            <td>
                                <button class="btn-icon" onclick="restoreBackup('${b.name}')" title="Restore">↩️</button>
                                <button class="btn-icon" onclick="deleteBackup('${b.name}')" title="Delete">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Failed to load backups:', error);
    }
}

async function createBackup() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=create_backup`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Backup created successfully!');
            loadBackups();
        }
    } catch (error) {
        console.error('Failed to create backup:', error);
    }
}

async function restoreBackup(name) {
    if (!confirm('Restore from this backup? This will overwrite current data.')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=restore_backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backup_name: name })
        });
        alert('Backup restored successfully!');
    } catch (error) {
        console.error('Failed to restore backup:', error);
    }
}

async function deleteBackup(name) {
    if (!confirm('Delete this backup?')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=delete_backup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backup_name: name })
        });
        loadBackups();
    } catch (error) {
        console.error('Failed to delete backup:', error);
    }
}

// Logs
async function loadLogs() {
    try {
        const response = await fetch(`${AdminApp.apiBase}?action=get_logs`);
        const data = await response.json();
        
        const container = document.getElementById('logsContainer');
        
        if (!data.logs || data.logs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No logs found</p>';
            return;
        }
        
        container.innerHTML = data.logs.map(log => `
            <div class="log-entry">
                <span class="log-time">${log.timestamp}</span>
                <span class="log-type ${log.type}">${log.type}</span>
                ${escapeHtml(log.message)}
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

async function clearLogs() {
    if (!confirm('Clear all logs?')) return;
    
    try {
        await fetch(`${AdminApp.apiBase}?action=clear_logs`, {
            method: 'POST'
        });
        loadLogs();
    } catch (error) {
        console.error('Failed to clear logs:', error);
    }
}

// Utility
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
