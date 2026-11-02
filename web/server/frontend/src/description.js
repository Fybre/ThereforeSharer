// Shared description controls used by the desktop and web frontends.
export function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

export const descriptionSettingsMarkup = `
    <div class="form-group description-settings" id="descriptionSettings">
        <label><input type="checkbox" id="descriptionEnabled"> Use a text field for the description / filename</label>
        <div id="descriptionMapping" hidden>
            <label for="descriptionField">Save the description to</label>
            <select class="select" id="descriptionField" style="width:100%"></select>
        </div>
        <small class="description-hint" id="descriptionStatus" role="status"></small>
        <button type="button" class="btn btn-secondary" id="retryDescriptionFields" hidden>Retry loading fields</button>
    </div>`;

export const descriptionInputMarkup = `
    <div class="description-option" id="descriptionOption" hidden>
        <label for="descriptionInput">Description / filename</label>
        <input type="text" class="input" id="descriptionInput" placeholder="Use uploaded filename" disabled>
        <small class="description-hint">Optional. Leave blank to use the uploaded ZIP filename.</small>
    </div>`;

export function showDescriptionInput(enabled, fileCount) {
    const option = document.getElementById('descriptionOption');
    const input = document.getElementById('descriptionInput');
    if (!option || !input) return;
    option.hidden = !enabled;
    input.disabled = !enabled || fileCount === 0;
    if (fileCount === 0) input.value = '';
}

export function setupDescriptionSettings(savedFieldNo, fetchFields) {
    const category = document.getElementById('categorySelect');
    const enabled = document.getElementById('descriptionEnabled');
    const mapping = document.getElementById('descriptionMapping');
    const select = document.getElementById('descriptionField');
    const status = document.getElementById('descriptionStatus');
    const retry = document.getElementById('retryDescriptionFields');
    let generation = 0;
    let ready = false;
    let selectedCategory = Number(category.value);
    enabled.checked = savedFieldNo > 0;
    const update = () => { mapping.hidden = !enabled.checked; };
    enabled.addEventListener('change', update);
    async function load(fieldNo = 0) {
        const request = ++generation;
        ready = false;
        select.replaceChildren();
        select.disabled = true;
        retry.hidden = true;
        status.textContent = 'Checking category text fields…';
        update();
        if (!Number(category.value)) {
            enabled.checked = false;
            enabled.disabled = true;
            status.textContent = 'Select a category to check for text fields.';
            update();
            return;
        }
        enabled.disabled = false;
        try {
            const fields = await fetchFields(Number(category.value));
            if (request !== generation || !select.isConnected) return;
            for (const field of fields) {
                const option = new Option(field.caption, String(field.fieldNo));
                select.add(option);
            }
            if (fieldNo && fields.some(f => f.fieldNo === fieldNo)) select.value = String(fieldNo);
            else if (fieldNo) enabled.checked = false;
            ready = true;
            select.disabled = fields.length === 0;
            enabled.disabled = fields.length === 0;
            if (!fields.length) enabled.checked = false;
            status.textContent = fields.length
                ? (fieldNo && !fields.some(f => f.fieldNo === fieldNo)
                    ? 'The saved field is unavailable. Choose a text field to use instead.'
                    : 'Text fields found. Use one for a description / filename when sharing?')
                : 'No editable text fields found in this category.';
            update();
        } catch (error) {
            if (request !== generation || !select.isConnected) return;
            status.textContent = 'Could not load text fields: ' + (error?.message || String(error));
            retry.hidden = false;
        }
    }
    category.addEventListener('change', () => {
        const sameCategory = selectedCategory === Number(category.value);
        const fieldNo = sameCategory ? Number(select.value) : 0;
        if (!sameCategory) enabled.checked = false;
        selectedCategory = Number(category.value);
        load(fieldNo);
    });
    // A different server/tenant must never retain the old category's mapping.
    ['baseURL', 'tenantName'].forEach(id => document.getElementById(id).addEventListener('change', () => {
        enabled.checked = false;
        load();
    }));
    retry.addEventListener('click', () => load(savedFieldNo));
    load(savedFieldNo);
    return () => {
        if (!enabled.checked) return 0;
        if (!ready || !Number(select.value)) throw new Error('Wait for the text fields to load, or turn off the description field.');
        return Number(select.value);
    };
}

export function connectionRequest() {
    return {
        baseURL: document.getElementById('baseURL').value.trim(),
        tenantName: document.getElementById('tenantName').value.trim(),
        authType: document.querySelector('.auth-tab.active').dataset.type,
        username: document.getElementById('username')?.value.trim() || '',
        password: document.getElementById('password')?.value || '',
        token: document.getElementById('token')?.value.trim() || ''
    };
}
