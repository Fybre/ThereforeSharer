import './style.css';
import './app.css';
import * as App from '../wailsjs/go/main/App.js';
import * as runtime from '../wailsjs/runtime/runtime.js';

let appElement;

const appState = {
    files: [],
    settings: {
        baseURL: '',
        tenantName: '',
        authType: 'basic',
        username: '',
        password: '',
        token: '',
        selectedCategory: null
    }
};

// ==================== Initialization ====================
async function init() {
    appElement = document.getElementById('app');

    // Check if app is configured - show settings on first run
    try {
        const config = await App.GetConfig();
        if (!config || !config.is_set_up) {
            openSettings();
        } else {
            renderMain();
        }
    } catch (err) {
        // Config doesn't exist yet - show settings
        openSettings();
    }

    // Listen for files dropped on the app window
    runtime.EventsOn('files-dropped', handleDroppedFiles);

    // Listen for upload progress events
    runtime.EventsOn('upload-progress', handleUploadProgress);
}

// ==================== Main Screen ====================
function renderMain() {
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <h1>ThereforeSharer</h1>
                <div class="header-buttons">
                    <button class="icon-btn history-btn" id="historyBtn" title="Share History"><i class="fas fa-history"></i></button>
                    <button class="icon-btn settings-btn" id="settingsBtn" title="Settings"><i class="fas fa-gear"></i></button>
                </div>
            </header>

            <div class="content-area">
                <div class="drop-zone" id="dropZone">
                    <i class="fas fa-cloud-upload-alt drop-icon"></i>
                    <p class="drop-text">Drop files here</p>
                    <p class="drop-subtext">or <span class="browse-btn" id="browseBtn">browse</span> to select</p>
                </div>

                <div class="file-badge-container">
                    <div class="file-badge" id="fileBadge" style="visibility: hidden;">
                        <i class="fas fa-file"></i>
                        <span id="fileBadgeText">0 files selected</span>
                        <span class="badge-count" id="badgeCount">0</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                <div class="options-panel" id="optionsPanel">
                    <div class="option-row">
                        <label style="min-width: 80px;">
                            <input type="checkbox" id="passwordCheck" disabled>
                            Password:
                        </label>
                        <input type="password" class="input" id="passwordInput" placeholder="Enter password" style="flex: 1;" disabled>
                    </div>
                    <div class="option-row">
                        <label style="min-width: 80px;">Expiry:</label>
                        <select class="select" id="expirySelect" style="flex: 1;" disabled>
                            <option value="never">Never</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="custom">Custom date</option>
                        </select>
                        <input type="date" class="input" id="customDate" style="display: none;" disabled>
                    </div>
                </div>

                <button class="btn btn-primary share-btn" id="shareBtn" disabled>
                    <div class="btn-content">
                        <span><i class="fas fa-share-alt"></i> Share Files</span>
                    </div>
                </button>
            </div>

            <div class="file-drawer" id="fileDrawer">
                <div class="file-drawer-header">
                    <h3>Selected Files</h3>
                    <button class="file-drawer-close" id="closeDrawer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="file-drawer-content">
                    <div id="filesContainer"></div>
                </div>
                <div class="file-drawer-footer">
                    <button class="btn btn-small btn-danger" id="clearFilesBtn" style="width: 100%;">
                        <i class="fas fa-trash"></i> Clear All Files
                    </button>
                </div>
            </div>

            <div class="toast-container" id="toastContainer"></div>
        </div>
    `;

    setupEventListeners();
    setupFileDrawer();
}

// ==================== Settings Screen ====================
async function openSettings() {
    // Load current settings
    let hasStoredAuth = false;
    let categoryName = '';
    try {
        const config = await App.GetConfig();
        if (config) {
            appState.settings.baseURL = config.base_url || '';
            appState.settings.tenantName = config.tenant_name || '';
            appState.settings.authType = config.auth_type || 'basic';
            appState.settings.selectedCategory = config.category_no || null;
            categoryName = config.category_name || '';
            appState.settings.defaultArchive = config.default_archive || 'Archive';

            // If we have a category number but no name, try to fetch it
            if (appState.settings.selectedCategory && !categoryName && config.base_url && config.tenant_name) {
                try {
                    const req = {
                        baseURL: config.base_url,
                        tenantName: config.tenant_name,
                        authType: config.auth_type,
                        username: '',
                        password: '',
                        token: ''
                    };
                    const categories = await App.GetCategories(req);
                    const foundCategory = categories.find(cat => cat.objNo === appState.settings.selectedCategory);
                    if (foundCategory) {
                        categoryName = foundCategory.caption;
                        // Update the config to save the name for next time
                        await App.SaveConfig({
                            ...config,
                            category_name: categoryName
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch category name:', err);
                    // If we can't fetch it, just show the number
                    categoryName = `Category #${appState.settings.selectedCategory}`;
                }
            }
        }

        // Check if auth credentials are stored
        hasStoredAuth = await App.HasStoredCredentials();
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
    
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <h1>Settings</h1>
                <button class="icon-btn back-btn" id="backBtn" title="Back"><i class="fas fa-arrow-left"></i></button>
            </header>
            
            <div class="settings-form">
                <div class="form-group">
                    <label>Base URL</label>
                    <input type="text" class="input" id="baseURL" placeholder="https://your-server.com" value="${appState.settings.baseURL || ''}" autocapitalize="off" autocorrect="off" spellcheck="false">
                </div>

                <div class="form-group">
                    <label>Tenant Name</label>
                    <input type="text" class="input" id="tenantName" placeholder="YourTenant" value="${appState.settings.tenantName || ''}" autocapitalize="off" autocorrect="off" spellcheck="false">
                </div>
                
                <div class="form-group">
                    <label>Authentication Type</label>
                    <div class="auth-tabs">
                        <button class="auth-tab ${appState.settings.authType === 'basic' ? 'active' : ''}" data-type="basic">Basic</button>
                        <button class="auth-tab ${appState.settings.authType === 'bearer' ? 'active' : ''}" data-type="bearer">Bearer Token</button>
                    </div>
                </div>

                ${hasStoredAuth ? `
                <div class="info-box">
                    <i class="fas fa-check-circle"></i>
                    <span>Authentication credentials are already configured. Leave fields blank to keep existing credentials, or enter new ones to update.</span>
                </div>
                ` : ''}

                <div id="basicAuthSection" class="auth-section" style="${appState.settings.authType === 'basic' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="input" id="username" placeholder="${hasStoredAuth ? 'Leave blank to keep existing' : 'Username'}" value="${appState.settings.username || ''}" autocapitalize="off" autocorrect="off" spellcheck="false">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" class="input" id="password" placeholder="${hasStoredAuth ? 'Leave blank to keep existing' : 'Password'}">
                    </div>
                </div>

                <div id="bearerAuthSection" class="auth-section" style="${appState.settings.authType === 'bearer' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label>Token</label>
                        <textarea class="input" id="token" placeholder="${hasStoredAuth ? 'Leave blank to keep existing' : 'Paste your bearer token here'}" rows="4">${appState.settings.token || ''}</textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label>Default Category</label>
                    <div class="category-row">
                        <select class="select" id="categorySelect" style="flex: 1;">
                            ${appState.settings.selectedCategory && categoryName ?
                                `<option value="${appState.settings.selectedCategory}" selected>${categoryName}</option>` :
                                `<option value="">Select a category...</option>`
                            }
                        </select>
                        <button class="btn btn-secondary" id="loadCategoriesBtn" style="margin-left: 8px;">
                            <i class="fas fa-sync"></i> Load Categories
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Default Archive Name</label>
                    <input type="text" class="input" id="defaultArchive" placeholder="Archive" value="${appState.settings.defaultArchive || 'Archive'}" autocapitalize="off" autocorrect="off" spellcheck="false">
                    <small style="color: var(--text-muted); font-size: 12px; margin-top: 4px; display: block;">Used for multiple files. Timestamp will be appended (e.g., Archive-260207-1430.zip)</small>
                </div>

                <button class="btn btn-primary" id="saveSettingsBtn" style="width: 100%;">Save Settings</button>
            </div>
            
            <div class="toast-container" id="toastContainer"></div>
        </div>
    `;
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', renderMain);

    // Auth type tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.dataset.type;
            document.getElementById('basicAuthSection').style.display = type === 'basic' ? 'block' : 'none';
            document.getElementById('bearerAuthSection').style.display = type === 'bearer' ? 'block' : 'none';
            appState.settings.authType = type;
        });
    });

    // Load categories button
    document.getElementById('loadCategoriesBtn').addEventListener('click', async () => {
        await loadCategories();
    });

    // Save settings button
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const baseURL = document.getElementById('baseURL').value.trim();
        const tenantName = document.getElementById('tenantName').value.trim();
        const authType = appState.settings.authType;
        const username = document.getElementById('username')?.value.trim() || '';
        const password = document.getElementById('password')?.value || '';
        const token = document.getElementById('token')?.value.trim() || '';
        const categorySelect = document.getElementById('categorySelect');
        const categoryNo = parseInt(categorySelect.value) || 0;
        const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || '';
        const defaultArchive = document.getElementById('defaultArchive')?.value.trim() || 'Archive';

        if (!baseURL || !tenantName) {
            showToast('Please enter Base URL and Tenant Name', 'error');
            return;
        }

        if (categoryNo === 0) {
            showToast('Please select a category', 'error');
            return;
        }

        // Check if credentials are provided
        const hasCredentials = (authType === 'basic' && username && password) || (authType === 'bearer' && token);
        const hasStoredCredentials = await App.HasStoredCredentials();

        if (!hasCredentials && !hasStoredCredentials) {
            showToast('Please provide authentication credentials', 'error');
            return;
        }

        try {
            // Save config
            const config = {
                base_url: baseURL,
                tenant_name: tenantName,
                category_no: categoryNo,
                category_name: categoryName,
                auth_type: authType,
                is_set_up: true,
                default_archive: defaultArchive
            };
            await App.SaveConfig(config);

            // Only save auth credentials if new ones were provided
            if (hasCredentials) {
                await App.SetAuthCredentials(authType, username, password, token);
            }

            // Update local state
            appState.settings.baseURL = baseURL;
            appState.settings.tenantName = tenantName;
            appState.settings.authType = authType;
            appState.settings.selectedCategory = categoryNo;

            showToast('Settings saved successfully!');
        } catch (err) {
            showToast('Failed to save settings: ' + (err?.message || 'Unknown error'), 'error');
        }
    });
}

async function loadCategories() {
    try {
        const baseURL = document.getElementById('baseURL').value.trim();
        const tenantName = document.getElementById('tenantName').value.trim();

        if (!baseURL || !tenantName) {
            showToast('Please enter Base URL and Tenant Name', 'error');
            return;
        }

        const req = {
            baseURL: baseURL,
            tenantName: tenantName,
            authType: appState.settings.authType,
            username: document.getElementById('username')?.value.trim() || '',
            password: document.getElementById('password')?.value || '',
            token: document.getElementById('token')?.value.trim() || ''
        };

        const categories = await App.GetCategories(req);
        const select = document.getElementById('categorySelect');

        // Clear all existing options
        select.innerHTML = '';

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select a category...';
        select.appendChild(placeholderOption);

        // Add all categories
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.objNo;
            option.textContent = cat.caption;
            if (cat.objNo === appState.settings.selectedCategory) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        showToast('Categories loaded successfully!');
    } catch (err) {
        console.error('Failed to load categories:', err);
        showToast('Failed to load categories: ' + (err?.message || 'Unknown error'), 'error');
    }
}

// ==================== Share Dialog ====================
function showShareDialog(url) {
    const dialog = document.createElement('div');
    dialog.className = 'share-dialog';
    dialog.innerHTML = `
        <div class="dialog-content">
            <h3><i class="fas fa-check-circle"></i> Files Shared Successfully!</h3>
            <p>Your files have been uploaded and a shareable link has been created:</p>
            <div class="url-box">
                <input type="text" id="shareUrl" value="${url}" readonly>
                <button class="btn btn-small" id="copyUrlBtn"><i class="fas fa-copy"></i> Copy</button>
            </div>
            <button class="btn btn-primary" id="closeDialogBtn">Close</button>
        </div>
    `;
    
    document.body.appendChild(dialog);

    // Auto-copy URL to clipboard
    App.CopyToClipboard(url).then(() => {
        showToast('URL copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
    });

    // Copy URL button
    dialog.querySelector('#copyUrlBtn').addEventListener('click', () => {
        App.CopyToClipboard(url).then(() => {
            showToast('URL copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
        });
    });

    // Close button
    dialog.querySelector('#closeDialogBtn').addEventListener('click', () => {
        dialog.remove();
        appState.files = [];
        renderMain();
    });

    // Click outside to close
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
            appState.files = [];
            renderMain();
        }
    });
}

// ==================== History Screen ====================
async function renderHistory() {
    appElement.innerHTML = `
        <div class="main-container">
            <header class="app-header">
                <h1>Share History</h1>
                <div class="header-buttons">
                    <button class="icon-btn back-btn" id="backBtn" title="Back"><i class="fas fa-arrow-left"></i></button>
                    <button class="icon-btn settings-btn" id="settingsBtn" title="Settings"><i class="fas fa-gear"></i></button>
                </div>
            </header>
            
            <div class="history-list" id="historyList">
                <div class="loading">Loading...</div>
            </div>
            
            <div class="toast-container" id="toastContainer"></div>
        </div>
    `;
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', renderMain);
    
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    
    // Load history
    await loadShareHistory();
}

async function loadShareHistory() {
    const historyList = document.getElementById('historyList');

    try {
        const entries = await App.GetShareHistory();
        
        if (entries.length === 0) {
            historyList.innerHTML = `
                <div class="empty-history">
                    <p>No shared links yet.</p>
                    <p>Share some files to see them here!</p>
                </div>
            `;
            return;
        }
        
        const historyHtml = entries.map((entry, index) => {
            const createdDate = new Date(entry.createdAt).toLocaleDateString();
            const hasExpiry = entry.expiresAt && entry.expiresAt !== '';
            const expiryText = hasExpiry ? `Expires: ${new Date(entry.expiresAt).toLocaleDateString()}` : 'No expiry';
            const passwordIcon = entry.hasPassword ? '<i class="fas fa-lock"></i> ' : '';
            const categoryName = entry.categoryName || '';
            const categoryDisplay = categoryName ? `<i class="fas fa-folder"></i> ${categoryName} • ` : '';

            return `
                <div class="history-item" data-index="${index}">
                    <div class="history-item-info">
                        <div class="history-item-filename">${passwordIcon}${entry.filename || 'Unnamed'}</div>
                        <div class="history-item-meta">${categoryDisplay}${createdDate} • ${expiryText}</div>
                    </div>
                    <div class="history-item-actions">
                        <button class="menu-btn" data-index="${index}" title="Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="action-menu" id="menu-${index}" style="display: none;">
                            <button class="menu-item copy-action" data-url="${entry.url}">
                                <i class="fas fa-copy"></i> Copy Link
                            </button>
                            <button class="menu-item revoke-action" data-linkid="${entry.linkId}">
                                <i class="fas fa-ban"></i> Revoke Link
                            </button>
                            <button class="menu-item delete-action" data-docno="${entry.docNo}">
                                <i class="fas fa-trash"></i> Delete Document
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        historyList.innerHTML = historyHtml;

        // Menu button handlers
        const menuBtns = historyList.querySelectorAll('.menu-btn');
        menuBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const index = btn.dataset.index;
                const menu = document.getElementById(`menu-${index}`);
                const actionsContainer = btn.parentElement;

                // Close all other menus and remove active class
                document.querySelectorAll('.action-menu').forEach(m => {
                    if (m !== menu) {
                        m.style.display = 'none';
                        m.parentElement.classList.remove('menu-active');
                    }
                });

                // Toggle this menu and active class
                const isOpen = menu.style.display !== 'none';
                menu.style.display = isOpen ? 'none' : 'block';

                if (isOpen) {
                    actionsContainer.classList.remove('menu-active');
                } else {
                    actionsContainer.classList.add('menu-active');
                }
            });
        });

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.history-item-actions')) {
                document.querySelectorAll('.action-menu').forEach(m => {
                    m.style.display = 'none';
                    m.parentElement.classList.remove('menu-active');
                });
            }
        });

        // Copy handlers
        historyList.querySelectorAll('.copy-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = btn.dataset.url;
                App.CopyToClipboard(url).then(() => {
                    showToast('Link copied to clipboard!');
                    document.querySelectorAll('.action-menu').forEach(m => {
                        m.style.display = 'none';
                        m.parentElement.classList.remove('menu-active');
                    });
                }).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                    showToast('Failed to copy', 'error');
                });
            });
        });

        // Revoke handlers
        historyList.querySelectorAll('.revoke-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const linkId = btn.dataset.linkid;
                document.querySelectorAll('.action-menu').forEach(m => {
                    m.style.display = 'none';
                    m.parentElement.classList.remove('menu-active');
                });

                showConfirmDialog(
                    'Are you sure you want to revoke this shared link? Users will no longer be able to access it.',
                    () => {
                        App.RevokeSharedLink(linkId).then(() => {
                            showToast('Link revoked successfully!');
                            loadShareHistory();
                        }).catch(err => {
                            console.error('Failed to revoke link:', err);
                            showToast('Failed to revoke link: ' + (err?.message || 'Unknown error'), 'error');
                        });
                    }
                );
            });
        });

        // Delete handlers
        historyList.querySelectorAll('.delete-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const docNo = parseInt(btn.dataset.docno);
                document.querySelectorAll('.action-menu').forEach(m => {
                    m.style.display = 'none';
                    m.parentElement.classList.remove('menu-active');
                });

                showConfirmDialog(
                    'Are you sure you want to delete this document? This action cannot be undone and will also revoke the shared link.',
                    () => {
                        App.DeleteDocument(docNo).then(() => {
                            showToast('Document deleted successfully!');
                            loadShareHistory();
                        }).catch(err => {
                            console.error('Failed to delete document:', err);
                            showToast('Failed to delete document: ' + (err?.message || 'Unknown error'), 'error');
                        });
                    }
                );
            });
        });
        
    } catch (err) {
        console.error('Failed to load history:', err);
        historyList.innerHTML = `
            <div class="error-history">
                <p>Failed to load history.</p>
                <p>${err?.message || 'Unknown error'}</p>
            </div>
        `;
    }
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const browseBtn = document.getElementById('browseBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const shareBtn = document.getElementById('shareBtn');
    const expirySelect = document.getElementById('expirySelect');
    const customDate = document.getElementById('customDate');
    
    // Settings button
    settingsBtn.addEventListener('click', openSettings);
    
    // History button
    document.getElementById('historyBtn').addEventListener('click', () => {
        renderHistory();
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        // Wails will emit files-dropped event, not use dataTransfer
    });
    
    // Browse button
    browseBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            const path = await App.OpenFileDialog();
            if (path && path !== '') {
                handleDroppedFiles([path]);
            }
        } catch (err) {
            console.error('Failed to open file dialog:', err);
        }
    });

    // Also make the entire drop zone clickable
    dropZone.addEventListener('click', async () => {
        try {
            const path = await App.OpenFileDialog();
            if (path && path !== '') {
                handleDroppedFiles([path]);
            }
        } catch (err) {
            console.error('Failed to open file dialog:', err);
        }
    });
    
    // Password checkbox
    const passwordInput = document.getElementById('passwordInput');
    document.getElementById('passwordCheck').addEventListener('change', (e) => {
        passwordInput.disabled = !e.target.checked;
        if (!e.target.checked) {
            passwordInput.value = '';
        }
    });

    // Expiry select
    expirySelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDate.style.display = 'inline-block';
            customDate.disabled = false;
        } else {
            customDate.style.display = 'none';
            customDate.disabled = true;
        }
    });
    
    // Clear files button
    document.getElementById('clearFilesBtn').addEventListener('click', () => {
        appState.files = [];
        updateFileList();
        // Close drawer if open
        const fileDrawer = document.getElementById('fileDrawer');
        if (fileDrawer) fileDrawer.classList.remove('open');
    });
    
    // Share button
    shareBtn.addEventListener('click', async () => {
        if (appState.files.length === 0) return;

        const hasPassword = document.getElementById('passwordCheck').checked;
        const password = hasPassword ? document.getElementById('passwordInput').value : '';

        let expiryDays = 0;
        let customExpiry = '';
        const expiryValue = expirySelect.value;
        if (expiryValue === 'custom') {
            customExpiry = new Date(customDate.value).toISOString();
        } else if (expiryValue !== 'never') {
            expiryDays = parseInt(expiryValue);
        }

        // Disable UI during upload
        shareBtn.disabled = true;
        const contentArea = document.querySelector('.content-area');
        const optionsPanel = document.getElementById('optionsPanel');
        const headerButtons = document.querySelectorAll('.icon-btn');

        if (contentArea) contentArea.classList.add('disabled');
        if (optionsPanel) optionsPanel.style.pointerEvents = 'none';
        headerButtons.forEach(btn => btn.disabled = true);

        // Show progress in button with cancel option
        shareBtn.innerHTML = `
            <div class="btn-progress-bg" style="width: 0%;"></div>
            <div class="btn-content">
                <span><i class="fas fa-spinner fa-spin"></i> Preparing... 0%</span>
                <button class="btn-cancel" onclick="cancelUpload(event)">Cancel</button>
            </div>
        `;

        try {
            // Build request object matching backend ShareRequest struct
            const shareRequest = {
                files: appState.files.map(f => f.path),
                password: password,
                expiryDays: expiryDays,
                customExpiry: customExpiry
            };

            const response = await App.ShareFiles(shareRequest);

            // Upload complete
            shareBtn.innerHTML = `
                <div class="btn-progress-bg" style="width: 100%;"></div>
                <div class="btn-content">
                    <span><i class="fas fa-check"></i> Upload Complete!</span>
                </div>
            `;

            // Reset button and UI after a short delay
            setTimeout(() => {
                shareBtn.innerHTML = '<div class="btn-content"><span><i class="fas fa-share-alt"></i> Share Files</span></div>';
                shareBtn.disabled = false;
                if (contentArea) contentArea.classList.remove('disabled');
                if (optionsPanel) optionsPanel.style.pointerEvents = '';
                headerButtons.forEach(btn => btn.disabled = false);
            }, 1500);

            showShareDialog(response.url);
        } catch (err) {
            console.error('Failed to share files:', err);

            // Extract error message from various possible formats
            let errorMsg = '';
            if (typeof err === 'string') {
                errorMsg = err;
            } else if (err?.message) {
                errorMsg = err.message;
            } else if (err?.toString) {
                errorMsg = err.toString();
            }

            // Don't show error toast for cancellation (already shown in cancelUpload)
            const isCancelled = errorMsg.toLowerCase().includes('cancel');

            if (!isCancelled) {
                showToast('Failed to share: ' + (errorMsg || 'Unknown error'), 'error');
            }

            shareBtn.innerHTML = '<div class="btn-content"><span><i class="fas fa-share-alt"></i> Share Files</span></div>';
            shareBtn.disabled = false;
            if (contentArea) contentArea.classList.remove('disabled');
            if (optionsPanel) optionsPanel.style.pointerEvents = '';
            headerButtons.forEach(btn => btn.disabled = false);
        }
    });
}

// ==================== File Handling ====================
async function handleDroppedFiles(paths) {
    for (const path of paths) {
        // Check if file already exists
        if (appState.files.some(f => f.path === path)) {
            continue;
        }

        try {
            const fileInfo = await App.GetFileInfo(path);
            appState.files.push(fileInfo);
        } catch (err) {
            console.error('Failed to get file info for', path, err);
        }
    }

    updateFileList();
}

function handleUploadProgress(data) {
    const shareBtn = document.getElementById('shareBtn');
    if (!shareBtn) return;

    const percent = data.percent || 0;
    const current = formatFileSize(data.current);
    const total = formatFileSize(data.total);

    shareBtn.innerHTML = `
        <div class="btn-progress-bg" style="width: ${percent}%;"></div>
        <div class="btn-content">
            <span><i class="fas fa-upload"></i> ${percent}% • ${current}/${total}</span>
            <button class="btn-cancel" onclick="cancelUpload(event)">Cancel</button>
        </div>
    `;
}

// Global function to cancel upload (called from inline onclick)
window.cancelUpload = async function(event) {
    event.preventDefault();
    event.stopPropagation();

    try {
        await App.CancelUpload();
        showToast('Upload cancelled', 'error');
    } catch (err) {
        console.error('Failed to cancel upload:', err);
    }
}

function setupFileDrawer() {
    const fileBadge = document.getElementById('fileBadge');
    const fileDrawer = document.getElementById('fileDrawer');
    const closeDrawer = document.getElementById('closeDrawer');

    if (!fileBadge || !fileDrawer || !closeDrawer) return;

    // Open drawer on badge click
    fileBadge.addEventListener('click', () => {
        fileDrawer.classList.add('open');
    });

    // Close drawer on close button click
    closeDrawer.addEventListener('click', () => {
        fileDrawer.classList.remove('open');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (fileDrawer.classList.contains('open') &&
            !fileDrawer.contains(e.target) &&
            !fileBadge.contains(e.target)) {
            fileDrawer.classList.remove('open');
        }
    });
}

function updateFileList() {
    const fileBadge = document.getElementById('fileBadge');
    const badgeCount = document.getElementById('badgeCount');
    const fileBadgeText = document.getElementById('fileBadgeText');
    const filesContainer = document.getElementById('filesContainer');
    const passwordCheck = document.getElementById('passwordCheck');
    const passwordInput = document.getElementById('passwordInput');
    const expirySelect = document.getElementById('expirySelect');
    const shareBtn = document.getElementById('shareBtn');

    const fileCount = appState.files.length;

    if (fileCount === 0) {
        // Hide badge but keep space reserved
        fileBadge.style.visibility = 'hidden';

        // Disable options
        passwordCheck.disabled = true;
        passwordCheck.checked = false;
        passwordInput.disabled = true;
        passwordInput.value = '';
        expirySelect.disabled = true;

        // Disable share button
        shareBtn.disabled = true;
        return;
    }

    // Show badge
    fileBadge.style.visibility = 'visible';
    badgeCount.textContent = fileCount;
    fileBadgeText.textContent = `${fileCount} file${fileCount !== 1 ? 's' : ''} selected`;

    // Enable options
    passwordCheck.disabled = false;
    // Password input only enabled if checkbox is checked
    passwordInput.disabled = !passwordCheck.checked;
    expirySelect.disabled = false;

    // Enable share button
    shareBtn.disabled = false;

    // Update drawer file list
    filesContainer.innerHTML = appState.files.map((file, index) => `
        <div class="file-item">
            <i class="fas fa-file"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button class="file-remove" data-index="${index}" title="Remove file">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    // Add remove button handlers
    filesContainer.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent "click outside" from closing drawer

            const index = parseInt(btn.dataset.index);
            appState.files.splice(index, 1);

            // Close drawer if that was the last file
            if (appState.files.length === 0) {
                const fileDrawer = document.getElementById('fileDrawer');
                if (fileDrawer) fileDrawer.classList.remove('open');
            }

            updateFileList();
        });
    });
}

// ==================== Confirmation Dialog ====================
function showConfirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <h3>Confirm Action</h3>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                <button class="btn btn-danger" id="confirmBtn">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#confirmBtn').addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });

    overlay.querySelector('#cancelBtn').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// ==================== Utility Functions ====================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return; // Container not found

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==================== Start ====================
init();
