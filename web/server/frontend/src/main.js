import './style.css';
import './app.css';
import appIconUrl from './appicon.png';

let appElement;

const API_BASE = '/api';

const appState = {
    files: [],
    role: '', // 'admin' or 'user'
    settings: {
        baseURL: '',
        tenantName: '',
        authType: 'basic',
        username: '',
        password: '',
        token: '',
        userPassword: '',
        selectedCategory: null
    }
};

// ==================== API Wrappers ====================
const API = {
    async getStatus() {
        const resp = await fetch(`${API_BASE}/status`);
        return await resp.json();
    },
    async login(password) {
        const resp = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Login failed');
        }
        return await resp.json();
    },
    async logout() {
        await fetch(`${API_BASE}/logout`, { method: 'POST' });
        location.reload();
    },
    async getConfig() {
        const resp = await fetch(`${API_BASE}/config`);
        if (resp.status === 401 || resp.status === 403) throw new Error('Unauthorized');
        return await resp.json();
    },
    async saveConfig(data) {
        const resp = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await resp.json();
    },
    async setAuthCredentials(authType, username, password, token) {
        const resp = await fetch(`${API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authType, username, password, token })
        });
        return await resp.json();
    },
    async hasStoredCredentials() {
        const resp = await fetch(`${API_BASE}/auth/check`);
        const data = await resp.json();
        return data.hasStoredCredentials;
    },
    async getCategories(req) {
        const resp = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req)
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed to fetch categories');
        }
        return await resp.json();
    },
    shareFiles(files, password, expiryDays, customExpiry, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('password', password);
            formData.append('expiryDays', expiryDays);
            formData.append('customExpiry', customExpiry);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE}/share`, true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent, e.loaded, e.total);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    const err = JSON.parse(xhr.responseText || '{"error": "Unknown error"}');
                    reject(new Error(err.error || 'Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    },
    async getShareHistory() {
        const resp = await fetch(`${API_BASE}/history`);
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Failed to fetch history');
        }
        return await resp.json();
    }
};

// ==================== Initialization ====================
async function init() {
    appElement = document.getElementById('app');

    try {
        const status = await API.getStatus();
        appState.role = status.role;
        
        if (status.isFirstRun) {
            renderLogin(true);
        } else if (!status.isLoggedIn) {
            renderLogin(false);
        } else if (appState.role === 'admin' && !status.isConfigured) {
            openSettings();
        } else {
            renderMain();
        }
    } catch (err) {
        console.error('Initialization failed:', err);
        renderLogin(false);
    }
}

// ==================== Login Screen ====================
function renderLogin(isFirstRun) {
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon">
                        <img src="${appIconUrl}" alt="ThereforeSharer" class="app-icon-img">
                    </div>
                    <div class="app-title-text">
                        <h1>${isFirstRun ? 'Initial Setup' : 'Login'}</h1>
                        <p class="app-subtitle">${isFirstRun ? 'Create your admin password' : 'Enter portal password'}</p>
                    </div>
                </div>
            </header>
            <div class="settings-form">
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="input" id="loginPassword" placeholder="Enter password" autofocus>
                </div>
                <button class="btn btn-primary" id="loginBtn" style="width: 100%;">${isFirstRun ? 'Set Admin & Start' : 'Login'}</button>
            </div>
        </div>
    `;

    const handleLogin = async () => {
        const password = document.getElementById('loginPassword').value;
        if (!password) return;
        try {
            await API.login(password);
            location.reload();
        } catch (err) {
            alert(err.message);
        }
    };

    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('loginPassword').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
}

// ==================== Main Screen ====================
function renderMain() {
    const isAdmin = appState.role === 'admin';
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon"><img src="${appIconUrl}" alt="ThereforeSharer" class="app-icon-img"></div>
                    <div class="app-title-text">
                        <h1>ThereforeSharer</h1>
                        <p class="app-subtitle">${isAdmin ? 'Admin Portal' : 'User Portal'}</p>
                    </div>
                </div>
                <div class="header-buttons">
                    <button class="icon-btn" id="historyBtn" title="History"><i class="fas fa-history"></i></button>
                    ${isAdmin ? '<button class="icon-btn" id="settingsBtn" title="Settings"><i class="fas fa-gear"></i></button>' : ''}
                    <button class="icon-btn" id="logoutBtn" title="Logout"><i class="fas fa-sign-out-alt"></i></button>
                </div>
            </header>

            <div class="content-area">
                <div class="drop-zone" id="dropZone">
                    <i class="fas fa-cloud-upload-alt drop-icon"></i>
                    <p class="drop-text">Drop files here</p>
                    <p class="drop-subtext">or <span class="browse-btn" id="browseBtn">browse</span> to select</p>
                    <input type="file" id="fileInput" multiple style="display: none;">
                </div>

                <div class="file-badge-container">
                    <div class="file-badge" id="fileBadge" style="visibility: hidden;">
                        <i class="fas fa-file"></i>
                        <span id="fileBadgeText">0 files selected</span>
                        <span class="badge-count" id="badgeCount">0</span>
                    </div>
                </div>

                <div class="options-panel">
                    <div class="option-row">
                        <label><input type="checkbox" id="passwordCheck" disabled> Password:</label>
                        <input type="password" class="input" id="passwordInput" placeholder="Enter password" disabled style="flex: 1;">
                    </div>
                    <div class="option-row">
                        <label>Expiry:</label>
                        <select class="select" id="expirySelect" disabled style="flex: 1;">
                            <option value="never">Never</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="custom">Custom</option>
                        </select>
                        <input type="date" class="input" id="customDate" style="display: none;" disabled>
                    </div>
                </div>

                <button class="btn btn-primary share-btn" id="shareBtn" disabled>
                    <span><i class="fas fa-share-alt"></i> Share Files</span>
                </button>
            </div>

            <div class="file-drawer" id="fileDrawer">
                <div class="file-drawer-header"><h3>Selected Files</h3><button class="file-drawer-close" id="closeDrawer"><i class="fas fa-times"></i></button></div>
                <div class="file-drawer-content"><div id="filesContainer"></div></div>
                <div class="file-drawer-footer"><button class="btn btn-small btn-danger" id="clearFilesBtn" style="width: 100%;">Clear All</button></div>
            </div>
        </div>
    `;

    setupEventListeners();
    setupFileDrawer();
}

// ==================== Settings Screen ====================
async function openSettings() {
    let config = null;
    try {
        config = await API.getConfig();
    } catch (err) { alert(err.message); renderMain(); return; }
    
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <div class="app-title"><div class="app-title-text"><h1>Settings</h1><p class="app-subtitle">Admin Configuration</p></div></div>
                <button class="icon-btn back-btn" id="backBtn"><i class="fas fa-arrow-left"></i></button>
            </header>
            
            <div class="settings-form">
                <div class="form-group">
                    <label>Change Admin Password</label>
                    <input type="password" class="input" id="newAdminPassword" placeholder="Leave blank to keep current">
                </div>
                <div class="form-group">
                    <label>Public User Password</label>
                    <input type="password" class="input" id="userPassword" placeholder="Set password for team members" value="${config.user_password || ''}">
                </div>
                <hr style="margin: 20px 0; opacity: 0.2;">
                <div class="form-group"><label>Therefore Base URL</label><input type="text" class="input" id="baseURL" value="${config.base_url || ''}"></div>
                <div class="form-group"><label>Tenant Name</label><input type="text" class="input" id="tenantName" value="${config.tenant_name || ''}"></div>
                
                <div class="form-group">
                    <label>Therefore Credentials</label>
                    <div class="auth-tabs" style="margin-bottom: 10px;">
                        <button class="auth-tab ${config.auth_type === 'basic' ? 'active' : ''}" data-type="basic">Basic</button>
                        <button class="auth-tab ${config.auth_type === 'bearer' ? 'active' : ''}" data-type="bearer">Bearer</button>
                    </div>
                    <div id="basicAuthSection" style="${config.auth_type === 'basic' ? '' : 'display: none;'}">
                        <input type="text" class="input" id="username" placeholder="Username" style="margin-bottom: 5px;">
                        <input type="password" class="input" id="password" placeholder="Password">
                    </div>
                    <div id="bearerAuthSection" style="${config.auth_type === 'bearer' ? '' : 'display: none;'}">
                        <textarea class="input" id="token" placeholder="Bearer Token" rows="2"></textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label>Therefore Category</label>
                    <div class="category-row">
                        <select class="select" id="categorySelect" style="flex: 1;"><option value="${config.category_no || ''}">${config.category_name || 'Select...'}</option></select>
                        <button class="btn btn-secondary" id="loadCategoriesBtn">Load</button>
                    </div>
                </div>

                <button class="btn btn-primary" id="saveSettingsBtn" style="width: 100%;">Save All Settings</button>
            </div>
        </div>
    `;
    
    document.getElementById('backBtn').addEventListener('click', renderMain);
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('basicAuthSection').style.display = tab.dataset.type === 'basic' ? 'block' : 'none';
            document.getElementById('bearerAuthSection').style.display = tab.dataset.type === 'bearer' ? 'block' : 'none';
        });
    });

    document.getElementById('loadCategoriesBtn').addEventListener('click', async () => {
        const req = {
            baseURL: document.getElementById('baseURL').value,
            tenantName: document.getElementById('tenantName').value,
            authType: document.querySelector('.auth-tab.active').dataset.type,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            token: document.getElementById('token').value
        };
        try {
            const categories = await API.getCategories(req);
            const select = document.getElementById('categorySelect');
            select.innerHTML = categories.map(c => `<option value="${c.objNo}">${c.caption}</option>`).join('');
        } catch (err) { alert(err.message); }
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const authType = document.querySelector('.auth-tab.active').dataset.type;
        const catSelect = document.getElementById('categorySelect');
        const newAdminPwd = document.getElementById('newAdminPassword').value;

        const payload = {
            base_url: document.getElementById('baseURL').value,
            tenant_name: document.getElementById('tenantName').value,
            auth_type: authType,
            category_no: parseInt(catSelect.value) || 0,
            category_name: catSelect.options[catSelect.selectedIndex]?.text || '',
            user_password: document.getElementById('userPassword').value,
            is_set_up: true,
            default_archive: 'Archive'
        };

        if (newAdminPwd) {
            payload.new_admin_password = newAdminPwd;
        }

        try {
            await API.saveConfig(payload);
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const token = document.getElementById('token').value;
            if ((authType === 'basic' && username && password) || (authType === 'bearer' && token)) {
                await API.setAuthCredentials(authType, username, password, token);
            }
            alert('Settings Saved!');
            location.reload();
        } catch (err) { alert(err.message); }
    });
}

// ==================== History Screen ====================
async function renderHistory() {
    appElement.innerHTML = `<div class="main-container"><header class="app-header"><h1>History</h1><button class="icon-btn" id="backBtn"><i class="fas fa-arrow-left"></i></button></header><div class="history-list" id="historyList">Loading...</div></div>`;
    document.getElementById('backBtn').addEventListener('click', renderMain);
    const list = document.getElementById('historyList');
    try {
        const entries = await API.getShareHistory();
        list.innerHTML = entries.map(e => {
            const link = e.SharedLink || e;
            return `<div class="history-item"><div><strong>${link.Filename}</strong><br><small>${e.CategoryName || 'Doc #'+link.DocNo}</small></div><button class="btn btn-small" onclick="navigator.clipboard.writeText('${link.LinkUrl}'); alert('Copied!')"><i class="fas fa-copy"></i></button></div>`;
        }).join('');
    } catch (err) { list.innerHTML = `<p>${err.message}</p>`; }
}

// ==================== Shared Helpers ====================
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    document.getElementById('historyBtn').addEventListener('click', renderHistory);
    document.getElementById('logoutBtn').addEventListener('click', () => API.logout());
    if (document.getElementById('settingsBtn')) document.getElementById('settingsBtn').addEventListener('click', openSettings);
    
    document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

    document.getElementById('passwordCheck').addEventListener('change', (e) => document.getElementById('passwordInput').disabled = !e.target.checked);
    document.getElementById('expirySelect').addEventListener('change', (e) => {
        document.getElementById('customDate').style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
        document.getElementById('customDate').disabled = e.target.value !== 'custom';
    });
    document.getElementById('clearFilesBtn').addEventListener('click', () => { appState.files = []; updateFileList(); });
    document.getElementById('shareBtn').addEventListener('click', async () => {
        const password = document.getElementById('passwordCheck').checked ? document.getElementById('passwordInput').value : '';
        const expirySelect = document.getElementById('expirySelect');
        const expiryDays = expirySelect.value === 'custom' ? -1 : (expirySelect.value === 'never' ? 0 : parseInt(expirySelect.value));
        const customExpiry = expiryDays === -1 ? new Date(document.getElementById('customDate').value).toISOString() : '';
        
        const overlay = showUploadOverlay();
        try {
            const resp = await API.shareFiles(appState.files, password, expiryDays, customExpiry, (percent, loaded, total) => {
                updateUploadOverlay(percent, loaded, total);
            });
            overlay.remove();
            showShareDialog(resp.url);
        } catch (err) { 
            overlay.remove();
            alert(err.message); 
        }
    });
}

function handleFiles(list) { for (const f of list) { if (!appState.files.find(x => x.name === f.name)) appState.files.push(f); } updateFileList(); }

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function updateFileList() {
    const count = appState.files.length;
    const badge = document.getElementById('fileBadge');
    const badgeCount = document.getElementById('badgeCount');
    const badgeText = document.getElementById('fileBadgeText');
    const container = document.getElementById('filesContainer');
    const shareBtn = document.getElementById('shareBtn');

    if (count === 0) {
        if (badge) badge.style.visibility = 'hidden';
        if (shareBtn) shareBtn.disabled = true;
        ['passwordCheck', 'expirySelect'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = true;
        });
        return;
    }

    if (badge) badge.style.visibility = 'visible';
    if (badgeCount) badgeCount.textContent = count;
    if (badgeText) badgeText.textContent = `${count} file${count !== 1 ? 's' : ''} selected`;
    if (shareBtn) shareBtn.disabled = false;
    ['passwordCheck', 'expirySelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });

    if (container) {
        container.innerHTML = appState.files.map((f, i) => `
            <div class="file-item">
                <i class="fas fa-file"></i>
                <span class="file-name">${f.name}</span>
                <span class="file-size">${formatFileSize(f.size)}</span>
                <button class="file-remove" onclick="window.removeFile(${i})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }
}

window.removeFile = (i) => { appState.files.splice(i, 1); updateFileList(); };

function showUploadOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'upload-overlay';
    overlay.id = 'uploadOverlay';
    overlay.innerHTML = `
        <div class="upload-progress-card">
            <h3 class="upload-progress-title">Uploading Files</h3>
            <p class="upload-progress-subtitle">Transferring to Therefore™</p>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="uploadProgressFill" style="width: 0%;"></div>
            </div>
            <div class="upload-progress-text" id="uploadProgressText">0% • 0 B / 0 B</div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function updateUploadOverlay(percent, loaded, total) {
    const fill = document.getElementById('uploadProgressFill');
    const text = document.getElementById('uploadProgressText');
    const subtitle = document.querySelector('.upload-progress-subtitle');
    
    if (fill) fill.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}% • ${formatFileSize(loaded)} / ${formatFileSize(total)}`;
    if (subtitle && percent === 100) subtitle.textContent = 'Processing at Therefore™...';
}

function showShareDialog(url) {
    const dialog = document.createElement('div');
    dialog.className = 'share-dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <div style="color: var(--accent-primary); font-size: 48px; margin-bottom: 16px;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Files Shared Successfully!</h3>
            <p>Your shareable link is ready:</p>
            <div class="url-box">
                <input type="text" id="shareUrl" value="${url}" readonly>
                <button class="btn btn-secondary" id="copyUrlBtn" style="padding: 0 15px; min-width: 80px;">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="location.reload()">
                Done
            </button>
        </div>
    `;
    document.body.appendChild(dialog);

    const copyBtn = document.getElementById('copyUrlBtn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url);
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => copyBtn.innerHTML = originalHtml, 2000);
    });
}

function setupFileDrawer() {
    const badge = document.getElementById('fileBadge');
    const drawer = document.getElementById('fileDrawer');
    badge?.addEventListener('click', () => drawer.classList.toggle('open'));
    document.getElementById('closeDrawer')?.addEventListener('click', () => drawer.classList.remove('open'));
}
init();
