// js/admin.js

const listView = document.getElementById('list-view');
const editorView = document.getElementById('editor-view');
const tbody = document.getElementById('question-list-body');

let currentScene = null;
let currentObjects = [];
let selectedObjectId = null;

// Original dimensions of the uploaded image
let originalImageWidth = 0;
let originalImageHeight = 0;

// Current displayed dimensions of the image in the workspace (for coordinate conversion)
let displayScaleX = 1;
let displayScaleY = 1;

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.scenes === 'undefined') {
        try {
            const res = await fetch('data/scenes.json?v=' + Date.now());
            window.scenes = await res.json();
        } catch(e) {
            console.error("Failed to load JSON data:", e);
        }
    }
    if (typeof window.zones === 'undefined') {
        try {
            const res = await fetch('data/zones.json?v=' + Date.now());
            if (res.ok) window.zones = await res.json();
        } catch(e) {
            console.error("Failed to load levels data:", e);
        }
    }
    if (typeof window.questionSets === 'undefined') {
        try {
            const res = await fetch('data/question_sets.json?v=' + Date.now());
            if (res.ok) window.questionSets = await res.json();
        } catch(e) {
            console.error("Failed to load question sets data:", e);
        }
    }
    
    
    if(document.getElementById('search-questions')) {
        document.getElementById('search-questions').addEventListener('input', renderList);
    }
    if(document.getElementById('sort-questions')) {
        document.getElementById('sort-questions').addEventListener('change', renderList);
    }
    if(document.getElementById('filter-zone')) {
        document.getElementById('filter-zone').addEventListener('change', renderList);
    }
    if(document.getElementById('search-zones')) {
        document.getElementById('search-zones').addEventListener('input', renderLevelsList);
    }
    
    populateFilterZoneDropdown();
    renderList();
});

function populateFilterZoneDropdown() {
    const select = document.getElementById('filter-zone');
    if (!select) return;
    select.innerHTML = '<option value="">All Zones</option>';
    const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    lvls.forEach(region => {
        const opt = document.createElement('option');
        opt.value = region.id;
        opt.innerText = region.name;
        select.appendChild(opt);
    });
}

function generateId(prefix) {
    return prefix + '_' + Math.random().toString(36).substr(2, 6);
}

async function uploadImageToServer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(event) {
            const dataUrl = event.target.result;
            try {
                const res = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name, data: dataUrl })
                });
                const json = await res.json();
                if (json.status === 'success') {
                    resolve(json.path);
                } else {
                    reject(json.message);
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.readAsDataURL(file);
    });
}

// =====================================
// LIST VIEW
// =====================================
function renderList() {
    listView.classList.remove('hidden');
    editorView.classList.add('hidden');
    tbody.innerHTML = '';
    
    let qs = SceneStorage.getScenes();
    const searchVal = (document.getElementById('search-questions') ? document.getElementById('search-questions').value.toLowerCase() : '');
    const sortVal = (document.getElementById('sort-questions') ? document.getElementById('sort-questions').value : '');
    const zoneFilterVal = (document.getElementById('filter-zone') ? document.getElementById('filter-zone').value : '');
    
    if (searchVal) {
        qs = qs.filter(q => (q.id && q.id.toLowerCase().includes(searchVal)) || (q.name && q.name.toLowerCase().includes(searchVal)));
    }
    
    if (zoneFilterVal) {
        qs = qs.filter(q => getCurrentRegionForScene(q.id) === zoneFilterVal);
    }
    
    if (sortVal === 'name_asc') {
        qs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortVal === 'name_desc') {
        qs.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortVal === 'diff_asc') {
        qs.sort((a, b) => (a.difficulty || '').localeCompare(b.difficulty || ''));
    } else if (sortVal === 'diff_desc') {
        qs.sort((a, b) => (b.difficulty || '').localeCompare(a.difficulty || ''));
    }
    
    // Calculate total vocabs
    const totalVocabs = qs.reduce((sum, q) => sum + (q.objects?.length || 0), 0);
    const totalEl = document.getElementById('total-vocabs-count');
    if (totalEl) {
        totalEl.innerText = `(Total: ${totalVocabs})`;
    }
    
    qs.forEach((q, index) => {
        const zoneId = getCurrentRegionForScene(q.id);
        const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
        const region = lvls.find(r => r.id === zoneId);
        const zoneName = region ? region.name : 'Unassigned';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${q.name}</strong></td>
            <td>${q.objects?.length || 0} words</td>
            <td>${q.difficulty || 'Easy'}</td>
            <td>${zoneName}</td>
            <td>
                <button class="btn secondary btn-sm" onclick="editScene('${q.id}')">Edit</button>
                <button class="btn secondary btn-sm" onclick="duplicateScene('${q.id}')">Duplicate</button>
                <button class="btn danger btn-sm" onclick="deleteScene('${q.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-new-question').addEventListener('click', () => {
    currentScene = {
        id: generateId('scene'),
        name: '',
        difficulty: 'Easy',
        image: '',
        originalWidth: 0,
        originalHeight: 0,
        objects: []
    };
    currentObjects = [];
    openEditor();
});

window.editScene = (id) => {
    currentScene = JSON.parse(JSON.stringify(SceneStorage.getScene(id))); // Deep copy
    currentObjects = currentScene.objects || [];

    openEditor();
};

window.duplicateScene = (id) => {
    const q = JSON.parse(JSON.stringify(SceneStorage.getScene(id))); // Deep copy
    q.id = generateId('scene');
    SceneStorage.saveScene(q);
    renderList();
};

window.deleteScene = (id) => {
    if (confirm('Are you sure you want to delete this scene?')) {
        SceneStorage.deleteScene(id);
        renderList();
    }
};

// =====================================
// EDITOR VIEW
// =====================================
function openEditor() {
    listView.classList.add('hidden');
    editorView.classList.remove('hidden');
    selectedObjectId = null;

    document.getElementById('edit-id').value = currentScene.id;
    document.getElementById('edit-scene-name').value = currentScene.name;

    document.getElementById('edit-difficulty').value = currentScene.difficulty || 'Easy';
    document.getElementById('edit-disable-spelling').checked = currentScene.disableSpelling === true;
    
    // Populate Question Set Dropdown
    const qsetSelect = document.getElementById('edit-question-set');
    // Keep the first two static options
    while (qsetSelect.options.length > 2) {
        qsetSelect.remove(2);
    }
    const sets = typeof QuestionSetStorage !== 'undefined' ? QuestionSetStorage.getSets() : [];
    sets.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.text = s.name;
        qsetSelect.add(opt);
    });
    qsetSelect.value = currentScene.questionSetId || '';
    
    populateRegionDropdown();
    document.getElementById('edit-scene-region').value = currentScene.id ? getCurrentRegionForScene(currentScene.id) : '';
    
    const thumbPreview = document.getElementById('edit-scene-thumbnail-preview');
    const thumbRemove = document.getElementById('btn-remove-thumbnail');
    if (currentScene.thumbnail) {
        thumbPreview.src = currentScene.thumbnail;
        thumbPreview.style.display = 'block';
        thumbRemove.classList.remove('hidden');
    } else {
        thumbPreview.src = '';
        thumbPreview.style.display = 'none';
        thumbRemove.classList.add('hidden');
    }
    // Type and subquestions removed as per new architecture
    const imgEl = document.getElementById('edit-scene-image');
    const removeImgBtn = document.getElementById('btn-remove-image');
    if (currentScene.image) {
        imgEl.src = currentScene.image;
        originalImageWidth = currentScene.originalWidth || 1200;
        originalImageHeight = currentScene.originalHeight || 800;
        document.getElementById('image-info').innerText = `Loaded (${originalImageWidth}x${originalImageHeight})`;
        if(removeImgBtn) removeImgBtn.classList.remove('hidden');
        
        imgEl.onload = () => {
            updateScale();
            renderHotspots();
        };
    } else {
        imgEl.src = '';
        document.getElementById('image-info').innerText = 'No image selected';
        document.getElementById('edit-hotspots-container').innerHTML = '';
        if(removeImgBtn) removeImgBtn.classList.add('hidden');
    }
    
    renderObjectsList();
}

document.getElementById('btn-cancel').addEventListener('click', renderList);

// Removed subQuestions logic

// -- IMAGE UPLOAD --
document.getElementById('btn-upload').addEventListener('click', () => {
    document.getElementById('image-upload').click();
});

document.getElementById('image-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const path = await uploadImageToServer(file);
        currentScene.image = path;
        
        const img = new Image();
        img.onload = function() {
            originalImageWidth = img.width;
            originalImageHeight = img.height;
            currentScene.originalWidth = img.width;
            currentScene.originalHeight = img.height;
            
            document.getElementById('image-info').innerText = `${file.name} (${img.width}x${img.height})`;
            
            const imgEl = document.getElementById('edit-scene-image');
            imgEl.src = path;
            imgEl.onload = () => {
                updateScale();
                renderHotspots();
            };
        };
        img.src = path;
        
        const removeImgBtn = document.getElementById('btn-remove-image');
        if(removeImgBtn) removeImgBtn.classList.remove('hidden');
    } catch(err) {
        alert("Upload failed: " + err);
    }
});

const removeImgBtn = document.getElementById('btn-remove-image');
if (removeImgBtn) {
    removeImgBtn.addEventListener('click', () => {
        currentScene.image = '';
        currentScene.originalWidth = 0;
        currentScene.originalHeight = 0;
        
        const imgEl = document.getElementById('edit-scene-image');
        imgEl.src = '';
        document.getElementById('image-info').innerText = 'No image selected';
        document.getElementById('edit-hotspots-container').innerHTML = '';
        removeImgBtn.classList.add('hidden');
    });
}

document.getElementById('btn-upload-thumbnail').addEventListener('click', () => {
    document.getElementById('thumbnail-upload').click();
});

document.getElementById('thumbnail-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const path = await uploadImageToServer(file);
        currentScene.thumbnail = path;
        const thumbPreview = document.getElementById('edit-scene-thumbnail-preview');
        thumbPreview.src = path;
        thumbPreview.style.display = 'block';
        document.getElementById('btn-remove-thumbnail').classList.remove('hidden');
    } catch(err) {
        alert("Upload failed: " + err);
    }
});

document.getElementById('btn-remove-thumbnail').addEventListener('click', () => {
    currentScene.thumbnail = null;
    document.getElementById('edit-scene-thumbnail-preview').style.display = 'none';
    document.getElementById('btn-remove-thumbnail').classList.add('hidden');
});

window.addEventListener('resize', () => {
    if (!editorView.classList.contains('hidden')) {
        updateScale();
        renderHotspots();
    }
});

function updateScale() {
    const imgEl = document.getElementById('edit-scene-image');
    if (!imgEl.src || !originalImageWidth) return;
    
    const rect = imgEl.getBoundingClientRect();
    displayScaleX = originalImageWidth / rect.width;
    displayScaleY = originalImageHeight / rect.height;
    
    const container = document.getElementById('edit-hotspots-container');
    container.style.width = rect.width + 'px';
    container.style.height = rect.height + 'px';
    
    const workspace = document.getElementById('editor-workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    container.style.left = (rect.left - workspaceRect.left) + 'px';
    container.style.top = (rect.top - workspaceRect.top) + 'px';
}

// -- HOTSPOTS RENDER & INTERACTION --
function renderHotspots() {
    const container = document.getElementById('edit-hotspots-container');
    container.innerHTML = '';
    
    currentObjects.forEach(obj => {
        const el = document.createElement('div');
        el.className = 'admin-hotspot' + (obj.id === selectedObjectId ? ' selected' : '');
        
        const screenX = obj.x / displayScaleX;
        const screenY = obj.y / displayScaleY;
        const screenW = obj.width / displayScaleX;
        const screenH = obj.height / displayScaleY;
        
        el.style.left = screenX + 'px';
        el.style.top = screenY + 'px';
        el.style.width = screenW + 'px';
        el.style.height = screenH + 'px';
        
        const label = document.createElement('div');
        label.className = 'label';
        label.innerText = obj.name;
        el.appendChild(label);
        
        if (obj.id === selectedObjectId) {
            ['nw', 'ne', 'sw', 'se'].forEach(pos => {
                const h = document.createElement('div');
                h.className = `resize-handle ${pos}`;
                h.dataset.pos = pos;
                el.appendChild(h);
            });
        }
        
        el.addEventListener('mousedown', (e) => startInteraction(e, obj));
        container.appendChild(el);
    });
}

document.getElementById('btn-add-object').addEventListener('click', () => {
    const newObj = {
        id: generateId('obj'),
        name: 'New Object',
        x: originalImageWidth / 2 - 50,
        y: originalImageHeight / 2 - 50,
        width: 100,
        height: 100
    };
    currentObjects.push(newObj);
    selectedObjectId = newObj.id;
    renderObjectsList();
    renderHotspots();
    updatePropertiesPanel();
});

function renderObjectsList() {
    const list = document.getElementById('objects-list');
    list.innerHTML = '';
    currentObjects.forEach(obj => {
        const div = document.createElement('div');
        div.className = 'object-item' + (obj.id === selectedObjectId ? ' selected' : '');
        
        const nameSpan = document.createElement('span');
        
        let thumbHtml = '';
        if (obj.image) {
            thumbHtml = `<img src="${obj.image}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px; margin-right: 10px; vertical-align: middle;">`;
        }
        
        nameSpan.innerHTML = `${thumbHtml}<strong>${obj.name}</strong> <br><small style="color: #666;">(X:${Math.round(obj.x)}, Y:${Math.round(obj.y)})</small>`;
        
        div.appendChild(nameSpan);
        
        div.onclick = () => {
            selectedObjectId = obj.id;
            renderObjectsList();
            renderHotspots();
            updatePropertiesPanel();
        };
        list.appendChild(div);
    });
}

function updatePropertiesPanel() {
    const panel = document.getElementById('hotspot-properties');
    if (!selectedObjectId) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    const obj = currentObjects.find(o => o.id === selectedObjectId);
    
    document.getElementById('prop-name').value = obj.name;
    document.getElementById('prop-x').value = Math.round(obj.x);
    document.getElementById('prop-y').value = Math.round(obj.y);
    document.getElementById('prop-w').value = Math.round(obj.width);
    document.getElementById('prop-h').value = Math.round(obj.height);
    
    const preview = document.getElementById('prop-thumbnail-preview');
    if (obj.image) {
        preview.src = obj.image;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }
}

// Thumbnail Upload Event Listeners
document.getElementById('btn-prop-upload-thumb').addEventListener('click', () => {
    if (!selectedObjectId) return;
    document.getElementById('prop-thumbnail-upload').click();
});

document.getElementById('prop-thumbnail-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedObjectId) return;
    try {
        const path = await uploadImageToServer(file);
        const obj = currentObjects.find(o => o.id === selectedObjectId);
        if (obj) {
            obj.image = path;
            updatePropertiesPanel();
            
            // Auto-save the scene to prevent data loss if user forgets to click Save
            if (currentScene) {
                currentScene.objects = currentObjects;
                SceneStorage.saveScene(currentScene);
            }
        }
    } catch(err) {
        alert("Upload failed: " + err);
    }
});

document.getElementById('prop-name').addEventListener('input', (e) => {
    const obj = currentObjects.find(o => o.id === selectedObjectId);
    if(obj) {
        obj.name = e.target.value;
    }
    renderObjectsList();
    renderHotspots();
});

['x','y','w','h'].forEach(prop => {
    document.getElementById('prop-' + prop).addEventListener('change', (e) => {
        const obj = currentObjects.find(o => o.id === selectedObjectId);
        if(!obj) return;
        const val = parseInt(e.target.value) || 0;
        if(prop==='x') obj.x = val;
        if(prop==='y') obj.y = val;
        if(prop==='w') obj.width = val;
        if(prop==='h') obj.height = val;
        renderHotspots();
    });
});

document.getElementById('btn-delete-object').addEventListener('click', () => {
    currentObjects = currentObjects.filter(o => o.id !== selectedObjectId);
    selectedObjectId = null;
    renderObjectsList();
    renderHotspots();
    renderSubQuestions();
    updatePropertiesPanel();
});

// -- DRAG AND RESIZE --
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let startX, startY;
let startObjX, startObjY, startObjW, startObjH;

function startInteraction(e, obj) {
    e.preventDefault();
    if (selectedObjectId !== obj.id) {
        selectedObjectId = obj.id;
        renderObjectsList();
        renderHotspots();
        updatePropertiesPanel();
    }

    startX = e.clientX;
    startY = e.clientY;
    startObjX = obj.x;
    startObjY = obj.y;
    startObjW = obj.width;
    startObjH = obj.height;

    if (e.target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = e.target.dataset.pos;
    } else {
        isDragging = true;
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
    const obj = currentObjects.find(o => o.id === selectedObjectId);
    if (!obj) return;

    const deltaX = (e.clientX - startX) * displayScaleX;
    const deltaY = (e.clientY - startY) * displayScaleY;

    if (isDragging) {
        obj.x = startObjX + deltaX;
        obj.y = startObjY + deltaY;
    } else if (isResizing) {
        if (resizeHandle.includes('e')) obj.width = startObjW + deltaX;
        if (resizeHandle.includes('s')) obj.height = startObjH + deltaY;
        if (resizeHandle.includes('w')) { obj.x = startObjX + deltaX; obj.width = startObjW - deltaX; }
        if (resizeHandle.includes('n')) { obj.y = startObjY + deltaY; obj.height = startObjH - deltaY; }
        if(obj.width < 10) obj.width = 10;
        if(obj.height < 10) obj.height = 10;
    }

    renderHotspots();
    updatePropertiesPanel();
}

function onMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// -- SAVE & PREVIEW --
document.getElementById('btn-save').addEventListener('click', () => {
    currentScene.name = document.getElementById('edit-scene-name').value;
    currentScene.difficulty = document.getElementById('edit-difficulty').value;
    currentScene.disableSpelling = document.getElementById('edit-disable-spelling').checked;
    
    currentScene.questionSetId = document.getElementById('edit-question-set').value;
    currentScene.objects = currentObjects;

    if (!currentScene.name.trim()) return alert("Please enter a Scene Name.");
    if (!currentScene.image && currentObjects.length === 0) {
        return alert("Please upload a background image OR add at least one vocabulary.");
    }

    // Always set type to 'lesson'
    currentScene.type = 'lesson';
    
    for (let obj of currentObjects) {
        if (!obj.name.trim()) return alert("A vocabulary word cannot be empty.");
        // Only require bounding box if a main background image exists for the Find It game
        if (currentScene.image && (obj.width === 0 || obj.height === 0)) {
            return alert(`Please draw a bounding box for: "${obj.name}"`);
        }
    }

    SceneStorage.saveScene(currentScene);
    
    // Assign to Zone (Region)
    const selectedRegionId = document.getElementById('edit-scene-region').value;
    const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    
    let originalRegionId = null;
    let originalSubsceneIndex = -1;
    
    // Find original position
    for (let r of lvls) {
        if (r.questions && r.questions.includes(currentScene.id)) {
            originalRegionId = r.id;
            if (r.subScenes) {
                originalSubsceneIndex = r.subScenes.findIndex(s => s.questions && s.questions.includes(currentScene.id));
            }
            break;
        }
    }
    
    if (originalRegionId === selectedRegionId && selectedRegionId) {
        // Just update in-place
        const region = lvls.find(r => r.id === selectedRegionId);
        if (region && region.subScenes && originalSubsceneIndex !== -1) {
            const ss = region.subScenes[originalSubsceneIndex];
            ss.name = currentScene.name;
            ss.difficulty = currentScene.difficulty || 'Easy';
            ss.type = currentScene.type || 'lesson';
            ss.disableSpelling = currentScene.disableSpelling || false;
            ss.image = currentScene.thumbnail || 'images/puppy.png';
        }
    } else {
        // Remove from any existing region
        lvls.forEach(r => {
            if (r.questions) {
                r.questions = r.questions.filter(id => id !== currentScene.id);
            }
            if (r.subScenes) {
                r.subScenes = r.subScenes.filter(s => !(s.questions && s.questions.includes(currentScene.id)));
            }
        });
        
        // Add to selected region
        if (selectedRegionId) {
            const region = lvls.find(r => r.id === selectedRegionId);
            if (region) {
                if (!region.questions) region.questions = [];
                region.questions.push(currentScene.id);
                
                if (!region.subScenes) region.subScenes = [];
                region.subScenes.push({
                    id: 'level_' + currentScene.id,
                    name: currentScene.name,
                    difficulty: currentScene.difficulty || 'Easy',
                    type: currentScene.type || 'lesson',
                    disableSpelling: currentScene.disableSpelling || false,
                    image: currentScene.thumbnail || 'images/puppy.png',
                    questions: [currentScene.id]
                });
            }
        }
    }
    
    if (typeof ZoneStorage !== 'undefined') ZoneStorage.saveZones(lvls);
    
    alert('Scene saved successfully!');
    renderList();
});

document.getElementById('btn-preview').addEventListener('click', () => {
    if(!currentScene.id) return alert('Please Save the scene first.');
    // Force a save to ensure the preview gets the latest data
    document.getElementById('btn-save').click();
    
    setTimeout(() => {
        const frame = document.getElementById('preview-frame');
        frame.src = 'index.html?previewId=' + currentScene.id;
        document.getElementById('preview-overlay').classList.remove('hidden');
    }, 500); // give it a little time to finish the fetch
});

document.getElementById('btn-close-preview').addEventListener('click', () => {
    document.getElementById('preview-frame').src = '';
    document.getElementById('preview-overlay').classList.add('hidden');
});

// =====================================
// TABS & LEVEL MANAGEMENT
// =====================================
document.getElementById('tab-questions').addEventListener('click', () => {
    document.getElementById('tab-questions').className = 'btn primary';
    document.getElementById('tab-qsets').className = 'btn secondary';
    document.getElementById('tab-zones').className = 'btn secondary';
    document.getElementById('questions-section').classList.remove('hidden');
    document.getElementById('qsets-section').classList.add('hidden');
    document.getElementById('levels-section').classList.add('hidden');
    renderList();
});

document.getElementById('tab-qsets').addEventListener('click', () => {
    document.getElementById('tab-questions').className = 'btn secondary';
    document.getElementById('tab-qsets').className = 'btn primary';
    document.getElementById('tab-zones').className = 'btn secondary';
    document.getElementById('questions-section').classList.add('hidden');
    document.getElementById('qsets-section').classList.remove('hidden');
    document.getElementById('levels-section').classList.add('hidden');
    renderQSetsList();
});

document.getElementById('tab-zones').addEventListener('click', () => {
    document.getElementById('tab-questions').className = 'btn secondary';
    document.getElementById('tab-qsets').className = 'btn secondary';
    document.getElementById('tab-zones').className = 'btn primary';
    document.getElementById('questions-section').classList.add('hidden');
    document.getElementById('qsets-section').classList.add('hidden');
    document.getElementById('levels-section').classList.remove('hidden');
    renderLevelsList();
});

// =====================================
// QUESTION SETS MANAGEMENT
// =====================================
let currentQSet = null;

function renderQSetsList() {
    const tbody = document.getElementById('qsets-list');
    tbody.innerHTML = '';
    
    const sets = typeof QuestionSetStorage !== 'undefined' ? QuestionSetStorage.getSets() : [];
    
    sets.forEach((s, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${s.name}</strong></td>
            <td>${s.questions ? s.questions.length : 0} templates</td>
            <td>
                <button class="btn secondary btn-sm" onclick="editQSet('${s.id}')">Edit</button>
                <button class="btn danger btn-sm" onclick="deleteQSet('${s.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-new-qset').addEventListener('click', () => {
    currentQSet = {
        id: generateId('qset'),
        name: '',
        questions: []
    };
    openQSetEditor();
});

window.editQSet = (id) => {
    const sets = typeof QuestionSetStorage !== 'undefined' ? QuestionSetStorage.getSets() : [];
    const s = sets.find(x => x.id === id);
    if (s) {
        currentQSet = JSON.parse(JSON.stringify(s));
        openQSetEditor();
    }
};

window.deleteQSet = (id) => {
    if (confirm('Are you sure you want to delete this Question Set?')) {
        if (typeof QuestionSetStorage !== 'undefined') QuestionSetStorage.deleteSet(id);
        renderQSetsList();
    }
};

function openQSetEditor() {
    document.getElementById('edit-qset-name').value = currentQSet.name || '';
    document.getElementById('edit-qset-questions').value = currentQSet.questions ? currentQSet.questions.join('\n') : '';
    document.getElementById('qset-editor-modal').classList.remove('hidden');
}

document.getElementById('btn-cancel-qset').addEventListener('click', () => {
    document.getElementById('qset-editor-modal').classList.add('hidden');
});

document.getElementById('btn-save-qset').addEventListener('click', () => {
    const name = document.getElementById('edit-qset-name').value.trim();
    if (!name) return alert('Please enter a name for the Question Set.');
    
    const rawQs = document.getElementById('edit-qset-questions').value;
    const qs = rawQs.split('\n').map(q => q.trim()).filter(q => q.length > 0);
    
    currentQSet.name = name;
    currentQSet.questions = qs;
    
    if (typeof QuestionSetStorage !== 'undefined') QuestionSetStorage.saveSet(currentQSet);
    
    document.getElementById('qset-editor-modal').classList.add('hidden');
    renderQSetsList();
});


const levelEditorView = document.getElementById('zone-editor-view');
let currentZone = null;

function renderLevelsList() {
    const tbody = document.getElementById('zone-list-body');
    tbody.innerHTML = '';
    let lvls = ZoneStorage.getZones();
    
    const searchVal = (document.getElementById('search-zones') ? document.getElementById('search-zones').value.toLowerCase() : '');
    if (searchVal) {
        lvls = lvls.filter(l => (l.id && l.id.toLowerCase().includes(searchVal)) || (l.name && l.name.toLowerCase().includes(searchVal)));
    }
    
    lvls.forEach((l, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${l.name}</strong></td>
            <td>${(l.questions || []).length} scenes</td>
            <td>
                <button class="btn secondary btn-sm" onclick="moveZoneUp('${l.id}')" title="Move Up">⬆️</button>
                <button class="btn secondary btn-sm" onclick="moveZoneDown('${l.id}')" title="Move Down">⬇️</button>
                <button class="btn secondary btn-sm" onclick="editZone('${l.id}')">Edit</button>
                <button class="btn danger btn-sm" onclick="deleteZone('${l.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.moveZoneUp = (id) => {
    let lvls = ZoneStorage.getZones();
    let index = lvls.findIndex(item => item.id === id);
    if (index > 0) {
        let temp = lvls[index - 1];
        lvls[index - 1] = lvls[index];
        lvls[index] = temp;
        ZoneStorage.saveZones(lvls);
        renderLevelsList();
    }
};

window.moveZoneDown = (id) => {
    let lvls = ZoneStorage.getZones();
    let index = lvls.findIndex(item => item.id === id);
    if (index > -1 && index < lvls.length - 1) {
        let temp = lvls[index + 1];
        lvls[index + 1] = lvls[index];
        lvls[index] = temp;
        ZoneStorage.saveZones(lvls);
        renderLevelsList();
    }
};

document.getElementById('btn-new-zone').addEventListener('click', () => {
    currentZone = { id: generateId('lvl'), name: 'New Zone', image: '', questions: [] };
    openZoneEditor();
});

window.editZone = (id) => {
    currentZone = JSON.parse(JSON.stringify(ZoneStorage.getZone(id)));
    openZoneEditor();
};

window.deleteZone = (id) => {
    if (confirm('Delete this level?')) {
        ZoneStorage.deleteZone(id);
        renderLevelsList();
    }
};

// Removed toggleLevelScene function as scenes are added via Scene Editor

window.handleDragStart = function(e, id) {
    e.dataTransfer.setData('text/plain', id);
};

window.handleDrop = function(e, targetId) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) {
        const sourceIdx = currentZone.questions.indexOf(sourceId);
        const targetIdx = currentZone.questions.indexOf(targetId);
        if (sourceIdx > -1 && targetIdx > -1) {
            currentZone.questions.splice(sourceIdx, 1);
            currentZone.questions.splice(targetIdx, 0, sourceId);
            openZoneEditor(false);
        }
    }
};

function openZoneEditor(resetFields = true) {
    document.getElementById('list-view').classList.add('hidden');
    levelEditorView.classList.remove('hidden');
    
    if (resetFields) {
        document.getElementById('zone-edit-id').value = currentZone.id;
        document.getElementById('zone-edit-name').value = currentZone.name;
        document.getElementById('zone-edit-image-preview').src = currentZone.image || '';
        document.getElementById('zone-edit-bg-preview').src = currentZone.subMapBg || '';
        document.getElementById('zone-edit-bg-preview').style.display = currentZone.subMapBg ? 'block' : 'none';
    }
    
    const list = document.getElementById('zone-questions-list');
    list.innerHTML = '';
    const allQs = SceneStorage.getScenes();
    
    // Deduplicate selected IDs to avoid showing the same scene multiple times
    const selectedIds = [...new Set(currentZone.questions || [])];
    const selectedQs = selectedIds.map(id => allQs.find(q => q.id === id)).filter(Boolean);
    
    const renderItem = (q, index) => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.marginBottom = '5px';
        div.style.border = '1px solid #eee';
        div.style.background = '#f0f9ff';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        
        div.draggable = true;
        div.ondragstart = (e) => window.handleDragStart(e, q.id);
        div.ondragover = (e) => e.preventDefault();
        div.ondrop = (e) => window.handleDrop(e, q.id);
        div.style.cursor = 'grab';
        
        let dragIcon = `<span style="font-size:20px; color:#aaa; margin-right:10px;">☰</span>`;
        
        div.innerHTML = `
            <div style="margin:0; display:flex; align-items:center; flex: 1;">
                ${dragIcon}
                <strong>${q.name}</strong> <span style="margin-left:10px; color:#888;">(${q.objects?.length || 0} words)</span>
            </div>
        `;
        list.appendChild(div);
    };
    
    selectedQs.forEach((q, idx) => renderItem(q, idx));
    
    if (selectedQs.length === 0) {
        list.innerHTML = '<p style="color: #666; font-style: italic;">No scenes in this zone yet. You can assign scenes to this zone by editing a scene in the Scenes tab.</p>';
    }
}

document.getElementById('btn-cancel-zone').addEventListener('click', () => {
    levelEditorView.classList.add('hidden');
    document.getElementById('list-view').classList.remove('hidden');
});

document.getElementById('btn-save-zone').addEventListener('click', () => {
    currentZone.name = document.getElementById('zone-edit-name').value;
    currentZone.questions = [...new Set(currentZone.questions || [])];
    
    // Reorder subScenes to match questions order
    const sortMatchingOrder = (a, b) => {
        const idA = a.id.replace('level_', '');
        const idB = b.id.replace('level_', '');
        const indexA = currentZone.questions.indexOf(idA);
        const indexB = currentZone.questions.indexOf(idB);
        const posA = indexA === -1 ? 9999 : indexA;
        const posB = indexB === -1 ? 9999 : indexB;
        return posA - posB;
    };
    
    if (currentZone.subScenes) {
        currentZone.subScenes.sort(sortMatchingOrder);
    }
    if (currentZone.subLevels) {
        currentZone.subLevels.sort(sortMatchingOrder);
    }
    
    ZoneStorage.saveZone(currentZone);
    alert('Level saved!');
    levelEditorView.classList.add('hidden');
    document.getElementById('list-view').classList.remove('hidden');
    renderLevelsList();
});

document.getElementById('btn-zone-upload').addEventListener('click', () => {
    document.getElementById('zone-image-upload').click();
});

document.getElementById('zone-image-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const path = await uploadImageToServer(file);
        currentZone.image = path;
        document.getElementById('zone-edit-image-preview').src = path;
    } catch(err) {
        alert("Upload failed: " + err);
    }
});

document.getElementById('btn-zone-bg-upload').addEventListener('click', () => {
    document.getElementById('zone-bg-upload').click();
});

document.getElementById('zone-bg-upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const path = await uploadImageToServer(file);
        currentZone.subMapBg = path;
        document.getElementById('zone-edit-bg-preview').src = path;
        document.getElementById('zone-edit-bg-preview').style.display = 'block';
    } catch(err) {
        alert("Upload failed: " + err);
    }
});

// QUIZ SEQUENCE LOGIC and toggleEditorType removed.

function populateRegionDropdown() {
    const select = document.getElementById('edit-scene-region');
    if (!select) return;
    select.innerHTML = '<option value="">-- No Zone --</option>';
    const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    lvls.forEach(region => {
        const opt = document.createElement('option');
        opt.value = region.id;
        opt.innerText = region.name;
        select.appendChild(opt);
    });
}

function getCurrentRegionForScene(sceneId) {
    const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    for (let r of lvls) {
        if (r.questions && r.questions.includes(sceneId)) {
            return r.id;
        }
    }
    return '';
}
