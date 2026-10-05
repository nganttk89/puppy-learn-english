let spellData = [];
let currentWordIndex = 0;
let currentWord = "";
let currentSpelled = "";
let currentLives = 3;
let currentScore = 0;
let currentPlayer = null;
let levelId = null;

let isMusicPlaying = false;
let musicPref = localStorage.getItem('musicPref') || 'on';
const bgMusic = new Audio('sounds/bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.15;

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
        });
    }
}

async function initSpell() {
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
                
                // Take all valid objects for spelling
                let shuffledObjects = validObjects.sort(() => 0.5 - Math.random());
                spellData = shuffledObjects;
            }
        }
    }
    
    if (spellData.length === 0) {
        alert("No suitable vocabulary found for spelling!");
        window.location.href = 'index.html?showTopicMap=' + levelId;
        return;
    }

    currentPlayer = typeof PlayerStorage !== 'undefined' ? PlayerStorage.getPlayer() : null;
    if (currentPlayer) {
        currentLives = currentPlayer.progress.lives || 3;
        currentScore = currentPlayer.progress.score || 0;
    }
    
    updateUI();
    loadCurrentWord();
    
    document.body.addEventListener('click', playBGM, { once: true });
}


let currentSlots = []; // track letters in slots

function loadCurrentWord() {
    const item = spellData[currentWordIndex];
    currentWord = item.name.toLowerCase();
    currentSlots = new Array(currentWord.length).fill(null);
    
    document.getElementById('spell-image').src = item.image;
    
    // Show Submit/Clear buttons
    document.getElementById('btn-submit').style.display = 'block';
    document.getElementById('btn-clear').style.display = 'block';
    
    // Render slots
    const slotsContainer = document.getElementById('slots-container');
    slotsContainer.innerHTML = '';
    
    let lettersToSpell = [];
    
    for(let i=0; i<currentWord.length; i++) {
        const char = currentWord[i];
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.id = `slot-${i}`;
        
        if (char === ' ') {
            slot.innerText = ' ';
            slot.style.border = 'none';
            slot.style.background = 'transparent';
            currentSlots[i] = { isSpace: true }; // mark as filled space
        } else {
            lettersToSpell.push(char);
        }
        
        slotsContainer.appendChild(slot);
    }
    
    // Render scrambled letters
    const lettersContainer = document.getElementById('letters-container');
    lettersContainer.innerHTML = '';
    
    const scrambled = lettersToSpell.sort(() => 0.5 - Math.random());
    scrambled.forEach((char, index) => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn';
        btn.id = `letter-btn-${index}`;
        btn.innerText = char;
        btn.onclick = () => handleLetterClick(btn, char, index);
        lettersContainer.appendChild(btn);
    });
    
    document.getElementById('btn-submit').onclick = handleSubmit;
    document.getElementById('btn-clear').onclick = handleClear;
    
    playCurrentWordAudio();
}

window.playCurrentWordAudio = function() {
    if('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(currentWord);
        msg.lang = 'en-US';
        msg.rate = 0.8;
        window.speechSynthesis.speak(msg);
    }
};

function handleLetterClick(btn, char, index) {
    if (btn.classList.contains('used')) return;
    
    // Find first empty slot
    let emptyIdx = -1;
    for(let i=0; i<currentWord.length; i++) {
        if (!currentSlots[i]) {
            emptyIdx = i;
            break;
        }
    }
    
    if (emptyIdx !== -1) {
        playSound('pop');
        btn.classList.add('used');
        currentSlots[emptyIdx] = { char: char, btnId: btn.id };
        
        const slotEl = document.getElementById(`slot-${emptyIdx}`);
        slotEl.innerText = char.toUpperCase();
        slotEl.classList.add('filled');
        slotEl.style.cursor = 'pointer';
        slotEl.onclick = () => removeLetterFromSlot(emptyIdx);
    }
}

function removeLetterFromSlot(idx) {
    if (!currentSlots[idx] || currentSlots[idx].isSpace) return;
    
    playSound('pop');
    let item = currentSlots[idx];
    
    // Restore button
    const btn = document.getElementById(item.btnId);
    if (btn) btn.classList.remove('used');
    
    currentSlots[idx] = null;
    
    // Clear slot UI
    const slotEl = document.getElementById(`slot-${idx}`);
    slotEl.innerText = '';
    slotEl.classList.remove('filled');
    slotEl.style.cursor = 'default';
    slotEl.onclick = null;
}

function handleClear() {
    for(let i=0; i<currentSlots.length; i++) {
        if (currentSlots[i] && !currentSlots[i].isSpace) {
            removeLetterFromSlot(i);
        }
    }
}

function handleSubmit() {
    // Check if fully filled
    for(let i=0; i<currentWord.length; i++) {
        if (!currentSlots[i]) {
            // Not filled completely yet
            const btnSubmit = document.getElementById('btn-submit');
            btnSubmit.classList.add('shake');
            setTimeout(() => btnSubmit.classList.remove('shake'), 500);
            return;
        }
    }
    
    // Check if correct
    let isCorrect = true;
    for(let i=0; i<currentWord.length; i++) {
        if (currentWord[i] !== ' ') {
            if (currentSlots[i].char !== currentWord[i]) {
                isCorrect = false;
                break;
            }
        }
    }
    
    if (isCorrect) {
        // Correct
        playSound('correct');
        currentScore += 5;
        document.querySelectorAll('.slot').forEach(s => s.style.borderColor = '#2ecc71');
        
        setTimeout(() => {
            currentWordIndex++;
            if (currentWordIndex < spellData.length) {
                loadCurrentWord();
            } else {
                showGameOver();
            }
        }, 1500);
        
    } else {
        // Wrong
        playSound('wrong');
        let mistakes = parseInt(sessionStorage.getItem('currentTopicMistakes') || '0');
        sessionStorage.setItem('currentTopicMistakes', mistakes + 1);
        
        currentLives -= 1;
        updateUI();
        
        // Shake slots
        document.querySelectorAll('.slot').forEach(s => {
            if (s.innerText !== ' ') {
                s.classList.add('shake');
                s.style.borderColor = '#e74c3c';
            }
        });
        
        setTimeout(() => {
            document.querySelectorAll('.slot').forEach(s => {
                if (s.innerText !== ' ') {
                    s.classList.remove('shake');
                    s.style.borderColor = '#2c3e50';
                }
            });
            handleClear(); // reset so they try again
        }, 800);
        
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
            }, 1000);
        }
    }
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
    playSound('correct'); 
    
    if (typeof PlayerStorage !== 'undefined' && currentPlayer) {
        let nextUrl = 'shuffle.html?level=' + levelId;
        
        PlayerStorage.showSuccessModal(
            currentPlayer, 
            currentLives, 
            currentScore, 
            levelId, 
            's4', // Stage 4 is Spell
            nextUrl
        );
    } else {
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
}

function getNextLevelId(currentId) {
    if (typeof ZoneStorage === 'undefined') return null;
    const regions = ZoneStorage.getZones();
    for (let rIndex = 0; rIndex < regions.length; rIndex++) {
        const region = regions[rIndex];
        if (region.subScenes) {
            const index = region.subScenes.findIndex(s => s.id === currentId);
            if (index > -1) {
                if (index < region.subScenes.length - 1) {
                    return region.subScenes[index + 1].id;
                } else if (rIndex < regions.length - 1) {
                    const nextRegion = regions[rIndex + 1];
                    if (nextRegion.subScenes && nextRegion.subScenes.length > 0) {
                        return nextRegion.subScenes[0].id;
                    }
                }
            }
        }
    }
    return null;
}

document.getElementById('btn-finish').addEventListener('click', () => {
    // Stage 4 is the final stage, so just redirect to map without popup
    window.location.href = 'index.html?showTopicMap=' + levelId;
});

document.getElementById('btn-quit-zone')?.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    window.location.href = 'index.html?showTopicMap=' + levelId;
});

window.onload = initSpell;
