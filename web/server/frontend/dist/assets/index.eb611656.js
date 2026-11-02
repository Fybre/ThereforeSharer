(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerpolicy&&(a.referrerPolicy=i.referrerpolicy),i.crossorigin==="use-credentials"?a.credentials="include":i.crossorigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(i){if(i.ep)return;i.ep=!0;const a=t(i);fetch(i.href,a)}})();function I(e){return String(e!=null?e:"").replace(/[&<>"']/g,n=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[n])}const $=`
    <div class="form-group description-settings" id="descriptionSettings">
        <label><input type="checkbox" id="descriptionEnabled"> Use a text field for the description / filename</label>
        <div id="descriptionMapping" hidden>
            <label for="descriptionField">Save the description to</label>
            <select class="select" id="descriptionField" style="width:100%"></select>
        </div>
        <small class="description-hint" id="descriptionStatus" role="status"></small>
        <button type="button" class="btn btn-secondary" id="retryDescriptionFields" hidden>Retry loading fields</button>
    </div>`,P=`
    <div class="description-option" id="descriptionOption" hidden>
        <label for="descriptionInput">Description / filename</label>
        <input type="text" class="input" id="descriptionInput" placeholder="Use uploaded filename" disabled>
        <small class="description-hint">Optional. Leave blank to use the uploaded ZIP filename.</small>
    </div>`;function F(e,n){const t=document.getElementById("descriptionOption"),s=document.getElementById("descriptionInput");!t||!s||(t.hidden=!e,s.disabled=!e||n===0,n===0&&(s.value=""))}function N(e,n){const t=document.getElementById("categorySelect"),s=document.getElementById("descriptionEnabled"),i=document.getElementById("descriptionMapping"),a=document.getElementById("descriptionField"),o=document.getElementById("descriptionStatus"),r=document.getElementById("retryDescriptionFields");let l=0,c=!1,d=Number(t.value);s.checked=e>0;const g=()=>{i.hidden=!s.checked};s.addEventListener("change",g);async function b(f=0){const w=++l;if(c=!1,a.replaceChildren(),a.disabled=!0,r.hidden=!0,o.textContent="Checking category text fields\u2026",g(),!Number(t.value)){s.checked=!1,s.disabled=!0,o.textContent="Select a category to check for text fields.",g();return}s.disabled=!1;try{const u=await n(Number(t.value));if(w!==l||!a.isConnected)return;for(const h of u){const T=new Option(h.caption,String(h.fieldNo));a.add(T)}f&&u.some(h=>h.fieldNo===f)?a.value=String(f):f&&(s.checked=!1),c=!0,a.disabled=u.length===0,s.disabled=u.length===0,u.length||(s.checked=!1),o.textContent=u.length?f&&!u.some(h=>h.fieldNo===f)?"The saved field is unavailable. Choose a text field to use instead.":"Text fields found. Use one for a description / filename when sharing?":"No editable text fields found in this category.",g()}catch(u){if(w!==l||!a.isConnected)return;o.textContent="Could not load text fields: "+((u==null?void 0:u.message)||String(u)),r.hidden=!1}}return t.addEventListener("change",()=>{const f=d===Number(t.value),w=f?Number(a.value):0;f||(s.checked=!1),d=Number(t.value),b(w)}),["baseURL","tenantName"].forEach(f=>document.getElementById(f).addEventListener("change",()=>{s.checked=!1,b()})),r.addEventListener("click",()=>b(e)),b(e),()=>{if(!s.checked)return 0;if(!c||!Number(a.value))throw new Error("Wait for the text fields to load, or turn off the description field.");return Number(a.value)}}function D(){var e,n,t;return{baseURL:document.getElementById("baseURL").value.trim(),tenantName:document.getElementById("tenantName").value.trim(),authType:document.querySelector(".auth-tab.active").dataset.type,username:((e=document.getElementById("username"))==null?void 0:e.value.trim())||"",password:((n=document.getElementById("password"))==null?void 0:n.value)||"",token:((t=document.getElementById("token"))==null?void 0:t.value.trim())||""}}const x="/assets/appicon.b169e64e.png";let v;const m="/api",p={files:[],role:"",settings:{baseURL:"",tenantName:"",authType:"basic",username:"",password:"",token:"",userPassword:"",selectedCategory:null}},y={async getShareOptions(){const e=await fetch(`${m}/share-options`);if(!e.ok)throw new Error("Could not load sharing options");return e.json()},async getCategoryTextFields(e,n){const t=await fetch(`${m}/category-text-fields`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...e,categoryNo:n})}),s=await t.json();if(!t.ok)throw new Error(s.error||"Could not load text fields");return s},async getStatus(){return await(await fetch(`${m}/status`)).json()},async login(e){const n=await fetch(`${m}/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:e})});if(!n.ok){const t=await n.json();throw new Error(t.error||"Login failed")}return await n.json()},async logout(){await fetch(`${m}/logout`,{method:"POST"}),location.reload()},async getConfig(){const e=await fetch(`${m}/config`);if(e.status===401||e.status===403)throw new Error("Unauthorized");return await e.json()},async saveConfig(e){const n=await fetch(`${m}/config`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)}),t=await n.json();if(!n.ok)throw new Error(t.error||"Could not save settings");return t},async setAuthCredentials(e,n,t,s){return await(await fetch(`${m}/auth`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({authType:e,username:n,password:t,token:s})})).json()},async hasStoredCredentials(){return(await(await fetch(`${m}/auth/check`)).json()).hasStoredCredentials},async getCategories(e){const n=await fetch(`${m}/categories`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!n.ok){const t=await n.json();throw new Error(t.error||"Failed to fetch categories")}return await n.json()},shareFiles(e,n,t,s,i,a){return new Promise((o,r)=>{const l=new FormData;e.forEach(d=>{l.append("files",d),l.append("paths",d.relPath||d.name)}),l.append("password",n),l.append("description",i),l.append("expiryDays",t),l.append("customExpiry",s);const c=new XMLHttpRequest;c.open("POST",`${m}/share`,!0),c.upload.onprogress=d=>{if(d.lengthComputable){const g=Math.round(d.loaded/d.total*100);a(g,d.loaded,d.total)}},c.onload=()=>{if(c.status>=200&&c.status<300)o(JSON.parse(c.responseText));else{const d=JSON.parse(c.responseText||'{"error": "Unknown error"}');r(new Error(d.error||"Upload failed"))}},c.onerror=()=>r(new Error("Network error during upload")),c.send(l)})},async getShareHistory(){const e=await fetch(`${m}/history`);if(!e.ok){const n=await e.json();throw new Error(n.error||"Failed to fetch history")}return await e.json()}};async function O(){v=document.getElementById("app");try{const e=await y.getStatus();p.role=e.role,e.isFirstRun?S(!0):e.isLoggedIn?p.role==="admin"&&!e.isConfigured?C():E():S(!1)}catch(e){console.error("Initialization failed:",e),S(!1)}}function S(e){v.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon">
                        <img src="${x}" alt="ThereforeSharer" class="app-icon-img">
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
    `;const n=async()=>{const t=document.getElementById("loginPassword").value;if(!!t)try{await y.login(t),location.reload()}catch(s){alert(s.message)}};document.getElementById("loginBtn").addEventListener("click",n),document.getElementById("loginPassword").addEventListener("keypress",t=>{t.key==="Enter"&&n()})}async function E(){try{const n=await y.getShareOptions();p.descriptionEnabled=n.descriptionEnabled}catch{p.descriptionEnabled=!1}const e=p.role==="admin";v.innerHTML=`
        <div class="main-container">
            <header class="app-header">
                <div class="app-title">
                    <div class="app-title-icon"><img src="${x}" alt="ThereforeSharer" class="app-icon-img"></div>
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
 ${P}
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
    `,M(),q(),B()}async function C(){let e=null;try{e=await y.getConfig()}catch(t){alert(t.message),E();return}v.innerHTML=`
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

                ${$}
                <button class="btn btn-primary" id="saveSettingsBtn" style="width: 100%;">Save All Settings</button>
            </div>
        </div>
    `,document.getElementById("backBtn").addEventListener("click",E),document.querySelectorAll(".auth-tab").forEach(t=>{t.addEventListener("click",()=>{document.querySelectorAll(".auth-tab").forEach(s=>s.classList.remove("active")),t.classList.add("active"),document.getElementById("basicAuthSection").style.display=t.dataset.type==="basic"?"block":"none",document.getElementById("bearerAuthSection").style.display=t.dataset.type==="bearer"?"block":"none"})}),document.getElementById("loadCategoriesBtn").addEventListener("click",async()=>{const t={baseURL:document.getElementById("baseURL").value,tenantName:document.getElementById("tenantName").value,authType:document.querySelector(".auth-tab.active").dataset.type,username:document.getElementById("username").value,password:document.getElementById("password").value,token:document.getElementById("token").value};try{const s=await y.getCategories(t),i=document.getElementById("categorySelect");i.replaceChildren(...(s||[]).map(a=>new Option(a.caption,a.objNo))),i.dispatchEvent(new Event("change"))}catch(s){alert(s.message)}});const n=N(e.description_field_no||0,t=>y.getCategoryTextFields(D(),t));document.getElementById("saveSettingsBtn").addEventListener("click",async()=>{var r;const t=document.querySelector(".auth-tab.active").dataset.type,s=document.getElementById("categorySelect"),i=document.getElementById("newAdminPassword").value;let a;try{a=n()}catch(l){alert(l.message);return}const o={base_url:document.getElementById("baseURL").value,tenant_name:document.getElementById("tenantName").value,auth_type:t,category_no:parseInt(s.value)||0,description_field_no:a,category_name:((r=s.options[s.selectedIndex])==null?void 0:r.text)||"",user_password:document.getElementById("userPassword").value,is_set_up:!0,default_archive:"Archive"};i&&(o.new_admin_password=i);try{await y.saveConfig(o);const l=document.getElementById("username").value,c=document.getElementById("password").value,d=document.getElementById("token").value;(t==="basic"&&l&&c||t==="bearer"&&d)&&await y.setAuthCredentials(t,l,c,d),alert("Settings Saved!"),location.reload()}catch(l){alert(l.message)}})}async function U(){v.innerHTML='<div class="main-container"><header class="app-header"><h1>History</h1><button class="icon-btn" id="backBtn"><i class="fas fa-arrow-left"></i></button></header><div class="history-list" id="historyList">Loading...</div></div>',document.getElementById("backBtn").addEventListener("click",E);const e=document.getElementById("historyList");try{const n=await y.getShareHistory();e.innerHTML=n.map(t=>{const s=t.SharedLink||t;return`<div class="history-item"><div><strong>${I(t.Description||s.Filename||"Unnamed")}</strong>${t.Description&&t.Description!==s.Filename?`<div class="history-item-original">File: ${I(s.Filename)}</div>`:"<br>"}<small>${I(t.CategoryName||"Doc #"+s.DocNo)}</small></div><button class="btn btn-small" onclick="navigator.clipboard.writeText('${s.LinkUrl}'); alert('Copied!')"><i class="fas fa-copy"></i></button></div>`}).join("")}catch(n){e.innerHTML=`<p>${n.message}</p>`}}function M(){const e=document.getElementById("fileInput");document.getElementById("historyBtn").addEventListener("click",U),document.getElementById("logoutBtn").addEventListener("click",()=>y.logout()),document.getElementById("settingsBtn")&&document.getElementById("settingsBtn").addEventListener("click",C),document.getElementById("browseBtn").addEventListener("click",()=>e.click()),e.addEventListener("change",t=>k(t.target.files));const n=document.getElementById("dropZone");n.addEventListener("dragover",t=>{t.preventDefault(),n.classList.add("drag-over")}),n.addEventListener("dragleave",()=>n.classList.remove("drag-over")),n.addEventListener("drop",async t=>{t.preventDefault(),n.classList.remove("drag-over");const s=[...t.dataTransfer.items].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);if(s.length===0){k(t.dataTransfer.files);return}try{k(await A(s))}catch(i){alert("Failed to read dropped items: "+i.message)}}),document.getElementById("passwordCheck").addEventListener("change",t=>document.getElementById("passwordInput").disabled=!t.target.checked),document.getElementById("expirySelect").addEventListener("change",t=>{document.getElementById("customDate").style.display=t.target.value==="custom"?"inline-block":"none",document.getElementById("customDate").disabled=t.target.value!=="custom"}),document.getElementById("clearFilesBtn").addEventListener("click",()=>{p.files=[],B()}),document.getElementById("shareBtn").addEventListener("click",async()=>{const t=document.getElementById("passwordCheck").checked?document.getElementById("passwordInput").value:"",s=document.getElementById("expirySelect"),i=s.value==="custom"?-1:s.value==="never"?0:parseInt(s.value),a=i===-1?new Date(document.getElementById("customDate").value).toISOString():"",o=_();try{const r=await y.shareFiles(p.files,t,i,a,document.getElementById("descriptionInput").value,(l,c,d)=>{j(l,c,d)});o.remove(),H(r.url)}catch(r){o.remove(),alert(r.message)}})}function k(e){for(const n of e)n.relPath||(n.relPath=n.name),p.files.find(t=>t.relPath===n.relPath)||p.files.push(n);B()}async function A(e){const n=[],t=async(s,i)=>{if(s.isFile){const a=await new Promise((o,r)=>s.file(o,r));a.relPath=i+a.name,n.push(a)}else if(s.isDirectory){const a=s.createReader();let o;do{o=await new Promise((r,l)=>a.readEntries(r,l));for(const r of o)await t(r,i+s.name+"/")}while(o.length>0)}};for(const s of e)await t(s,"");return n}function L(e){if(e===0)return"0 B";const n=1024,t=["B","KB","MB","GB"],s=Math.floor(Math.log(e)/Math.log(n));return parseFloat((e/Math.pow(n,s)).toFixed(1))+" "+t[s]}function B(){F(p.descriptionEnabled,p.files.length);const e=p.files.length,n=document.getElementById("fileBadge"),t=document.getElementById("badgeCount"),s=document.getElementById("fileBadgeText"),i=document.getElementById("filesContainer"),a=document.getElementById("shareBtn");if(e===0){n&&(n.style.visibility="hidden"),a&&(a.disabled=!0),["passwordCheck","expirySelect"].forEach(o=>{const r=document.getElementById(o);r&&(r.disabled=!0)});return}n&&(n.style.visibility="visible"),t&&(t.textContent=e),s&&(s.textContent=`${e} file${e!==1?"s":""} selected`),a&&(a.disabled=!1),["passwordCheck","expirySelect"].forEach(o=>{const r=document.getElementById(o);r&&(r.disabled=!1)}),i&&(i.innerHTML=p.files.map((o,r)=>`
            <div class="file-item">
                <i class="fas fa-file"></i>
                <span class="file-name">${o.relPath||o.name}</span>
                <span class="file-size">${L(o.size)}</span>
                <button class="file-remove" onclick="window.removeFile(${r})"><i class="fas fa-times"></i></button>
            </div>
        `).join(""))}window.removeFile=e=>{p.files.splice(e,1),B()};function _(){const e=document.createElement("div");return e.className="upload-overlay",e.id="uploadOverlay",e.innerHTML=`
        <div class="upload-progress-card">
            <h3 class="upload-progress-title">Uploading Files</h3>
            <p class="upload-progress-subtitle">Transferring to Therefore\u2122</p>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="uploadProgressFill" style="width: 0%;"></div>
            </div>
            <div class="upload-progress-text" id="uploadProgressText">0% \u2022 0 B / 0 B</div>
        </div>
    `,document.body.appendChild(e),e}function j(e,n,t){const s=document.getElementById("uploadProgressFill"),i=document.getElementById("uploadProgressText"),a=document.querySelector(".upload-progress-subtitle");s&&(s.style.width=`${e}%`),i&&(i.textContent=`${e}% \u2022 ${L(n)} / ${L(t)}`),a&&e===100&&(a.textContent="Processing at Therefore\u2122...")}function H(e){const n=document.createElement("div");n.className="share-dialog",n.innerHTML=`
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
    `,document.body.appendChild(n);const t=document.getElementById("copyUrlBtn");t.addEventListener("click",()=>{navigator.clipboard.writeText(e);const s=t.innerHTML;t.innerHTML='<i class="fas fa-check"></i> Copied!',setTimeout(()=>t.innerHTML=s,2e3)})}function q(){var t;const e=document.getElementById("fileBadge"),n=document.getElementById("fileDrawer");e==null||e.addEventListener("click",()=>n.classList.toggle("open")),(t=document.getElementById("closeDrawer"))==null||t.addEventListener("click",()=>n.classList.remove("open"))}O();
