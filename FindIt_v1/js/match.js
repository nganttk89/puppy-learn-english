let allMatchObjects = [];
let currentBatchIndex = 0;
let matchData = [];
let currentLives = 3;
let currentScore = 0;
let currentPlayer = null;
let levelId = null;

let selectedImageId = null;
let selectedTextId = null;
let matchedPairs = 0;
let currentBatchNewItems = 0;

let isMusicPlaying = false;
let musicPref = localStorage.getItem('musicPref') || 'on';
const bgMusic = new Audio('sounds/bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15;

const btnToggleMusic = document.getElementById('btn-toggle-music');
if (btnToggleMusic) {
    if (musicPref === 'off') {
        btnToggleMusic.innerHTML = `🔇 <span class="hide-mobile">Music: OFF</span>`;
    }
    btnToggleMusic.addEventListener('click', () => {
        if (isMusicPlaying || musicPref === 'on') {
            bgMusic.pause();
            isMusicPlaying = false;
            musicPref = 'off';
            localStorage.setItem('musicPref', 'off');
            btnToggleMusic.innerHTML = `🔇 <span class="hide-mobile">Music: OFF</span>`;
        } else {
            bgMusic.play().catch(e => console.log(e));
            isMusicPlaying = true;
            musicPref = 'on';
            localStorage.setItem('musicPref', 'on');
            btnToggleMusic.innerHTML = `🎵 <span class="hide-mobile">Music: ON</span>`;
        }
    });
}

function playBGM() {
    if (musicPref === 'off') return;
    if (!isMusicPlaying) {
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            if(btnToggleMusic) btnToggleMusic.innerHTML = `🎵 <span class="hide-mobile">Music: ON</span>`;
        }).catch(e => {
            console.log("Autoplay prevented:", e);
        });
    }
}

async function initMatch() {
    const urlParams = new URLSearchParams(window.location.search);
    levelId = urlParams.get('level');
    
    try {
        if (typeof window.scenes === 'undefined' || window.scenes.length === 0) {
            const res = await fetch('data/scenes.json?v=' + Date.now());
            window.scenes = await res.json();
            SceneStorage.getScenes();
        }
        if (typeof window.zones === 'undefined' || window.zones.length === 0) {
            const res2 = await fetch('data/zones.json?v=' + Date.now());
            window.zones = await res2.json();
            ZoneStorage.getZones();
        }
    } catch(e) {
        console.error("Failed to load data", e);
    }
    
    if (levelId && typeof ZoneStorage !== 'undefined') {
        const lvl = ZoneStorage.getZone(levelId);
        if (lvl && lvl.questions && lvl.questions.length > 0) {
            const qId = lvl.questions[0];
            const scene = SceneStorage.getScene(qId);
            if (scene && scene.objects && scene.objects.length > 0) {
                const uniqueNames = new Set();
                let validObjects = [];
                for (let obj of scene.objects) {
                    const lowerName = obj.name.toLowerCase().trim();
                    if (obj.image && !uniqueNames.has(lowerName)) {
                        uniqueNames.add(lowerName);
                        validObjects.push(obj);
                    }
                }
                
                allMatchObjects = validObjects.sort(() => 0.5 - Math.random());
                currentBatchIndex = 0;
            }
        }
    }
    
    if (allMatchObjects.length < 2) {
        alert("Not enough vocabulary with images for Matching! Please add images in Admin.");
        window.location.href = 'index.html';
        return;
    }

    currentPlayer = typeof PlayerStorage !== 'undefined' ? PlayerStorage.getPlayer() : null;
    if (currentPlayer) {
        currentLives = currentPlayer.progress.lives || 3;
        currentScore = currentPlayer.progress.score || 0;
    }
    
    loadNextBatch();
    
    // Play BGM on first interaction
    document.body.addEventListener('click', playBGM, { once: true });
    
    // Initialize SVG canvas size to match viewport
    const svg = document.getElementById('line-canvas');
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
}

function loadNextBatch() {
    if (currentBatchIndex >= allMatchObjects.length) {
        showGameOver();
        return;
    }
    
    const end = Math.min(currentBatchIndex + 4, allMatchObjects.length);
    matchData = allMatchObjects.slice(currentBatchIndex, end);
    currentBatchNewItems = matchData.length;
    
    if (matchData.length < 4 && currentBatchIndex > 0) {
        const needed = 4 - matchData.length;
        let previousItems = allMatchObjects.slice(0, currentBatchIndex);
        previousItems = previousItems.sort(() => Math.random() - 0.5);
        const borrowed = previousItems.slice(0, needed);
        matchData = matchData.concat(borrowed);
    }
    
    if (matchData.length < 2) {
        alert("Not enough vocabulary with images for Matching! Please add images in Admin.");
        window.location.href = 'index.html?showTopicMap=' + levelId;
        return;
    }
    
    matchedPairs = 0;
    selectedImageId = null;
    selectedTextId = null;
    
    const svg = document.getElementById('line-canvas');
    if (svg) svg.innerHTML = '';
    
    updateUI();
    renderMatchGame();
}

function renderMatchGame() {
    const imagesCol = document.getElementById('images-col');
    const textsCol = document.getElementById('texts-col');
    
    imagesCol.innerHTML = '';
    textsCol.innerHTML = '';
    
    // Left side (Images)
    let leftItems = [...matchData];
    leftItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'match-item img-item';
        div.id = `img-${item.id}`;
        div.dataset.id = item.id;
        
        const img = document.createElement('img');
        img.src = item.image;
        div.appendChild(img);
        
        div.onclick = () => selectImage(item.id);
        imagesCol.appendChild(div);
    });
    
    // Right side (Texts - Shuffled)
    let rightItems = [...matchData].sort(() => 0.5 - Math.random());
    rightItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'match-item text-item';
        div.id = `text-${item.id}`;
        div.dataset.id = item.id;
        
        const span = document.createElement('span');
        span.className = 'match-text';
        span.innerText = item.name;
        div.appendChild(span);
        
        div.onclick = () => selectText(item.id);
        textsCol.appendChild(div);
    });
}

function selectImage(id) {
    if(document.getElementById(`img-${id}`).classList.contains('matched')) return;
    
    // Deselect previous
    document.querySelectorAll('.img-item').forEach(el => el.classList.remove('selected'));
    
    selectedImageId = id;
    document.getElementById(`img-${id}`).classList.add('selected');
    playSound('pop');
    
    checkMatch();
}

function selectText(id) {
    if(document.getElementById(`text-${id}`).classList.contains('matched')) return;
    
    // Deselect previous
    document.querySelectorAll('.text-item').forEach(el => el.classList.remove('selected'));
    
    selectedTextId = id;
    document.getElementById(`text-${id}`).classList.add('selected');
    
    // Speak word
    const item = matchData.find(i => i.id === id);
    if(item && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(item.name);
        msg.lang = 'en-US';
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
    
    checkMatch();
}

function checkMatch() {
    if (selectedImageId && selectedTextId) {
        if (selectedImageId === selectedTextId) {
            // Match!
            playSound('correct');
            const imgEl = document.getElementById(`img-${selectedImageId}`);
            const textEl = document.getElementById(`text-${selectedTextId}`);
            
            imgEl.classList.remove('selected');
            textEl.classList.remove('selected');
            imgEl.classList.add('matched');
            textEl.classList.add('matched');
            
            drawLine(imgEl, textEl);
            
            currentScore += 10;
            updateUI();
            
            selectedImageId = null;
            selectedTextId = null;
            matchedPairs++;
            
            if (matchedPairs === matchData.length) {
                currentBatchIndex += currentBatchNewItems;
                if (currentBatchIndex >= allMatchObjects.length) {
                    setTimeout(showGameOver, 1000);
                } else {
                    setTimeout(loadNextBatch, 1000);
                }
            }
        } else {
            // Wrong match
            playSound('wrong');
            let mistakes = parseInt(sessionStorage.getItem('currentTopicMistakes') || '0');
            sessionStorage.setItem('currentTopicMistakes', mistakes + 1);
            currentLives -= 1;
            updateUI();
            
            const imgEl = document.getElementById(`img-${selectedImageId}`);
            const textEl = document.getElementById(`text-${selectedTextId}`);
            
            imgEl.style.borderColor = '#e74c3c';
            textEl.style.borderColor = '#e74c3c';
            
            setTimeout(() => {
                imgEl.style.borderColor = '';
                textEl.style.borderColor = '';
                imgEl.classList.remove('selected');
                textEl.classList.remove('selected');
                selectedImageId = null;
                selectedTextId = null;
            }, 500);
            
            if (currentLives <= 0) {
                setTimeout(() => {
                    if (typeof PlayerStorage !== 'undefined' && currentPlayer) {
                        PlayerStorage.showBuyLivesModal(currentPlayer, currentLives, currentScore, 
                            (newLives, newScore) => {
                                currentLives = newLives;
                                currentScore = newScore;
                                updateUI();
                            },
                            () => {
                                alert("Game Over! Try again.");
                                window.location.href = 'index.html?showTopicMap=' + levelId;
                            }
                        );
                    } else {
                        alert("Game Over! Try again.");
                        window.location.href = 'index.html?showTopicMap=' + levelId;
                    }
                }, 500);
            }
        }
    }
}

function drawLine(el1, el2) {
    const svg = document.getElementById('line-canvas');
    const rect1 = el1.getBoundingClientRect();
    const rect2 = el2.getBoundingClientRect();
    
    const x1 = rect1.right;
    const y1 = rect1.top + rect1.height / 2;
    
    const x2 = rect2.left;
    const y2 = rect2.top + rect2.height / 2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#2ecc71');
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    
    svg.appendChild(line);
}

function playSound(type) {
    let url = '';
    if (type === 'correct') url = 'sounds/correct.mp3';
    if (type === 'wrong') url = 'sounds/wrong.mp3';
    if (type === 'pop') url = 'sounds/pop.mp3';
    
    if (url) {
        const audio = new Audio(url);
        audio.play().catch(e => console.log(e));
    }
}

function updateUI() {
    let hearts = "";
    for(let i = 0; i < currentLives; i++) hearts += "❤️ ";
    document.getElementById('lives').innerText = hearts || "💔";
    document.getElementById('score-count').innerText = currentScore;
}

function showGameOver() {
    playSound('correct'); // Fanfare
    
    if (typeof PlayerStorage !== 'undefined' && currentPlayer) {
        let disableSpelling = false;
        if (typeof ZoneStorage !== 'undefined') {
            const zone = ZoneStorage.getZone(levelId);
            if (zone && zone.disableSpelling) disableSpelling = true;
        }
        const cacheBuster = '&v=' + Date.now();
        const nextUrl = levelId ? (disableSpelling ? `shuffle.html?level=${levelId}${cacheBuster}` : `spell.html?level=${levelId}${cacheBuster}`) : null;
        PlayerStorage.showSuccessModal(
            currentPlayer, 
            currentLives, 
            currentScore, 
            levelId, 
            's3', // Stage 3 is Match
            nextUrl
        );
    } else {
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
}

document.getElementById('btn-finish').addEventListener('click', () => {
    window.location.href = 'index.html?openPopup=' + levelId;
});

window.addEventListener('resize', () => {
    // Redraw lines on window resize
    const svg = document.getElementById('line-canvas');
    svg.setAttribute('width', window.innerWidth);
    svg.setAttribute('height', window.innerHeight);
    svg.innerHTML = '';
    
    document.querySelectorAll('.img-item.matched').forEach(imgEl => {
        const id = imgEl.dataset.id;
        const textEl = document.getElementById(`text-${id}`);
        if(textEl && textEl.classList.contains('matched')) {
            drawLine(imgEl, textEl);
        }
    });
});

document.getElementById('btn-quit-zone')?.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    window.location.href = 'index.html?showTopicMap=' + levelId;
});

window.onload = initMatch;
