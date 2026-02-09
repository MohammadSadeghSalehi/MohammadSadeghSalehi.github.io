let fileHandle;
let siteData = {};

const openBtn = document.getElementById('open-btn');
const saveBtn = document.getElementById('save-btn');
const editorArea = document.getElementById('editor-area');
const contentForms = document.getElementById('content-forms');
const tabBtns = document.querySelectorAll('.tab-btn');

openBtn.addEventListener('click', async () => {
    try {
        [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] }
            }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        siteData = JSON.parse(text);

        initEditor();
        editorArea.classList.remove('hidden');
        saveBtn.disabled = false;
        showStatus('File loaded successfully', 'success');
    } catch (err) {
        console.error(err);
        showStatus('Failed to open file', 'error');
    }
});

saveBtn.addEventListener('click', async () => {
    if (!fileHandle) return;
    try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(siteData, null, 2));
        await writable.close();
        showStatus('Changes saved!', 'success');
    } catch (err) {
        console.error(err);
        showStatus('Failed to save changes', 'error');
    }
});

function initEditor() {
    renderTabs();
    setupTabSwitching();
}

function renderTabs() {
    contentForms.innerHTML = ''; // Clear previous

    // Profile Tab
    createTabPane('profile', createProfileForm());

    // Bio Tab
    createTabPane('biography', createTextareaForm('biography', 'Biography'));

    // Interests
    createTabPane('interests', createSimpleArrayForm('interests', 'Interest'));

    // Education
    createTabPane('education', createObjectArrayForm('education', [
        { key: 'degree', label: 'Degree' },
        { key: 'institution', label: 'Institution' },
        { key: 'period', label: 'Period' }
    ]));

    // News
    createTabPane('news', createObjectArrayForm('news', [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', type: 'textarea' }
    ]));

    // Projects
    createTabPane('projects', createObjectArrayForm('projects', [
        { key: 'title', label: 'Title' },
        { key: 'supervisors', label: 'Supervisors' },
        { key: 'partnership', label: 'Partnership' },
        { key: 'link', label: 'Link' }
    ]));

    // Publications
    createTabPane('publications', createObjectArrayForm('publications', [
        { key: 'title', label: 'Title' },
        { key: 'authors', label: 'Authors' },
        { key: 'year', label: 'Year' },
        // Simple link handler for now
        { key: 'id', label: 'ID' }
    ]));

    // Talks
    createTabPane('talks', createObjectArrayForm('talks', [
        { key: 'title', label: 'Title' },
        { key: 'event', label: 'Event' }
    ]));

    // Teaching
    createTabPane('teaching', createObjectArrayForm('teaching', [
        { key: 'role', label: 'Role' },
        { key: 'course', label: 'Course' },
        { key: 'period', label: 'Period' },
        { key: 'institution', label: 'Institution' }
    ]));
}

function createTabPane(id, content) {
    const pane = document.createElement('div');
    pane.className = `tab-pane ${id === 'profile' ? 'active' : ''}`;
    pane.id = `${id}-pane`;
    pane.appendChild(content);
    contentForms.appendChild(pane);
}

function setupTabSwitching() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-pane`).classList.add('active');
        });
    });
}

// Form Generators

function createProfileForm() {
    const container = document.createElement('div');
    const fields = ['name', 'role', 'email', 'location', 'image'];

    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label>${field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input type="text" value="${siteData.profile[field] || ''}" onchange="updateProfileField('${field}', this.value)">
        `;
        container.appendChild(group);
    });
    return container;
}

window.updateProfileField = (field, value) => {
    siteData.profile[field] = value;
};

function createTextareaForm(key, label) {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="form-group">
            <label>${label}</label>
            <textarea onchange="siteData['${key}'] = this.value">${siteData[key] || ''}</textarea>
        </div>
    `;
    return container;
}

function createSimpleArrayForm(key, itemLabel) {
    const container = document.createElement('div');
    const list = document.createElement('div');

    const render = () => {
        list.innerHTML = '';
        (siteData[key] || []).forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'form-group';
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.innerHTML = `
                <input type="text" value="${item}" onchange="updateSimpleArray('${key}', ${index}, this.value)">
                <button class="btn danger" onclick="removeSimpleArrayItem('${key}', ${index}, this)">X</button>
            `;
            list.appendChild(row);
        });
    };

    const addBtn = document.createElement('button');
    addBtn.className = 'btn primary';
    addBtn.textContent = `Add ${itemLabel}`;
    addBtn.onclick = () => {
        if (!siteData[key]) siteData[key] = [];
        siteData[key].push('');
        render();
    };

    container.appendChild(list);
    container.appendChild(addBtn);

    // Bind global helpers
    window.updateSimpleArray = (k, i, v) => siteData[k][i] = v;
    window.removeSimpleArrayItem = (k, i) => {
        siteData[k].splice(i, 1);
        // re-render needed to fix indices
        // Ideally we'd have a better framework but this works for simple cases
        // Re-triggering tab click to refresh (lazy hack)
        document.querySelector(`.tab-btn[data-tab="${k}"]`).click();
    };

    render();
    return container;
}

function createObjectArrayForm(key, fields) {
    const container = document.createElement('div');

    const render = () => {
        container.innerHTML = '';
        (siteData[key] || []).forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'array-item';

            let html = `<div class="array-header"><strong>Item ${index + 1}</strong> <button class="btn danger" onclick="removeObjectArrayItem('${key}', ${index})">Remove</button></div>`;

            fields.forEach(f => {
                const val = item[f.key] || '';
                if (f.type === 'textarea') {
                    html += `<div class="form-group"><label>${f.label}</label><textarea onchange="updateObjectArray('${key}', ${index}, '${f.key}', this.value)">${val}</textarea></div>`;
                } else {
                    html += `<div class="form-group"><label>${f.label}</label><input type="text" value="${val}" onchange="updateObjectArray('${key}', ${index}, '${f.key}', this.value)"></div>`;
                }
            });
            itemDiv.innerHTML = html;
            container.appendChild(itemDiv);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn primary';
        addBtn.textContent = 'Add Item';
        addBtn.onclick = () => {
            if (!siteData[key]) siteData[key] = [];
            siteData[key].push({});
            render();
        };
        container.appendChild(addBtn);
    };

    // Bind helpers
    window.updateObjectArray = (k, i, field, v) => siteData[k][i][field] = v;
    window.removeObjectArrayItem = (k, i) => {
        siteData[k].splice(i, 1);
        render(); // re-render immediate
    };

    render();
    return container;
}

function showStatus(msg, type) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = `status-msg ${type}`;
    setTimeout(() => el.style.display = 'none', 3000);
}
