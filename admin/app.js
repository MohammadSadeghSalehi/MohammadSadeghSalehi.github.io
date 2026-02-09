let fileHandle;
let siteData = {};
let quillInstances = []; // Track editors to update data on save/change

const openBtn = document.getElementById('open-btn');
const saveBtn = document.getElementById('save-btn');
const editorArea = document.getElementById('editor-area');
const contentForms = document.getElementById('content-forms');
const tabBtns = document.querySelectorAll('.tab-btn');

openBtn.addEventListener('click', async () => {
    try {
        [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'JS Data File',
                accept: { 'text/javascript': ['.js'] }
            }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();

        // Remove "const SITE_DATA = " and trailing ";"
        // Handle potential newlines or spaces
        let jsonStr = text.trim();
        if (jsonStr.startsWith('const SITE_DATA =')) {
            jsonStr = jsonStr.replace(/^const SITE_DATA\s*=\s*/, '');
        }
        if (jsonStr.endsWith(';')) {
            jsonStr = jsonStr.slice(0, -1);
        }

        siteData = JSON.parse(jsonStr);

        initEditor();
        editorArea.classList.remove('hidden');
        saveBtn.disabled = false;
        showStatus('File loaded successfully', 'success');
    } catch (err) {
        console.error(err);
        showStatus('Failed to open file: ' + err.message, 'error');
    }
});

saveBtn.addEventListener('click', async () => {
    if (!fileHandle) return;
    try {
        // Sync all Quill instances content back to siteData
        // (already handled by listeners but good to be safe if we added manual sync later)

        const writable = await fileHandle.createWritable();
        const jsonStr = JSON.stringify(siteData, null, 2);
        const jsContent = `const SITE_DATA = ${jsonStr};`;

        await writable.write(jsContent);
        await writable.close();
        showStatus('Changes saved!', 'success');
    } catch (err) {
        console.error(err);
        showStatus('Failed to save changes: ' + err.message, 'error');
    }
});

function initEditor() {
    quillInstances = []; // Reset instances
    renderTabs();
    setupTabSwitching();
}

function renderTabs() {
    contentForms.innerHTML = ''; // Clear previous

    // Profile Tab
    createTabPane('profile', createProfileForm());

    // Bio Tab - RICH TEXT
    createTabPane('biography', createRichTextForm('biography', 'Biography'));

    // Interests
    createTabPane('interests', createSimpleArrayForm('interests', 'Interest'));

    // Education
    createTabPane('education', createObjectArrayForm('education', [
        { key: 'degree', label: 'Degree' },
        { key: 'institution', label: 'Institution' },
        { key: 'period', label: 'Period' }
    ]));

    // News - RICH TEXT for Description
    createTabPane('news', createObjectArrayForm('news', [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Title (supports simple HTML like links)' },
        { key: 'description', label: 'Description', type: 'richtext' }
    ]));

    // Projects - RICH TEXT for Description/Title
    createTabPane('projects', createObjectArrayForm('projects', [
        { key: 'title', label: 'Title (supports links like <a href="...">...</a>)' },
        { key: 'supervisors', label: 'Supervisors' },
        { key: 'partnership', label: 'Partnership' },
        { key: 'link', label: 'Link' },
        { key: 'description', label: 'Description', type: 'richtext' } // Optional description field if needed
    ]));

    // Publications
    createTabPane('publications', createObjectArrayForm('publications', [
        { key: 'title', label: 'Title' },
        { key: 'authors', label: 'Authors' },
        { key: 'year', label: 'Year' },
        { key: 'links', label: 'Links (JSON format)', type: 'textarea' } // Keeping simple for now
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

    // Theme
    createTabPane('theme', createThemeForm());
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

// --- Form Generators ---

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

// --- Quill Helper ---
function initQuill(container, initialContent, callback) {
    // Basic toolbar configuration
    const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']                                         // remove formatting button
    ];

    const quill = new Quill(container, {
        theme: 'snow',
        modules: {
            toolbar: toolbarOptions
        }
    });

    // Set initial content
    if (initialContent) {
        quill.root.innerHTML = initialContent;
    }

    // Listener
    quill.on('text-change', () => {
        const html = quill.root.innerHTML;
        callback(html);
    });

    quillInstances.push(quill);
    return quill;
}

function createRichTextForm(key, label) {
    const container = document.createElement('div');
    const group = document.createElement('div');
    group.className = 'form-group';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    group.appendChild(labelEl);

    // Quill container
    const editorDiv = document.createElement('div');
    editorDiv.style.height = '200px';
    group.appendChild(editorDiv);

    container.appendChild(group);

    // Init Quill after appending to DOM is safer, but here we depend on it being in the flow
    // We put it in a timeout to ensure it renders correctly if hidden initially (tabs)
    setTimeout(() => {
        initQuill(editorDiv, siteData[key] || '', (html) => {
            siteData[key] = html;
        });
    }, 0);

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

    window.updateSimpleArray = (k, i, v) => siteData[k][i] = v;
    window.removeSimpleArrayItem = (k, i) => {
        siteData[k].splice(i, 1);
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

            let header = `<div class="array-header"><strong>Item ${index + 1}</strong> <button class="btn danger" onclick="removeObjectArrayItem('${key}', ${index})">Remove</button></div>`;
            itemDiv.innerHTML = header;

            fields.forEach(f => {
                const val = item[f.key] || '';
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';

                const label = document.createElement('label');
                label.textContent = f.label;
                formGroup.appendChild(label);

                if (f.type === 'richtext') {
                    const editorContainer = document.createElement('div');
                    formGroup.appendChild(editorContainer);
                    itemDiv.appendChild(formGroup);

                    setTimeout(() => {
                        initQuill(editorContainer, val, (html) => {
                            siteData[key][index][f.key] = html;
                        });
                    }, 0);

                } else if (f.type === 'textarea') {
                    const textarea = document.createElement('textarea');
                    textarea.value = typeof val === 'object' ? JSON.stringify(val) : val;
                    textarea.onchange = (e) => {
                        // Special handling for links (JSON)
                        if (f.key === 'links') {
                            try {
                                siteData[key][index][f.key] = JSON.parse(e.target.value);
                            } catch (err) {
                                console.error("Invalid JSON");
                            }
                        } else {
                            siteData[key][index][f.key] = e.target.value;
                        }
                    };
                    formGroup.appendChild(textarea);
                    itemDiv.appendChild(formGroup);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = val;
                    input.onchange = (e) => {
                        siteData[key][index][f.key] = e.target.value;
                    };
                    formGroup.appendChild(input);
                    itemDiv.appendChild(formGroup);
                }
            });

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

    window.removeObjectArrayItem = (k, i) => {
        siteData[k].splice(i, 1);
        render();
    };

    render();
    return container;
}

function createThemeForm() {
    const container = document.createElement('div');
    if (!siteData.theme) siteData.theme = {};

    const fields = [
        { key: 'primaryColor', label: 'Primary Color (Accent)', type: 'color' },
        { key: 'secondaryColor', label: 'Secondary Color (Gradient)', type: 'color' },
        { key: 'backgroundColor', label: 'Background Color', type: 'color' },
        { key: 'textColor', label: 'Text Color', type: 'color' },
        { key: 'sidebarColor', label: 'Sidebar Background (RGBA for transparency)', type: 'text' }
    ];

    fields.forEach(f => {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = f.label;
        group.appendChild(label);

        const input = document.createElement('input');
        input.type = f.type;
        input.value = siteData.theme[f.key] || '#000000';
        // For text inputs or missing defaults
        if (f.type === 'text' && !siteData.theme[f.key]) input.value = '';

        input.onchange = (e) => {
            siteData.theme[f.key] = e.target.value;
        };
        group.appendChild(input);
        container.appendChild(group);
    });

    return container;
}

function showStatus(msg, type) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.className = `status-msg ${type}`;
    setTimeout(() => el.style.display = 'none', 3000);
}
