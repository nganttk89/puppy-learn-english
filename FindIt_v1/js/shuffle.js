let quizData = [];
let quizSequence = [];
let currentTurnIndex = 0;
let scoreRed = 0;
let scoreBlue = 0;
let currentTeam = 'red'; // 'red' or 'blue'
let correctCupIndex = -1;
let isShuffling = false;

// Audio context for sound effects
let audioCtx = null;
function playClackSound() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Synthesize a quick wooden 'clack' or 'tick' sound
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function speakWord(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'en-US'; 
        msg.rate = 0.85;
        window.speechSynthesis.speak(msg);
    }
}

document.getElementById('btn-quit-zone')?.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    window.location.href = 'index.html?showTopicMap=' + (levelId || '');
});

document.getElementById('target-word')?.addEventListener('click', () => {
    if (quizSequence[currentTurnIndex]) {
        speakWord(quizSequence[currentTurnIndex].text);
    }
});

async function initShuffle() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    
    if (!levelId) {
        window.location.href = 'index.html';
        return;
    }

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
            window.currentScene = scene;
            if (scene && scene.objects && scene.objects.length > 0) {
                const uniqueNames = new Set();
                quizData = [];
                for (let obj of scene.objects) {
                    const lowerName = obj.name.toLowerCase().trim();
                    if (obj.image && !uniqueNames.has(lowerName)) {
                        uniqueNames.add(lowerName);
                        quizData.push({ id: obj.id, text: obj.name, image: obj.image });
                    }
                }
            }
        }
    }

    if (quizData.length === 0) {
        alert("No vocab data found for this level.");
        return;
    }

    setupGameSequence();
    
    // Show ready modal instead of starting turn immediately
    document.getElementById('ready-modal').classList.remove('hidden');
}

document.getElementById('btn-start-play')?.addEventListener('click', () => {
    document.getElementById('ready-modal').classList.add('hidden');
    startTurn();
});

function setupGameSequence() {
    // Copy vocab
    quizSequence = [...quizData];
    // Shuffle the array
    quizSequence.sort(() => Math.random() - 0.5);
    
    // Ensure even length so both teams get equal turns
    if (quizSequence.length % 2 !== 0) {
        // pick a random word from original quizData and append
        const randomWord = quizData[Math.floor(Math.random() * quizData.length)];
        quizSequence.push(randomWord);
    }
    
    // Optional: shuffle again just in case the duplicated word is at the end
    quizSequence.sort(() => Math.random() - 0.5);
}

function startTurn() {
    if (currentTurnIndex >= quizSequence.length) {
        endGame();
        return;
    }

    // Lock clicks while showing the initial images
    isShuffling = true;
    currentTeam = (currentTurnIndex % 2 === 0) ? 'red' : 'blue';
    
    const turnDisplay = document.getElementById('turn-display');
    if (currentTeam === 'red') {
        turnDisplay.className = 'turn-indicator active-turn-red';
        turnDisplay.innerText = "🔴 Red Team's Turn!";
    } else {
        turnDisplay.className = 'turn-indicator active-turn-blue';
        turnDisplay.innerText = "🔵 Blue Team's Turn!";
    }

    const currentWord = quizSequence[currentTurnIndex];
    const wordDisplay = document.getElementById('target-word');
    wordDisplay.innerText = currentWord.text + " 🔊";
    
    // Trigger word drop animation
    wordDisplay.classList.remove('drop-word-anim');
    void wordDisplay.offsetWidth; // trigger reflow
    wordDisplay.classList.add('drop-word-anim');
    
    // Play sound right as it drops or after a tiny delay
    setTimeout(() => {
        speakWord(currentWord.text);
    }, 400);

    // Setup the cups (hidden first)
    setupCups(currentWord);
}

function setupCups(correctWord) {
    const wrapper = document.getElementById('cups-wrapper');
    wrapper.innerHTML = ''; // Clear previous

    // Pick 2 wrong words
    let wrongWords = quizData.filter(w => w.text !== correctWord.text);
    wrongWords.sort(() => Math.random() - 0.5);
    const selectedWrong = wrongWords.slice(0, 2);
    
    // 3 options total
    let options = [correctWord, selectedWrong[0], selectedWrong[1]];
    options.sort(() => Math.random() - 0.5); // Shuffle initially

    correctCupIndex = options.findIndex(o => o.text === correctWord.text);

    // Create DOM elements for the 3 slots
    for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'cup-slot';
        slot.style.left = getLeftPos(i) + 'px';
        slot.dataset.pos = i;
        slot.dataset.index = i; // actual logical index (0,1,2)

        const hiddenImg = document.createElement('img');
        hiddenImg.src = options[i].image;
        hiddenImg.className = 'hidden-item';

        const cupImg = document.createElement('img');
        cupImg.src = 'images/shuffle/cup.jpg';
        cupImg.className = 'cup-image';
        cupImg.style.opacity = '0'; // Hide cup initially
        cupImg.style.top = '-300px'; // Prepare for drop
        
        slot.appendChild(hiddenImg);
        slot.appendChild(cupImg);

        // Click handler
        slot.onclick = () => handleCupClick(i, slot);
        
        wrapper.appendChild(slot);
    }

    // After 2 seconds (letting player see answers), drop cups
    setTimeout(() => {
        // Hide the hidden items completely so they don't show through the blend mode!
        const items = document.querySelectorAll('.hidden-item');
        items.forEach(i => i.style.opacity = '0');

        const cups = document.querySelectorAll('.cup-image');
        cups.forEach(c => {
            c.classList.add('drop-cup-anim');
        });
        
        // After cups drop (0.5s), start shuffling
        setTimeout(startShuffle, 600);
    }, 3500); // 3.5s from start of turn
}

function getLeftPos(posIndex) {
    // 3 positions: left, center, right inside an 800px wrapper
    // let's say width is 200px each.
    // Pos 0: 50px
    // Pos 1: 300px
    // Pos 2: 550px
    if (posIndex === 0) return 50;
    if (posIndex === 1) return 300;
    return 550;
}

function startShuffle() {
    isShuffling = true;
    const slots = Array.from(document.querySelectorAll('.cup-slot'));
    
    let shuffleCount = 0;
    const maxShuffles = 8 + Math.floor(Math.random() * 4); // 8 to 11 shuffles
    const shuffleSpeed = 400; // ms

    const shuffleInterval = setInterval(() => {
        if (shuffleCount >= maxShuffles) {
            clearInterval(shuffleInterval);
            isShuffling = false;
            return;
        }

        // Pick 2 random positions to swap
        let p1 = Math.floor(Math.random() * 3);
        let p2 = Math.floor(Math.random() * 3);
        while (p1 === p2) {
            p2 = Math.floor(Math.random() * 3);
        }

        const slot1 = slots.find(s => parseInt(s.dataset.pos) === p1);
        const slot2 = slots.find(s => parseInt(s.dataset.pos) === p2);

        // Swap their left positions
        slot1.style.left = getLeftPos(p2) + 'px';
        slot2.style.left = getLeftPos(p1) + 'px';

        // Swap data-pos
        slot1.dataset.pos = p2;
        slot2.dataset.pos = p1;

        playClackSound();

        shuffleCount++;
    }, shuffleSpeed);
}

function handleCupClick(index, slotElement) {
    if (isShuffling) return; // Prevent clicking while shuffling
    
    // Lift the cup
    slotElement.classList.add('lift-cup');
    // Reveal the hidden item
    slotElement.querySelector('.hidden-item').style.opacity = '1';
    
    isShuffling = true; // Lock further clicks

    setTimeout(() => {
        if (index === correctCupIndex) {
            // Correct guess
            const audio = new Audio('sounds/correct.mp3');
            audio.play().catch(e=>console.log(e));
            setTimeout(showGiftModal, 1000);
        } else {
            // Wrong guess
            const audio = new Audio('sounds/wrong.mp3');
            audio.play().catch(e=>console.log(e));
            // Lose turn, move to next
            setTimeout(() => {
                currentTurnIndex++;
                startTurn();
            }, 2000);
        }
    }, 500);
}

let pickedReward = 0;

function showGiftModal() {
    document.getElementById('gift-modal').classList.remove('hidden');
    document.getElementById('gift-boxes-area').style.display = 'flex';
    document.getElementById('reward-result-area').style.display = 'none';
    document.getElementById('gift-title').innerText = "Correct! 🎉";
}

function pickGift(boxIndex) {
    // Generate reward: 1, 2, or 3 apples
    pickedReward = Math.floor(Math.random() * 3) + 1;
    
    document.getElementById('gift-boxes-area').style.display = 'none';
    
    const resultArea = document.getElementById('reward-result-area');
    resultArea.style.display = 'flex';
    
    document.getElementById('reward-text').innerText = `+${pickedReward} Apple${pickedReward > 1 ? 's' : ''}!`;
    
    const applesContainer = document.getElementById('reward-apples-container');
    applesContainer.innerHTML = '';
    for (let i=0; i<pickedReward; i++) {
        const img = document.createElement('img');
        img.src = 'images/shuffle/apple.jpg';
        img.className = 'reward-apple-icon';
        img.style.animationDelay = (i * 0.2) + 's';
        applesContainer.appendChild(img);
    }
    
    // Update score
    if (currentTeam === 'red') {
        scoreRed += pickedReward;
        document.getElementById('score-red').innerText = scoreRed;
    } else {
        scoreBlue += pickedReward;
        document.getElementById('score-blue').innerText = scoreBlue;
    }
    
    // Play joyful sound and speak congratulation
    const rewardAudio = new Audio('sounds/success.mp3');
    rewardAudio.play().catch(e => console.log(e));
    
    if ('speechSynthesis' in window) {
        const appleWord = pickedReward > 1 ? 'apples' : 'apple';
        const msg = new SpeechSynthesisUtterance(`Congratulations, you got ${pickedReward} ${appleWord}!`);
        msg.lang = 'en-US';
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
    }
}

window.nextTurn = function() {
    document.getElementById('gift-modal').classList.add('hidden');
    currentTurnIndex++;
    startTurn();
}

function endGame() {
    document.getElementById('victory-modal').classList.remove('hidden');
    
    const vicText = document.getElementById('victory-text');
    if (scoreRed > scoreBlue) {
        vicText.innerText = `🔴 Red Team Wins! (${scoreRed} to ${scoreBlue})`;
    } else if (scoreBlue > scoreRed) {
        vicText.innerText = `🔵 Blue Team Wins! (${scoreBlue} to ${scoreRed})`;
    } else {
        vicText.innerText = `🤝 It's a Tie! (${scoreRed} each)`;
    }

    // Play win sound
    const winAudio = new Audio('sounds/success.mp3'); // or similar
    winAudio.play().catch(e=>console.log(e));
}

document.getElementById('btn-replay')?.addEventListener('click', () => {
    document.getElementById('victory-modal').classList.add('hidden');
    currentTurnIndex = 0;
    scoreRed = 0;
    scoreBlue = 0;
    document.getElementById('score-red').innerText = '0';
    document.getElementById('score-blue').innerText = '0';
    setupGameSequence();
    startTurn();
});

document.getElementById('btn-back-map')?.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    window.location.href = 'index.html?showTopicMap=' + (levelId || '');
});

window.onload = initShuffle;
