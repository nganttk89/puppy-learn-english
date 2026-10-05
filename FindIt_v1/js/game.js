// js/game.js

const DEBUG_MODE = false;

let currentLives = 3;
let currentEnergy = 0;
let currentScore = 0;
let currentSceneIndex = 0;
let currentSubIndex = 0;
let currentZoneId = null;
let isWaiting = false;

window.gameDifficulty = localStorage.getItem('gameDifficulty') || 'All';

// DOM
const livesEl = document.getElementById('lives');
const energyCountEl = document.getElementById('energy-count');
const scoreCountEl = document.getElementById('score-count');

const characterImageEl = document.getElementById('character-image');
const characterEmojiEl = document.getElementById('svg-puppy');
const questionTextEl = document.getElementById('question-text');
const sceneImageEl = document.getElementById('scene-image');
const hotspotsContainer = document.getElementById('hotspots-container');

const feedbackArea = document.getElementById('feedback-area');
const feedbackText = document.getElementById('feedback-text');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');

// Screens
const welcomeScreen = document.getElementById('welcome-screen');
const mapScreen = document.getElementById('map-screen');
const gameContainer = document.getElementById('game-container');
const levelCompleteScreen = document.getElementById('scene-complete-screen');

const mapLevelsContainer = document.getElementById('map-zones-container');

let playerName = "";

const sounds = {
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    gameover: new Audio('sounds/gameover.mp3')
};

let isMusicPlaying = false;
let musicPref = localStorage.getItem('musicPref') || 'on';
const bgMusic = new Audio('sounds/bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15; // Nhạc nền nên để nhỏ thôi

const btnToggleMusic = document.getElementById('btn-toggle-music');
if (btnToggleMusic) {
    if (musicPref === 'off') {
        btnToggleMusic.innerText = "🔇 Music: OFF";
    }
    btnToggleMusic.addEventListener('click', () => {
        if (isMusicPlaying || musicPref === 'on') {
            bgMusic.pause();
            isMusicPlaying = false;
            musicPref = 'off';
            localStorage.setItem('musicPref', 'off');
            btnToggleMusic.innerText = "🔇 Music: OFF";
        } else {
            bgMusic.play().catch(e => console.log(e));
            isMusicPlaying = true;
            musicPref = 'on';
            localStorage.setItem('musicPref', 'on');
            btnToggleMusic.innerText = "🎵 Music: ON";
        }
    });
}

function playBGM() {
    if (musicPref === 'off') return;
    if (!isMusicPlaying) {
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            if(btnToggleMusic) btnToggleMusic.innerText = "🎵 Music: ON";
        }).catch(e => {
            console.log("Autoplay prevented:", e);
            if(btnToggleMusic) btnToggleMusic.innerText = "🔇 Music: OFF";
        });
    }
}

function playSound(type) {
    try {
        if (sounds[type]) {
            sounds[type].currentTime = 0;
            let playPromise = sounds[type].play();
            if (playPromise !== undefined) playPromise.catch(e => {});
        }
    } catch (e) {}
}

// ==========================================
// 1. WELCOME SCREEN
// ==========================================
window.onload = async function() {
    try {
        const res = await fetch('data/scenes.json?v=' + Date.now());
        window.scenes = await res.json();
    } catch(e) {
        console.error("Failed to load JSON data:", e);
    }
    
    try {
        const res2 = await fetch('data/zones.json?v=' + Date.now());
        if (res2.ok) {
            window.zones = await res2.json();
        }
    } catch(e) {
        console.error("Failed to load levels data:", e);
    }
    
    try {
        const res3 = await fetch('data/question_sets.json?v=' + Date.now());
        if (res3.ok) {
            window.questionSets = await res3.json();
        }
    } catch(e) {
        console.error("Failed to load question sets:", e);
    }
    
    if (document.getElementById('welcome-difficulty')) {
        document.getElementById('welcome-difficulty').value = window.gameDifficulty;
    }
    if (document.getElementById('returning-difficulty')) {
        document.getElementById('returning-difficulty').value = window.gameDifficulty;
    }
    if (document.getElementById('map-difficulty-select')) {
        document.getElementById('map-difficulty-select').value = window.gameDifficulty;
    }
    
    checkPlayerStart();
};

function checkPlayerStart() {
    if (typeof PlayerStorage === 'undefined') return showMapScreen();
    
    const player = PlayerStorage.getPlayer();
    const urlParams = new URLSearchParams(window.location.search);
    
    // Preview Mode (Admin)
    if (urlParams.get('previewId')) {
        const previewId = urlParams.get('previewId');
        const q = SceneStorage.getScene(previewId);
        if (q && q.type === 'quiz') {
            window.location.href = 'quiz.html?previewId=' + previewId;
            return;
        }
        
        welcomeScreen.classList.add('hidden');
        mapScreen.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        initGameForPreview(previewId);
        return;
    }

    if (player && player.playerName) {
        playerName = player.playerName;
        document.getElementById('new-player-form').classList.add('hidden');
        document.getElementById('returning-player-form').classList.remove('hidden');
        
        document.getElementById('welcome-player-name').innerText = playerName;
        if (document.getElementById('welcome-score')) document.getElementById('welcome-score').innerText = player.progress.score;
    } else {
        document.getElementById('new-player-form').classList.remove('hidden');
        document.getElementById('returning-player-form').classList.add('hidden');
    }
    
    const playSceneId = urlParams.get('playScene');
    const openPopupId = urlParams.get('openPopup');
    const showTopicMapId = urlParams.get('showTopicMap');
    const showMap = urlParams.get('showMap');
    
    if (playSceneId) {
        startScene(playSceneId, false);
    } else if (showMap === 'true') {
        showMapScreen();
    } else if (showTopicMapId) {
        // Find region to render correctly
        const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
        for(let r of lvls) {
            if(r.subScenes && r.subScenes.find(s => s.id === showTopicMapId)) {
                currentRegion = r;
                break;
            }
        }
        
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('map-screen').classList.remove('hidden');
        renderMap();
    } else if (openPopupId) {
        // Find region to render correctly
        const lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
        for(let r of lvls) {
            if(r.subScenes && r.subScenes.find(s => s.id === openPopupId)) {
                currentRegion = r;
                break;
            }
        }
        
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('map-screen').classList.remove('hidden');
        renderMap();
        openProgressionPopup(openPopupId);
    }
}

document.getElementById('btn-start-game')?.addEventListener('click', () => {
    const name = document.getElementById('player-name-input').value.trim();
    if (!name) return alert('Please enter your name!');
    
    window.gameDifficulty = document.getElementById('welcome-difficulty').dataset.value || 'All';
    localStorage.setItem('gameDifficulty', window.gameDifficulty);
    if(window.setDifficultyUI) window.setDifficultyUI('map-difficulty-select', window.gameDifficulty);
    
    playerName = name;
    PlayerStorage.clearProgress(playerName);
    playBGM();
    showMapScreen();
});

document.getElementById('btn-continue-game')?.addEventListener('click', () => {
    window.gameDifficulty = document.getElementById('returning-difficulty').dataset.value || 'All';
    localStorage.setItem('gameDifficulty', window.gameDifficulty);
    if(window.setDifficultyUI) window.setDifficultyUI('map-difficulty-select', window.gameDifficulty);

    playBGM();
    showMapScreen();
});

document.getElementById('btn-restart-game')?.addEventListener('click', () => {
    window.gameDifficulty = document.getElementById('returning-difficulty').dataset.value || 'All';
    localStorage.setItem('gameDifficulty', window.gameDifficulty);
    if(window.setDifficultyUI) window.setDifficultyUI('map-difficulty-select', window.gameDifficulty);

    PlayerStorage.clearProgress(playerName);
    showMapScreen();
});

document.getElementById('btn-back-to-welcome')?.addEventListener('click', () => {
    PlayerStorage.logoutPlayer();
    playerName = null;
    mapScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
    
    // Clear input field
    const nameInput = document.getElementById('player-name-input');
    if(nameInput) nameInput.value = '';
    
    checkPlayerStart();
});

document.getElementById('map-difficulty-select')?.addEventListener('change', (e) => {
    window.gameDifficulty = e.target.value;
    localStorage.setItem('gameDifficulty', window.gameDifficulty);
    renderMap();
});

// ==========================================
// 2. MAP SCREEN
// ==========================================
function showMapScreen() {
    welcomeScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    mapScreen.classList.remove('hidden');
    
    // Update map top bar
    const player = PlayerStorage.getPlayer();
    if (document.getElementById('map-score')) {
        document.getElementById('map-score').innerText = player ? player.progress.score : 0;
    }
    
    renderMap();
}

let currentRegion = null;

function renderMap() {
    mapLevelsContainer.innerHTML = '';
    const backBtn = document.getElementById('btn-back-to-region');
    const mapTitle = document.getElementById('map-title');
    
    let lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    const player = PlayerStorage.getPlayer();
    const completed = (player && player.progress.completedZones) ? player.progress.completedZones : [];
    const mapScreenDiv = document.getElementById('map-screen');
    
    if (currentRegion) {
        if (backBtn) backBtn.style.display = 'block';
        if (mapTitle) mapTitle.innerText = currentRegion.name;
        
        // Change background
        if (currentRegion.subMapBg) {
            mapScreenDiv.style.backgroundImage = `url('${currentRegion.subMapBg}')`;
            mapScreenDiv.style.backgroundColor = '';
        } else {
            mapScreenDiv.style.backgroundImage = `url('images/ocean_surface.jpg')`;
            mapScreenDiv.style.backgroundColor = '';
        }
        
        let filteredScenes = currentRegion.subScenes;
        if (window.gameDifficulty && window.gameDifficulty !== 'All') {
            filteredScenes = currentRegion.subScenes.filter(s => 
                (s.difficulty || '').toLowerCase() === window.gameDifficulty.toLowerCase()
            );
        }

        if (filteredScenes.length === 0) {
            mapLevelsContainer.innerHTML = `<div style="text-align: center; width: 100%; font-size: 1.5rem; color: #fff; margin-top: 50px; text-shadow: 2px 2px 4px #000;">No ${window.gameDifficulty} scenes in this Zone!</div>`;
        }

        filteredScenes.forEach((lvl, index) => {
            const isUnlocked = index === 0 || completed.includes(filteredScenes[index - 1].id) || completed.includes(lvl.id);
            const isCompleted = completed.includes(lvl.id);
            
            const node = document.createElement('div');
            node.className = `zone-node ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;
            node.style.animationDelay = `${index * 0.15}s`;
            
            let starsHtml = "";
            if (isCompleted && player && player.progress.stars && player.progress.stars[lvl.id]) {
                const starsCount = player.progress.stars[lvl.id];
                const starStr = '⭐'.repeat(starsCount);
                starsHtml = `<div class="zone-stars">${starStr}</div>`;
            }
            
            node.innerHTML = `
                ${isCompleted ? '<div class="zone-badge">✓</div>' : ''}
                <img src="${lvl.image || 'images/puppy.png'}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'80\\' height=\\'80\\'><rect width=\\'80\\' height=\\'80\\' fill=\\'#eee\\'/></svg>'">
                <div class="zone-name">${lvl.name}</div>
                ${starsHtml}
            `;
            
            if (isUnlocked) {
                node.addEventListener('click', () => {
                    sessionStorage.setItem('currentTopicMistakes', 0);
                    openProgressionPopup(lvl.id); 
                });
            }
            mapLevelsContainer.appendChild(node);
        });
    } else {
        mapScreenDiv.style.backgroundImage = `url('images/map_bg.jpg')`;
        mapScreenDiv.style.backgroundColor = '';
        if (backBtn) backBtn.style.display = 'none';
        if (mapTitle) mapTitle.innerText = 'Select a Zone';
        
        let previousCompleted = true;
        try {
            lvls.forEach((region, index) => {
                let isRegionUnlocked = previousCompleted;
                
                if (region.subScenes && region.subScenes.length > 0) {
                    previousCompleted = isRegionUnlocked && region.subScenes.every(sub => completed.includes(sub.id));
                } else {
                    previousCompleted = isRegionUnlocked;
                }

                if (!region) return;

                const node = document.createElement('div');
                node.className = `zone-node ${isRegionUnlocked ? 'unlocked' : 'locked'}`;
                node.style.animationDelay = `${index * 0.15}s`;
                node.innerHTML = `
                    ${!isRegionUnlocked ? '<div class="lock-icon" style="position:absolute;top:-10px;right:-10px;background:#e74c3c;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 5px rgba(0,0,0,0.3);z-index:10;">🔒</div>' : ''}
                    <img src="${region.image || 'images/puppy.png'}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'80\\' height=\\'80\\'><rect width=\\'80\\' height=\\'80\\' fill=\\'#eee\\'/></svg>'">
                    <div class="zone-name">${region.name || 'Unknown'}</div>
                `;
                if (isRegionUnlocked) {
                    node.addEventListener('click', () => {
                        currentRegion = region;
                        renderMap();
                    });
                } else {
                    node.addEventListener('click', () => {
                        alert('You must complete all levels in the previous zone first! 🐶');
                    });
                }
                mapLevelsContainer.appendChild(node);
            });
        } catch (e) {
            mapLevelsContainer.innerHTML += `<div style="color:red; background:white; padding:10px; border-radius:10px; position:absolute; top: 10px; left: 10px; z-index: 9999;">Error: ${e.message}</div>`;
        }
    }
}

let activePopupLevelId = null;

function openProgressionPopup(lvlId) {
    activePopupLevelId = lvlId;
    const player = PlayerStorage.getPlayer();
    
    // We get the actual level data to display its name
    let foundLvl = null;
    let lvls = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZones() : [];
    for(let r of lvls) {
        if(r.subScenes) {
            foundLvl = r.subScenes.find(s => s.id === lvlId);
            if(foundLvl) break;
        }
    }
    
    if(foundLvl) {
        document.getElementById('progression-title').innerText = foundLvl.name;
    }
    
    // Determine progress (which stages are unlocked)
    let stageProg = player.progress[lvlId] || { s1: false, s2: false, s3: false, s4: false };
    
    // Fallback for old progress format where completedStages array was used
    if (player.progress.completedStages) {
        if (player.progress.completedStages.includes(lvlId + '-s1')) stageProg.s1 = true;
        if (player.progress.completedStages.includes(lvlId + '-s2')) stageProg.s2 = true;
        if (player.progress.completedStages.includes(lvlId + '-s3')) stageProg.s3 = true;
        if (player.progress.completedStages.includes(lvlId + '-s4')) stageProg.s4 = true;
    }
    
    const btn1 = document.getElementById('btn-stage-1');
    const btn2 = document.getElementById('btn-stage-2');
    const btn3 = document.getElementById('btn-stage-3');
    const btn4 = document.getElementById('btn-stage-4');
    
    const sceneIds = foundLvl ? (foundLvl.questions || []) : [];
    const scenes = sceneIds.map(id => typeof SceneStorage !== 'undefined' ? SceneStorage.getScene(id) : null).filter(q => q);
    
    let hasBigImage = false;
    let hasThumbnails = false;
    
    for (let t of scenes) {
        if (t.image && t.image.trim() !== '') hasBigImage = true;
        let objects = t.objects || t.quizData || [];
        if (objects.some(o => o.image && o.image.trim() !== '')) hasThumbnails = true;
    }
    
    // Fallback: If no scenes are loaded, try to guess from type, though new logic prefers asset detection
    if (scenes.length === 0 && foundLvl && foundLvl.type === 'quiz') {
        hasThumbnails = true;
    } else if (scenes.length === 0) {
        hasBigImage = true;
        hasThumbnails = true; // Default legacy assumption
    }

    btn1.style.display = hasThumbnails ? 'block' : 'none';
    btn2.style.display = hasBigImage ? 'block' : 'none';
    btn3.style.display = hasThumbnails ? 'block' : 'none';
    btn4.style.display = hasThumbnails ? 'block' : 'none';
    
    if (hasThumbnails) {
        // Stage 1 (Flashcards/Quiz) is always unlocked if available
        btn1.className = 'btn-large';
        btn1.style.backgroundColor = stageProg.s1 ? '#27ae60' : '#9b59b6';
        btn1.style.color = 'white';
        btn1.innerText = stageProg.s1 ? '1. 🃏 Flashcards ✓' : '1. 🃏 Flashcards (Quiz)';
        btn1.disabled = false;
        btn1.onclick = () => {
            sessionStorage.setItem('currentTopicMistakes', 0);
            document.getElementById('progression-popup').classList.add('hidden');
            startScene(lvlId, false, 'quiz');
        };
    }

    if (hasBigImage) {
        // Stage 2 (Find It) unlocks if S1 is completed OR if S1 is not available
        const s2Unlocked = !hasThumbnails || stageProg.s1;
        
        if (s2Unlocked) {
            btn2.className = 'btn-large';
            btn2.style.backgroundColor = stageProg.s2 ? '#27ae60' : '#3498db';
            btn2.style.color = 'white';
            btn2.innerText = stageProg.s2 ? (hasThumbnails ? '2. 🔍 Find It ✓' : '1. 🔍 Find It ✓') : (hasThumbnails ? '2. 🔍 Find It' : '1. 🔍 Find It (Hidden Object)');
            btn2.disabled = false;
            btn2.onclick = () => {
                document.getElementById('progression-popup').classList.add('hidden');
                startScene(lvlId, false, 'hidden_object');
            };
        } else {
            btn2.className = 'btn-large btn-disabled';
            btn2.style.backgroundColor = '#bdc3c7';
            btn2.style.color = '#7f8c8d';
            btn2.innerText = '2. 🔍 Find It (Locked)';
            btn2.disabled = true;
        }
    }
    
    if (hasThumbnails) {
        // Stage 3 (Matching) requires Stage 2 if hasBigImage, else Stage 1
        const s3Unlocked = hasBigImage ? stageProg.s2 : stageProg.s1;
        
        if (s3Unlocked) {
            btn3.className = 'btn-large';
            btn3.style.backgroundColor = stageProg.s3 ? '#27ae60' : '#e67e22';
            btn3.style.color = 'white';
            btn3.innerText = stageProg.s3 ? (hasBigImage ? '3. 🔗 Matching ✓' : '2. 🔗 Matching ✓') : (hasBigImage ? '3. 🔗 Matching' : '2. 🔗 Matching');
            btn3.disabled = false;
            btn3.onclick = () => {
                document.getElementById('progression-popup').classList.add('hidden');
                startScene(lvlId, false, 'matching');
            };
        } else {
            btn3.className = 'btn-large btn-disabled';
            btn3.style.backgroundColor = '#bdc3c7';
            btn3.style.color = '#7f8c8d';
            btn3.innerText = hasBigImage ? '3. 🔗 Matching (Locked)' : '2. 🔗 Matching (Locked)';
            btn3.disabled = true;
        }
        
        // Stage 4 (Spelling) requires Stage 3
        if (stageProg.s3) {
            btn4.className = 'btn-large';
            btn4.style.backgroundColor = stageProg.s4 ? '#27ae60' : '#e74c3c';
            btn4.style.color = 'white';
            btn4.innerText = stageProg.s4 ? (hasBigImage ? '4. ✍️ Spelling ✓' : '3. ✍️ Spelling ✓') : (hasBigImage ? '4. ✍️ Spelling' : '3. ✍️ Spelling');
            btn4.disabled = false;
            btn4.onclick = () => {
                document.getElementById('progression-popup').classList.add('hidden');
                startScene(lvlId, false, 'spelling');
            };
        } else {
            btn4.className = 'btn-large btn-disabled';
            btn4.style.backgroundColor = '#bdc3c7';
            btn4.style.color = '#7f8c8d';
            btn4.innerText = hasBigImage ? '4. ✍️ Spelling (Locked)' : '3. ✍️ Spelling (Locked)';
            btn4.disabled = true;
        }
    }

    document.getElementById('progression-popup').classList.remove('hidden');
}

document.getElementById('btn-close-progression')?.addEventListener('click', () => {
    document.getElementById('progression-popup').classList.add('hidden');
    // Clear URL param if present
    if (window.history.replaceState) {
        const url = new URL(window.location);
        url.searchParams.delete('openPopup');
        window.history.replaceState(null, '', url);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('btn-back-to-region');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            currentRegion = null;
            // Clear URL param if present so back button works correctly
            if (window.history.replaceState) {
                const url = new URL(window.location);
                url.searchParams.delete('openPopup');
                window.history.replaceState(null, '', url);
            }
            renderMap();
        });
    }
});

// ==========================================
// 3. GAME LOGIC (SCENES & SUB-QUESTIONS)
// ==========================================
function initGameForPreview(sceneId) {
    currentZoneId = 'preview';
    currentLives = 3; currentEnergy = 0; currentScore = 0; currentSceneIndex = 0; currentSubIndex = 0;
    const allQs = SceneStorage.getScenes();
    window.gameQuestions = allQs.filter(q => q.id == sceneId);
    if(window.gameQuestions.length === 0) window.gameQuestions = allQs;
    updateUI();
    loadScene();
}

function startScene(levelId, forceReset = true, stageType = null) {
    const lvl = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZone(levelId) : null;
    
    // If no stageType is provided, infer it based on player progress
    if (!stageType) {
        const player = typeof PlayerStorage !== 'undefined' ? PlayerStorage.getPlayer() : null;
        if (player && player.progress && player.progress[levelId]) {
            const prog = player.progress[levelId];
            if (!prog.s1) stageType = 'quiz';
            else if (!prog.s2) stageType = 'hidden_object';
            else if (!prog.s3) stageType = 'matching';
            else stageType = 'spelling';
        } else {
            stageType = 'quiz'; // Default to stage 1
        }
    }

    currentZoneId = levelId;
    welcomeScreen.classList.add('hidden');
    mapScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    
    // Redirect based on stageType
    const cacheBuster = '&v=' + Date.now();
    if (stageType === 'quiz') {
        window.location.href = 'quiz.html?level=' + levelId + cacheBuster;
        return;
    } else if (stageType === 'matching') {
        window.location.href = 'match.html?level=' + levelId + cacheBuster;
        return;
    } else if (stageType === 'spelling') {
        window.location.href = 'spell.html?level=' + levelId + cacheBuster;
        return;
    }
    
    // Otherwise, it's stage 1 (hidden_object) - stay here!
    
    // Load Scenes for this level
    if (lvl) {
        const allQs = SceneStorage.getScenes();
        window.gameQuestions = allQs.filter(q => lvl.questions.includes(q.id));
    } else {
        window.gameQuestions = SceneStorage.getScenes();
    }
    
    // Load progress
    const player = PlayerStorage.getPlayer();
    if (!forceReset && player && player.progress.currentZone === levelId) {
        currentLives = player.progress.lives;
        currentEnergy = player.progress.energy;
        currentScore = player.progress.score;
        currentSceneIndex = player.progress.currentSceneIndex || 0;
        currentSubIndex = player.progress.currentSubIndex || 0;
    } else {
        currentLives = (player && player.progress.lives > 0) ? player.progress.lives : 3;
        currentEnergy = player ? player.progress.energy : 0;
        currentScore = player ? player.progress.score : 0;
        currentSceneIndex = 0;
        currentSubIndex = 0;
    }
    
    isWaiting = false;
    updateUI();
    gameOverScreen.classList.add('hidden');
    feedbackArea.classList.add('hidden');
    
    if (DEBUG_MODE) hotspotsContainer.classList.add('debug-mode');
    else hotspotsContainer.classList.remove('debug-mode');

    saveProgress();
    loadScene();
}

function saveProgress() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('previewId') || currentZoneId === 'preview') return;
    
    if (playerName) {
        const player = PlayerStorage.getPlayer();
        const completed = player ? player.progress.completedZones : [];
        
        // Retain existing level progress (e.g. level1: {s1: true})
        let newProgress = {
            lives: currentLives,
            energy: currentEnergy,
            score: currentScore,
            currentZone: currentZoneId,
            currentSceneIndex: currentSceneIndex,
            currentSubIndex: currentSubIndex,
            completedZones: completed
        };
        
        if (player && player.progress) {
            for (let key in player.progress) {
                if (key !== 'lives' && key !== 'energy' && key !== 'score' && key !== 'currentZone' && key !== 'currentSceneIndex' && key !== 'currentSubIndex' && key !== 'completedZones') {
                    newProgress[key] = player.progress[key];
                }
            }
        }
        
        PlayerStorage.savePlayer(playerName, newProgress);
    }
}

// Tải Scene (1 Bức ảnh)
function loadScene() {
    if (currentSceneIndex >= window.gameQuestions.length) {
        handleLevelComplete();
        return;
    }

    const scene = window.gameQuestions[currentSceneIndex];
    
    if (scene.character === 'images/puppy.png' || !scene.character) {
        if (characterImageEl) characterImageEl.classList.add('hidden');
        if (characterEmojiEl) characterEmojiEl.classList.remove('hidden');
    } else {
        if (characterImageEl) {
            characterImageEl.src = scene.character;
            characterImageEl.classList.remove('hidden');
        }
        if (characterEmojiEl) characterEmojiEl.classList.add('hidden');
    }
    
    sceneImageEl.src = scene.image;
    
    // Group objects by name to avoid asking for the same item multiple times
    window.uniqueTargets = [];
    if (scene.objects) {
        const uniqueNames = new Set();
        for (let obj of scene.objects) {
            const lowerName = obj.name.toLowerCase().trim();
            if (!uniqueNames.has(lowerName)) {
                uniqueNames.add(lowerName);
                window.uniqueTargets.push(obj.name); // keep original case
            }
        }
    }
    
    createHotspots(scene);
    loadSubQuestion(); // Tải câu hỏi đầu tiên của Scene
}

// Tải câu hỏi phụ trong Scene
function loadSubQuestion() {
    const scene = window.gameQuestions[currentSceneIndex];
    
    if (!window.uniqueTargets || currentSubIndex >= window.uniqueTargets.length) {
        // Đã tìm hết các object trong ảnh này -> Hoàn thành stage 1
        currentSceneIndex++;
        currentSubIndex = 0;
        saveProgress();
        loadScene();
        return;
    }
    
    const targetName = window.uniqueTargets[currentSubIndex];
    
    const questionTemplates = [
        "Where is {name}?",
        "Can you find {name}?",
        "Show me {name}.",
        "Do you see {name}?",
        "Let's look for {name}!",
        "I'm looking for {name}.",
        "Point to {name}.",
        "Help me find {name}.",
        "Where can you see {name}?",
        "Spot {name}!",
        "Can you spot {name}?",
        "Let's find {name}!"
    ];
    
    let template;
    
    // First, check Question Sets
    if (scene.questionSetId === 'none') {
        template = "{name}";
    } else if (scene.questionSetId && typeof window.questionSets !== 'undefined') {
        const qset = window.questionSets.find(s => s.id === scene.questionSetId);
        if (qset && qset.questions && qset.questions.length > 0) {
            template = qset.questions[Math.floor(Math.random() * qset.questions.length)];
        }
    }
    
    // Fallbacks if template is still not set
    if (!template) {
        // Backwards compatibility with old questionTemplates
        if (scene.questionTemplates && scene.questionTemplates.length > 0) {
            template = scene.questionTemplates[Math.floor(Math.random() * scene.questionTemplates.length)];
        } else if (targetName.startsWith("I ")) {
            const sentenceTemplates = [
                "Listen and choose: {name}",
                "Which one is: {name}?",
                "Can you match: {name}?"
            ];
            template = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
        } else {
            template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
        }
    }
    const questionText = template.replace("{name}", targetName);
    
    questionTextEl.innerText = questionText;
    if (characterEmojiEl) characterEmojiEl.className = 'idle';
    feedbackArea.classList.add('hidden');
    saveProgress();
    
    // Đọc câu hỏi
    if (typeof speakText === 'function') speakText(questionText);
}

function createHotspots(sceneData) {
    hotspotsContainer.innerHTML = ''; 
    const { originalWidth, originalHeight, objects } = sceneData;
    
    if (!objects || !Array.isArray(objects)) return;
    
    objects.forEach(obj => {
        const hotspot = document.createElement('div');
        hotspot.classList.add('hotspot');
        
        const leftPercent = (obj.x / originalWidth) * 100;
        const topPercent = (obj.y / originalHeight) * 100;
        const widthPercent = (obj.width / originalWidth) * 100;
        const heightPercent = (obj.height / originalHeight) * 100;
        
        hotspot.style.left = `${leftPercent}%`;
        hotspot.style.top = `${topPercent}%`;
        hotspot.style.width = `${widthPercent}%`;
        hotspot.style.height = `${heightPercent}%`;
        
        hotspot.addEventListener('click', () => {
            if (isWaiting) return;
            
            // Check against current target name
            const currentTargetName = window.uniqueTargets[currentSubIndex];
            if (obj.name.toLowerCase().trim() === currentTargetName.toLowerCase().trim()) {
                handleCorrectAnswer(hotspot);
            } else {
                handleWrongAnswer();
            }
        });
        
        hotspotsContainer.appendChild(hotspot);
    });
}

function handleCorrectAnswer(hotspotElement) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    isWaiting = true;
    currentScore += 10;
    updateUI();
    playSound('correct');
    
    const praises = ["Great job!", "Excellent!", "Awesome!", "Perfect!", "Well done!"];
    const praise = praises[Math.floor(Math.random() * praises.length)];
    
    feedbackArea.classList.add('hidden');
    questionTextEl.innerHTML = `<span style='color: #27ae60; font-weight: bold;'>${praise}</span>`;
    
    hotspotElement.classList.add('flash-correct');
    if (characterEmojiEl) characterEmojiEl.className = 'happy';
    
    if (typeof speakText === 'function') speakText(praise);
    
    setTimeout(() => {
        currentSubIndex++;
        isWaiting = false;
        loadSubQuestion(); // Chuyển câu hỏi (cùng hình) hoặc sang hình khác
    }, 2000);
}

function handleWrongAnswer() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    playSound('wrong');
    let mistakes = parseInt(sessionStorage.getItem('currentTopicMistakes') || '0');
    sessionStorage.setItem('currentTopicMistakes', mistakes + 1);
    currentLives -= 1;
    updateUI();
    saveProgress();
    
    feedbackArea.classList.add('hidden');
    
    const oops = ["Try again!", "Oops!", "Look closer!", "Oh no!"];
    const oopsText = oops[Math.floor(Math.random() * oops.length)];
    
    const originalQuestion = questionTextEl.innerText;
    questionTextEl.innerHTML = `<span style='color: #e74c3c; font-weight: bold;'>${oopsText} 💔</span>`;
    
    if (characterEmojiEl) characterEmojiEl.className = 'sad';
    if (typeof speakText === 'function') speakText(oopsText);
    
    // Removed screen shake to prevent layout shift
    
    setTimeout(() => {
        questionTextEl.innerText = originalQuestion;
        if (characterEmojiEl) characterEmojiEl.className = 'idle';
    }, 1500);
    
    if (currentLives <= 0) setTimeout(gameOver, 500);
}

function updateUI() {
    let hearts = "";
    for(let i = 0; i < currentLives; i++) hearts += "❤️ ";
    livesEl.innerText = hearts || "💔";
    if (scoreCountEl) scoreCountEl.innerText = currentScore;
}

function getNextLevelId(currentId) {
    const lvls = ZoneStorage.getZones();
    for (let r of lvls) {
        if (r.subScenes) {
            const index = r.subScenes.findIndex(sub => sub.id === currentId);
            if (index > -1 && index + 1 < r.subScenes.length) {
                return r.subScenes[index + 1].id;
            }
        }
    }
    const index = lvls.findIndex(l => l.id === currentId);
    if (index > -1 && index + 1 < lvls.length) {
        return lvls[index + 1].id;
    }
    return null;
}

function handleLevelComplete() {
    const player = PlayerStorage.getPlayer();
    if (player && currentZoneId && currentZoneId !== 'preview') {
        if (!player.progress[currentZoneId]) {
            player.progress[currentZoneId] = { s1: false, s2: false, s3: false, s4: false };
        }
        player.progress[currentZoneId].s2 = true;
        
        // Reset current level progress
        player.progress.currentZone = null;
        player.progress.currentSceneIndex = 0;
        player.progress.currentSubIndex = 0;
        player.progress.energy = currentEnergy;
        player.progress.score = currentScore;
        player.progress.lives = 3; 
        PlayerStorage.savePlayer(playerName, player.progress);
    }
    
    gameContainer.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    
    if(currentZoneId && currentZoneId !== 'preview') {
        let hasThumbnails = false;
        const lvl = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZone(currentZoneId) : null;
        if (lvl) {
            const allQs = typeof SceneStorage !== 'undefined' ? SceneStorage.getScenes() : [];
            const levelScenes = allQs.filter(q => lvl.questions && lvl.questions.includes(q.id));
            for (let t of levelScenes) {
                let objects = t.objects || t.quizData || [];
                if (objects.some(o => o.image && o.image.trim() !== '')) hasThumbnails = true;
            }
        } else {
            hasThumbnails = true;
        }

        if (!hasThumbnails && typeof PlayerStorage !== 'undefined') {
            // It's the last mode!
            const nextUrl = PlayerStorage.getNextLevelUrl(currentZoneId);
            // This internally saves stars because s2 is passed
            PlayerStorage.showSuccessModal(player, currentLives, currentScore, currentZoneId, 's2', nextUrl);
        } else {
            mapScreen.classList.remove('hidden');
            openProgressionPopup(currentZoneId);
        }
    } else {
        mapScreen.classList.remove('hidden');
    }
}

function gameOver() {
    playSound('gameover');
    if (typeof PlayerStorage !== 'undefined') {
        const player = PlayerStorage.getPlayer();
        if (player) {
            PlayerStorage.showBuyLivesModal(player, currentLives, currentScore, 
                (newLives, newScore) => {
                    currentLives = newLives;
                    currentScore = newScore;
                    updateUI();
                    saveProgress();
                },
                () => {
                    if (finalScoreEl) finalScoreEl.innerText = currentScore;
                    gameOverScreen.classList.remove('hidden');
                }
            );
            return;
        }
    }
    
    // Fallback if no storage
    if (finalScoreEl) finalScoreEl.innerText = currentScore;
    gameOverScreen.classList.remove('hidden');
}

document.getElementById('btn-buy-1-life')?.addEventListener('click', () => {
    if (currentScore >= 100) {
        currentScore -= 100;
        currentLives += 1;
        updateUI();
        saveProgress();
        gameOverScreen.classList.add('hidden');
        playSound('correct');
    } else {
        alert('Not enough coins! You need 100.');
    }
});

document.getElementById('btn-buy-3-lives')?.addEventListener('click', () => {
    if (currentScore >= 250) {
        currentScore -= 250;
        currentLives += 3;
        updateUI();
        saveProgress();
        gameOverScreen.classList.add('hidden');
        playSound('correct');
    } else {
        alert('Not enough coins! You need 250.');
    }
});

// Navigation Buttons
document.getElementById('play-again-btn')?.addEventListener('click', () => {
    startScene(currentZoneId, true);
});

document.getElementById('btn-gameover-map')?.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    showMapScreen();
});

document.getElementById('btn-back-to-map')?.addEventListener('click', () => {
    showMapScreen();
});

document.getElementById('btn-quit-zone')?.addEventListener('click', () => {
    window.location.href = 'index.html?showTopicMap=' + currentZoneId;
});

// ==========================================
// 4. TEXT TO SPEECH (Đọc tiếng Anh)
// ==========================================
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Dừng câu trước nếu đang đọc
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'en-US'; 
        msg.rate = 0.9; // Chậm lại một chút cho trẻ em nghe rõ
        msg.pitch = 1.2; // Giọng hơi cao cho dễ thương
        window.speechSynthesis.speak(msg);
    }
}

window.replayQuestionAudio = function() {
    const textEl = document.getElementById('question-text');
    if (textEl && textEl.innerText) {
        speakText(textEl.innerText);
    }
}
