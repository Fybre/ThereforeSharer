(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerpolicy&&(i.referrerPolicy=s.referrerpolicy),s.crossorigin==="use-credentials"?i.credentials="include":s.crossorigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=a(s);fetch(s.href,i)}})();const f="/assets/appicon.b169e64e.png";let u;const r="/api",l={files:[],role:"",settings:{baseURL:"",tenantName:"",authType:"basic",username:"",password:"",token:"",userPassword:"",selectedCategory:null}},d={async getStatus(){return await(await fetch(`${r}/status`)).json()},async login(e){const t=await fetch(`${r}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:e})});if(!t.ok){const a=await t.json();throw new Error(a.error||"Login failed")}return await t.json()},async logout(){await fetch(`${r}/logout`,{method:"POST"}),location.reload()},async getConfig(){const e=await fetch(`${r}/config`);if(e.status===401||e.status===403)throw new Error("Unauthorized");return await e.json()},async saveConfig(e){return await(await fetch(`${r}/config`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)})).json()},async setAuthCredentials(e,t,a,n){return await(await fetch(`${r}/auth`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authType:e,username:t,password:a,token:n})})).json()},async hasStoredCredentials(){return(await(await fetch(`${r}/auth/check`)).json()).hasStoredCredentials},async getCategories(e){const t=await fetch(`${r}/categories`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok){const a=await t.json();throw new Error(a.error||"Failed to fetch categories")}return await t.json()},async shareFiles(e,t,a,n){const s=new FormData;e.forEach(o=>s.append("files",o)),s.append("password",t),s.append("expiryDays",a),s.append("customExpiry",n);const i=await fetch(`${r}/share`,{method:"POST",body:s});if(!i.ok){const o=await i.json();throw new Error(o.error||"Failed to share files")}return await i.json()},async getShareHistory(){const e=await fetch(`${r}/history`);if(!e.ok){const t=await e.json();throw new Error(t.error||"Failed to fetch history")}return await e.json()}};async function b(){u=document.getElementById("app");try{const e=await d.getStatus();l.role=e.role,e.isFirstRun?m(!0):e.isLoggedIn?l.role==="admin"&&!e.isConfigured?h():p():m(!1)}catch(e){console.error("Initialization failed:",e),m(!1)}}function m(e){u.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon">
                        <img src="${f}" alt="ThereforeSharer" class="app-icon-img">
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
    `;const t=async()=>{const a=document.getElementById("loginPassword").value;if(!!a)try{await d.login(a),location.reload()}catch(n){alert(n.message)}};document.getElementById("loginBtn").addEventListener("click",t),document.getElementById("loginPassword").addEventListener("keypress",a=>{a.key==="Enter"&&t()})}function p(){const e=l.role==="admin";u.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon"><img src="${f}" alt="ThereforeSharer" class="app-icon-img"></div>
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
                        <span id="fileBadgeText">0 files</span>
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
    `,E(),B()}async function h(){let e=null;try{e=await d.getConfig()}catch(t){alert(t.message),p();return}u.innerHTML=`
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
    `,document.getElementById("backBtn").addEventListener("click",p),document.querySelectorAll(".auth-tab").forEach(t=>{t.addEventListener("click",()=>{document.querySelectorAll(".auth-tab").forEach(a=>a.classList.remove("active")),t.classList.add("active"),document.getElementById("basicAuthSection").style.display=t.dataset.type==="basic"?"block":"none",document.getElementById("bearerAuthSection").style.display=t.dataset.type==="bearer"?"block":"none"})}),document.getElementById("loadCategoriesBtn").addEventListener("click",async()=>{const t={baseURL:document.getElementById("baseURL").value,tenantName:document.getElementById("tenantName").value,authType:document.querySelector(".auth-tab.active").dataset.type,username:document.getElementById("username").value,password:document.getElementById("password").value,token:document.getElementById("token").value};try{const a=await d.getCategories(t),n=document.getElementById("categorySelect");n.innerHTML=a.map(s=>`<option value="${s.objNo}">${s.caption}</option>`).join("")}catch(a){alert(a.message)}}),document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{var i;const t=document.querySelector(".auth-tab.active").dataset.type,a=document.getElementById("categorySelect"),n=document.getElementById("newAdminPassword").value,s={base_url:document.getElementById("baseURL").value,tenant_name:document.getElementById("tenantName").value,auth_type:t,category_no:parseInt(a.value)||0,category_name:((i=a.options[a.selectedIndex])==null?void 0:i.text)||"",user_password:document.getElementById("userPassword").value,is_set_up:!0,default_archive:"Archive"};n&&(s.new_admin_password=n);try{await d.saveConfig(s);const o=document.getElementById("username").value,c=document.getElementById("password").value,g=document.getElementById("token").value;(t==="basic"&&o&&c||t==="bearer"&&g)&&await d.setAuthCredentials(t,o,c,g),alert("Settings Saved!"),location.reload()}catch(o){alert(o.message)}})}async function w(){u.innerHTML='<div class="main-container"><header class="app-header"><h1>History</h1><button class="icon-btn" id="backBtn"><i class="fas fa-arrow-left"></i></button></header><div class="history-list" id="historyList">Loading...</div></div>',document.getElementById("backBtn").addEventListener("click",p);const e=document.getElementById("historyList");try{const t=await d.getShareHistory();e.innerHTML=t.map(a=>{const n=a.SharedLink||a;return`<div class="history-item"><div><strong>${n.Filename}</strong><br><small>${a.CategoryName||"Doc #"+n.DocNo}</small></div><button class="btn btn-small" onclick="navigator.clipboard.writeText('${n.LinkUrl}'); alert('Copied!')"><i class="fas fa-copy"></i></button></div>`}).join("")}catch(t){e.innerHTML=`<p>${t.message}</p>`}}function E(){const e=document.getElementById("fileInput");document.getElementById("historyBtn").addEventListener("click",w),document.getElementById("logoutBtn").addEventListener("click",()=>d.logout()),document.getElementById("settingsBtn")&&document.getElementById("settingsBtn").addEventListener("click",h),document.getElementById("browseBtn").addEventListener("click",()=>e.click()),e.addEventListener("change",a=>v(a.target.files));const t=document.getElementById("dropZone");t.addEventListener("dragover",a=>{a.preventDefault(),t.classList.add("drag-over")}),t.addEventListener("dragleave",()=>t.classList.remove("drag-over")),t.addEventListener("drop",a=>{a.preventDefault(),t.classList.remove("drag-over"),v(a.dataTransfer.files)}),document.getElementById("passwordCheck").addEventListener("change",a=>document.getElementById("passwordInput").disabled=!a.target.checked),document.getElementById("expirySelect").addEventListener("change",a=>{document.getElementById("customDate").style.display=a.target.value==="custom"?"inline-block":"none",document.getElementById("customDate").disabled=a.target.value!=="custom"}),document.getElementById("clearFilesBtn").addEventListener("click",()=>{l.files=[],y()}),document.getElementById("shareBtn").addEventListener("click",async()=>{const a=document.getElementById("passwordCheck").checked?document.getElementById("passwordInput").value:"",n=document.getElementById("expirySelect"),s=n.value==="custom"?-1:n.value==="never"?0:parseInt(n.value),i=s===-1?new Date(document.getElementById("customDate").value).toISOString():"";try{const o=await d.shareFiles(l.files,a,s,i),c=document.createElement("div");c.className="share-dialog",c.innerHTML=`<div class="dialog-content"><h3>Shared!</h3><input type="text" value="${o.url}" readonly style="width: 100%;"><br><br><button class="btn btn-primary" onclick="location.reload()">Close</button></div>`,document.body.appendChild(c)}catch(o){alert(o.message)}})}function v(e){for(const t of e)l.files.find(a=>a.name===t.name)||l.files.push(t);y()}function y(){const e=l.files.length;document.getElementById("fileBadge").style.visibility=e>0?"visible":"hidden",document.getElementById("badgeCount").textContent=e,document.getElementById("shareBtn").disabled=e===0,document.getElementById("filesContainer").innerHTML=l.files.map((t,a)=>`<div class="file-item"><span>${t.name}</span><button class="file-remove" onclick="window.removeFile(${a})"><i class="fas fa-times"></i></button></div>`).join("")}window.removeFile=e=>{l.files.splice(e,1),y()};function B(){var a;const e=document.getElementById("fileBadge"),t=document.getElementById("fileDrawer");e==null||e.addEventListener("click",()=>t.classList.toggle("open")),(a=document.getElementById("closeDrawer"))==null||a.addEventListener("click",()=>t.classList.remove("open"))}b();
