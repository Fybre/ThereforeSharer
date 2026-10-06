(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function a(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerpolicy&&(i.referrerPolicy=n.referrerpolicy),n.crossorigin==="use-credentials"?i.credentials="include":n.crossorigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(n){if(n.ep)return;n.ep=!0;const i=a(n);fetch(n.href,i)}})();const w="/assets/appicon.b169e64e.png";let m;const c="/api",p={files:[],role:"",settings:{baseURL:"",tenantName:"",authType:"basic",username:"",password:"",token:"",userPassword:"",selectedCategory:null}},u={async getStatus(){return await(await fetch(`${c}/status`)).json()},async login(e){const t=await fetch(`${c}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:e})});if(!t.ok){const a=await t.json();throw new Error(a.error||"Login failed")}return await t.json()},async logout(){await fetch(`${c}/logout`,{method:"POST"}),location.reload()},async getConfig(){const e=await fetch(`${c}/config`);if(e.status===401||e.status===403)throw new Error("Unauthorized");return await e.json()},async saveConfig(e){return await(await fetch(`${c}/config`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).json()},async setAuthCredentials(e,t,a,s){return await(await fetch(`${c}/auth`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authType:e,username:t,password:a,token:s})})).json()},async hasStoredCredentials(){return(await(await fetch(`${c}/auth/check`)).json()).hasStoredCredentials},async getCategories(e){const t=await fetch(`${c}/categories`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok){const a=await t.json();throw new Error(a.error||"Failed to fetch categories")}return await t.json()},shareFiles(e,t,a,s,n){return new Promise((i,o)=>{const r=new FormData;e.forEach(d=>{r.append("files",d),r.append("paths",d.relPath||d.name)}),r.append("password",t),r.append("expiryDays",a),r.append("customExpiry",s);const l=new XMLHttpRequest;l.open("POST",`${c}/share`,!0),l.upload.onprogress=d=>{if(d.lengthComputable){const g=Math.round(d.loaded/d.total*100);n(g,d.loaded,d.total)}},l.onload=()=>{if(l.status>=200&&l.status<300)i(JSON.parse(l.responseText));else{const d=JSON.parse(l.responseText||'{"error": "Unknown error"}');o(new Error(d.error||"Upload failed"))}},l.onerror=()=>o(new Error("Network error during upload")),l.send(r)})},async getShareHistory(){const e=await fetch(`${c}/history`);if(!e.ok){const t=await e.json();throw new Error(t.error||"Failed to fetch history")}return await e.json()}};async function B(){m=document.getElementById("app");try{const e=await u.getStatus();p.role=e.role,e.isFirstRun?f(!0):e.isLoggedIn?p.role==="admin"&&!e.isConfigured?E():y():f(!1)}catch(e){console.error("Initialization failed:",e),f(!1)}}function f(e){m.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon">
                        <img src="${w}" alt="ThereforeSharer" class="app-icon-img">
                    </div>
                    <div class="app-title-text">
                        <h1>${e?"Initial Setup":"Login"}</h1>
                        <p class="app-subtitle">${e?"Create your admin password":"Enter portal password"}</p>
                    </div>
                </div>
            </header>
            <div class="settings-form">
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="input" id="loginPassword" placeholder="Enter password" autofocus>
                </div>
                <button class="btn btn-primary" id="loginBtn" style="width: 100%;">${e?"Set Admin & Start":"Login"}</button>
            </div>
        </div>
    `;const t=async()=>{const a=document.getElementById("loginPassword").value;if(!!a)try{await u.login(a),location.reload()}catch(s){alert(s.message)}};document.getElementById("loginBtn").addEventListener("click",t),document.getElementById("loginPassword").addEventListener("keypress",a=>{a.key==="Enter"&&t()})}function y(){const e=p.role==="admin";m.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon"><img src="${w}" alt="ThereforeSharer" class="app-icon-img"></div>
                    <div class="app-title-text">
                        <h1>ThereforeSharer</h1>
                        <p class="app-subtitle">${e?"Admin Portal":"User Portal"}</p>
                    </div>
                </div>
                <div class="header-buttons">
                    <button class="icon-btn" id="historyBtn" title="History"><i class="fas fa-history"></i></button>
                    ${e?'<button class="icon-btn" id="settingsBtn" title="Settings"><i class="fas fa-gear"></i></button>':""}
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
    `,L(),C()}async function E(){let e=null;try{e=await u.getConfig()}catch(t){alert(t.message),y();return}m.innerHTML=`
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
                    <input type="password" class="input" id="userPassword" placeholder="Set password for team members" value="${e.user_password||""}">
                </div>
                <hr style="margin: 20px 0; opacity: 0.2;">
                <div class="form-group"><label>Therefore Base URL</label><input type="text" class="input" id="baseURL" value="${e.base_url||""}"></div>
                <div class="form-group"><label>Tenant Name</label><input type="text" class="input" id="tenantName" value="${e.tenant_name||""}"></div>
                
                <div class="form-group">
                    <label>Therefore Credentials</label>
                    <div class="auth-tabs" style="margin-bottom: 10px;">
                        <button class="auth-tab ${e.auth_type==="basic"?"active":""}" data-type="basic">Basic</button>
                        <button class="auth-tab ${e.auth_type==="bearer"?"active":""}" data-type="bearer">Bearer</button>
                    </div>
                    <div id="basicAuthSection" style="${e.auth_type==="basic"?"":"display: none;"}">
                        <input type="text" class="input" id="username" placeholder="Username" style="margin-bottom: 5px;">
                        <input type="password" class="input" id="password" placeholder="Password">
                    </div>
                    <div id="bearerAuthSection" style="${e.auth_type==="bearer"?"":"display: none;"}">
                        <textarea class="input" id="token" placeholder="Bearer Token" rows="2"></textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label>Therefore Category</label>
                    <div class="category-row">
                        <select class="select" id="categorySelect" style="flex: 1;"><option value="${e.category_no||""}">${e.category_name||"Select..."}</option></select>
                        <button class="btn btn-secondary" id="loadCategoriesBtn">Load</button>
                    </div>
                </div>

                <button class="btn btn-primary" id="saveSettingsBtn" style="width: 100%;">Save All Settings</button>
            </div>
        </div>
    `,document.getElementById("backBtn").addEventListener("click",y),document.querySelectorAll(".auth-tab").forEach(t=>{t.addEventListener("click",()=>{document.querySelectorAll(".auth-tab").forEach(a=>a.classList.remove("active")),t.classList.add("active"),document.getElementById("basicAuthSection").style.display=t.dataset.type==="basic"?"block":"none",document.getElementById("bearerAuthSection").style.display=t.dataset.type==="bearer"?"block":"none"})}),document.getElementById("loadCategoriesBtn").addEventListener("click",async()=>{const t={baseURL:document.getElementById("baseURL").value,tenantName:document.getElementById("tenantName").value,authType:document.querySelector(".auth-tab.active").dataset.type,username:document.getElementById("username").value,password:document.getElementById("password").value,token:document.getElementById("token").value};try{const a=await u.getCategories(t),s=document.getElementById("categorySelect");s.innerHTML=a.map(n=>`<option value="${n.objNo}">${n.caption}</option>`).join("")}catch(a){alert(a.message)}}),document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{var i;const t=document.querySelector(".auth-tab.active").dataset.type,a=document.getElementById("categorySelect"),s=document.getElementById("newAdminPassword").value,n={base_url:document.getElementById("baseURL").value,tenant_name:document.getElementById("tenantName").value,auth_type:t,category_no:parseInt(a.value)||0,category_name:((i=a.options[a.selectedIndex])==null?void 0:i.text)||"",user_password:document.getElementById("userPassword").value,is_set_up:!0,default_archive:"Archive"};s&&(n.new_admin_password=s);try{await u.saveConfig(n);const o=document.getElementById("username").value,r=document.getElementById("password").value,l=document.getElementById("token").value;(t==="basic"&&o&&r||t==="bearer"&&l)&&await u.setAuthCredentials(t,o,r,l),alert("Settings Saved!"),location.reload()}catch(o){alert(o.message)}})}async function I(){m.innerHTML='<div class="main-container"><header class="app-header"><h1>History</h1><button class="icon-btn" id="backBtn"><i class="fas fa-arrow-left"></i></button></header><div class="history-list" id="historyList">Loading...</div></div>',document.getElementById("backBtn").addEventListener("click",y);const e=document.getElementById("historyList");try{const t=await u.getShareHistory();e.innerHTML=t.map(a=>{const s=a.SharedLink||a;return`<div class="history-item"><div><strong>${s.Filename}</strong><br><small>${a.CategoryName||"Doc #"+s.DocNo}</small></div><button class="btn btn-small" onclick="navigator.clipboard.writeText('${s.LinkUrl}'); alert('Copied!')"><i class="fas fa-copy"></i></button></div>`}).join("")}catch(t){e.innerHTML=`<p>${t.message}</p>`}}function L(){const e=document.getElementById("fileInput");document.getElementById("historyBtn").addEventListener("click",I),document.getElementById("logoutBtn").addEventListener("click",()=>u.logout()),document.getElementById("settingsBtn")&&document.getElementById("settingsBtn").addEventListener("click",E),document.getElementById("browseBtn").addEventListener("click",()=>e.click()),e.addEventListener("change",a=>v(a.target.files));const t=document.getElementById("dropZone");t.addEventListener("dragover",a=>{a.preventDefault(),t.classList.add("drag-over")}),t.addEventListener("dragleave",()=>t.classList.remove("drag-over")),t.addEventListener("drop",async a=>{a.preventDefault(),t.classList.remove("drag-over");const s=[...a.dataTransfer.items].map(n=>n.webkitGetAsEntry&&n.webkitGetAsEntry()).filter(Boolean);if(s.length===0){v(a.dataTransfer.files);return}try{v(await S(s))}catch(n){alert("Failed to read dropped items: "+n.message)}}),document.getElementById("passwordCheck").addEventListener("change",a=>document.getElementById("passwordInput").disabled=!a.target.checked),document.getElementById("expirySelect").addEventListener("change",a=>{document.getElementById("customDate").style.display=a.target.value==="custom"?"inline-block":"none",document.getElementById("customDate").disabled=a.target.value!=="custom"}),document.getElementById("clearFilesBtn").addEventListener("click",()=>{p.files=[],b()}),document.getElementById("shareBtn").addEventListener("click",async()=>{const a=document.getElementById("passwordCheck").checked?document.getElementById("passwordInput").value:"",s=document.getElementById("expirySelect"),n=s.value==="custom"?-1:s.value==="never"?0:parseInt(s.value),i=n===-1?new Date(document.getElementById("customDate").value).toISOString():"",o=k();try{const r=await u.shareFiles(p.files,a,n,i,(l,d,g)=>{x(l,d,g)});o.remove(),T(r.url)}catch(r){o.remove(),alert(r.message)}})}function v(e){for(const t of e)t.relPath||(t.relPath=t.name),p.files.find(a=>a.relPath===t.relPath)||p.files.push(t);b()}async function S(e){const t=[],a=async(s,n)=>{if(s.isFile){const i=await new Promise((o,r)=>s.file(o,r));i.relPath=n+i.name,t.push(i)}else if(s.isDirectory){const i=s.createReader();let o;do{o=await new Promise((r,l)=>i.readEntries(r,l));for(const r of o)await a(r,n+s.name+"/")}while(o.length>0)}};for(const s of e)await a(s,"");return t}function h(e){if(e===0)return"0 B";const t=1024,a=["B","KB","MB","GB"],s=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,s)).toFixed(1))+" "+a[s]}function b(){const e=p.files.length,t=document.getElementById("fileBadge"),a=document.getElementById("badgeCount"),s=document.getElementById("fileBadgeText"),n=document.getElementById("filesContainer"),i=document.getElementById("shareBtn");if(e===0){t&&(t.style.visibility="hidden"),i&&(i.disabled=!0),["passwordCheck","expirySelect"].forEach(o=>{const r=document.getElementById(o);r&&(r.disabled=!0)});return}t&&(t.style.visibility="visible"),a&&(a.textContent=e),s&&(s.textContent=`${e} file${e!==1?"s":""} selected`),i&&(i.disabled=!1),["passwordCheck","expirySelect"].forEach(o=>{const r=document.getElementById(o);r&&(r.disabled=!1)}),n&&(n.innerHTML=p.files.map((o,r)=>`
            <div class="file-item">
                <i class="fas fa-file"></i>
                <span class="file-name">${o.relPath||o.name}</span>
                <span class="file-size">${h(o.size)}</span>
                <button class="file-remove" onclick="window.removeFile(${r})"><i class="fas fa-times"></i></button>
            </div>
        `).join(""))}window.removeFile=e=>{p.files.splice(e,1),b()};function k(){const e=document.createElement("div");return e.className="upload-overlay",e.id="uploadOverlay",e.innerHTML=`
        <div class="upload-progress-card">
            <h3 class="upload-progress-title">Uploading Files</h3>
            <p class="upload-progress-subtitle">Transferring to Therefore\u2122</p>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="uploadProgressFill" style="width: 0%;"></div>
            </div>
            <div class="upload-progress-text" id="uploadProgressText">0% \u2022 0 B / 0 B</div>
        </div>
    `,document.body.appendChild(e),e}function x(e,t,a){const s=document.getElementById("uploadProgressFill"),n=document.getElementById("uploadProgressText"),i=document.querySelector(".upload-progress-subtitle");s&&(s.style.width=`${e}%`),n&&(n.textContent=`${e}% \u2022 ${h(t)} / ${h(a)}`),i&&e===100&&(i.textContent="Processing at Therefore\u2122...")}function T(e){const t=document.createElement("div");t.className="share-dialog",t.innerHTML=`
        <div class="dialog-content">
            <div style="color: var(--accent-primary); font-size: 48px; margin-bottom: 16px;">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>Files Shared Successfully!</h3>
            <p>Your shareable link is ready:</p>
            <div class="url-box">
                <input type="text" id="shareUrl" value="${e}" readonly>
                <button class="btn btn-secondary" id="copyUrlBtn" style="padding: 0 15px; min-width: 80px;">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" onclick="location.reload()">
                Done
            </button>
        </div>
    `,document.body.appendChild(t);const a=document.getElementById("copyUrlBtn");a.addEventListener("click",()=>{navigator.clipboard.writeText(e);const s=a.innerHTML;a.innerHTML='<i class="fas fa-check"></i> Copied!',setTimeout(()=>a.innerHTML=s,2e3)})}function C(){var a;const e=document.getElementById("fileBadge"),t=document.getElementById("fileDrawer");e==null||e.addEventListener("click",()=>t.classList.toggle("open")),(a=document.getElementById("closeDrawer"))==null||a.addEventListener("click",()=>t.classList.remove("open"))}B();
