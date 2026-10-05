let quizData = [];
let quizSequence = [];
let currentQIndex = 0;
let currentCorrectAnswer = null;
let currentLives = 3;
let currentScore = 0;
let currentPlayer = null;

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

async function initQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    const previewId = urlParams.get('previewId');
    
    try {
        if (typeof window.scenes === 'undefined' || window.scenes.length === 0) {
            const res = await fetch('data/scenes.json?v=' + Date.now());
            window.scenes = await res.json();
            SceneStorage.getScenes(); // Trigger storage merge
        }
        if (typeof window.zones === 'undefined' || window.zones.length === 0) {
            const res2 = await fetch('data/zones.json?v=' + Date.now());
            window.zones = await res2.json();
            ZoneStorage.getZones(); // Trigger storage merge
        }
        if (typeof window.questionSets === 'undefined') {
            const res3 = await fetch('data/question_sets.json?v=' + Date.now());
            if (res3.ok) window.questionSets = await res3.json();
        }
    } catch(e) {
        console.error("Failed to load data in routine", e);
    }
    
    // Fallback to default
    quizData = [
        { id: 'wake', order: 1, text: 'Wake Up', image: 'images/routines/wake.jpg' },
        { id: 'brush', order: 2, text: 'Brush Teeth', image: 'images/routines/brush.jpg' },
        { id: 'dress', order: 3, text: 'Get Dressed', image: 'images/routines/dress.jpg' },
        { id: 'eat', order: 4, text: 'Eat Breakfast', image: 'images/routines/eat.jpg' }
    ];
    
    if (previewId && typeof SceneStorage !== 'undefined') {
        const scene = SceneStorage.getScene(previewId);
        window.currentScene = scene;
        if (scene && scene.objects && scene.objects.length > 0) {
            quizData = scene.objects.map(obj => ({ id: obj.id, text: obj.name, image: obj.image }));
        }
    } else if (levelId && typeof ZoneStorage !== 'undefined') {
        const lvl = ZoneStorage.getZone(levelId);
        if (lvl && lvl.questions && lvl.questions.length > 0) {
            const qId = lvl.questions[0];
            const scene = SceneStorage.getScene(qId);
            window.currentScene = scene;
            if (scene) {
                if (scene.objects && scene.objects.length > 0) {
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
                if (scene.character && scene.character !== 'images/puppy.png') {
                    const charImg = document.getElementById('puppy-character');
                    const svgPuppy = document.getElementById('svg-puppy');
                    if (charImg) {
                        charImg.src = scene.character;
                        charImg.style.display = 'block';
                        if (svgPuppy) svgPuppy.style.display = 'none';
                    }
                } else {
                    const charImg = document.getElementById('puppy-character');
                    const svgPuppy = document.getElementById('svg-puppy');
                    if (charImg) charImg.style.display = 'none';
                    if (svgPuppy) svgPuppy.style.display = 'block';
                }
            }
        }
    }
    
    if (typeof PlayerStorage !== 'undefined') {
        currentPlayer = PlayerStorage.getPlayer();
        if (currentPlayer) {
            currentLives = currentPlayer.progress.lives;
            currentScore = currentPlayer.progress.score;
        }
    }

    quizSequence = [...quizData].sort(() => Math.random() - 0.5);
    
    if (quizSequence.length < 2) {
        alert("Not enough vocabularies with images for Quiz! Please add images in Admin.");
        window.location.href = 'index.html?showTopicMap=' + levelId;
        return;
    }
    
    updateProgress();
    updateUI();
    showQuestion();
    
    // Attempt to play music automatically (might be blocked by browser until interaction)
    playBGM();
}

function updateUI() {
    let hearts = "";
    for(let i = 0; i < currentLives; i++) hearts += "❤️ ";
    document.getElementById('lives').innerText = hearts || "💔";
    document.getElementById('score-count').innerText = currentScore;
}

let currentSpokenText = "";

function showQuestion() {
    const q = quizSequence[currentQIndex];
    currentCorrectAnswer = q.id;
    
    // Always use TEXT_TO_IMG since the user wants to find the picture, not the word
    const mode = 'TEXT_TO_IMG';
    
    const questionText = document.getElementById('question-text');
    const questionImage = document.getElementById('question-image');
    const answersContainer = document.getElementById('answers-container');
    
    answersContainer.innerHTML = '';
    
    // Generate 4 options (including the correct one)
    let options = [q];
    let others = quizData.filter(item => item.id !== q.id).sort(() => Math.random() - 0.5);
    options = options.concat(others.slice(0, 3));
    options.sort(() => Math.random() - 0.5);

    const templates = [
        "Which one is {word}?",
        "Can you find {word}?",
        "Where is {word}?",
        "Point to {word}."
    ];
    
    let template;
    const scene = window.currentScene;
    if (scene) {
        if (scene.questionSetId === 'none') {
            template = "{word}";
        } else if (scene.questionSetId && typeof window.questionSets !== 'undefined') {
            const qset = window.questionSets.find(s => s.id === scene.questionSetId);
            if (qset && qset.questions && qset.questions.length > 0) {
                template = qset.questions[Math.floor(Math.random() * qset.questions.length)].replace("{name}", "{word}");
            }
        }
        if (!template && scene.questionTemplates && scene.questionTemplates.length > 0) {
            template = scene.questionTemplates[Math.floor(Math.random() * scene.questionTemplates.length)].replace("{name}", "{word}");
        }
    }
    
    if (!template) {
        if (q.text.startsWith("I ")) {
            const sentenceTemplates = [
                "Listen and choose: {word}",
                "Which one is: {word}?",
                "Can you match: {word}?"
            ];
            template = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
        } else {
            template = templates[Math.floor(Math.random() * templates.length)];
        }
    }

    const spokenQuestion = template.replace("{word}", q.text);
    const writtenQuestion = template.replace("{word}", `<strong style="color:#e74c3c;">${q.text}</strong>`);

    if (mode === 'TEXT_TO_IMG') {
        questionImage.style.display = 'none';
        questionText.innerHTML = writtenQuestion;
        
        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'ans-img-btn';
            btn.innerHTML = `<img src="${opt.image}">`;
            btn.onclick = () => checkAnswer(opt.id, btn);
            answersContainer.appendChild(btn);
        });
        
        currentSpokenText = spokenQuestion;
        speakWord(currentSpokenText);
    }
}

function checkAnswer(selectedId, btnElement) {
    if (selectedId === currentCorrectAnswer) {
        btnElement.classList.add('correct-anim');
        playCorrectSound();
        currentScore += 10;
        updateUI();
        
        const svgPuppy = document.getElementById('svg-puppy');
        if (svgPuppy) {
            svgPuppy.classList.remove('idle');
            svgPuppy.classList.add('happy');
        }
        
        // Praise
        const praises = ["Great job!", "Excellent!", "Awesome!", "Perfect!", "Well done!"];
        const praise = praises[Math.floor(Math.random() * praises.length)];
        document.getElementById('question-text').innerHTML = `<span style="color:#00b894;">${praise}</span>`;
        speakWord(praise);
        
        // Disable clicks
        document.getElementById('answers-container').style.pointerEvents = 'none';
        
        setTimeout(() => {
            currentQIndex++;
            updateProgress();
            document.getElementById('answers-container').style.pointerEvents = 'auto';
            
            if (currentQIndex >= quizSequence.length) {
                showSuccess();
            } else {
                showQuestion();
            }
        }, 1000);
    } else {
        btnElement.classList.add('wrong-anim');
        playWrongSound();
        
        const svgPuppy = document.getElementById('svg-puppy');
        if (svgPuppy) {
            svgPuppy.classList.remove('idle', 'happy');
            svgPuppy.classList.add('sad');
            setTimeout(() => {
                svgPuppy.classList.remove('sad');
                svgPuppy.classList.add('idle');
            }, 600);
        }
        
        currentLives--;
        updateUI();
        
        if (currentPlayer) {
            currentPlayer.progress.lives = currentLives;
            currentPlayer.progress.score = currentScore;
            PlayerStorage.savePlayer(currentPlayer.playerName, currentPlayer.progress);
        }
        
        if (currentLives <= 0) {
            if (typeof PlayerStorage !== 'undefined' && currentPlayer) {
                PlayerStorage.showBuyLivesModal(currentPlayer, currentLives, currentScore, 
                    (newLives, newScore) => {
                        // User bought lives
                        currentLives = newLives;
                        currentScore = newScore;
                        updateUI();
                        btnElement.classList.remove('wrong-anim');
                    },
                    () => {
                        // User canceled/quit
                        alert('Game Over! You have no more lives. Try again later!');
                        window.location.href = 'index.html?showTopicMap=' + levelId;
                    }
                );
            } else {
                alert('Game Over! You have no more lives. Try again later!');
                window.location.href = 'index.html?showTopicMap=' + levelId;
            }
            return;
        }
        
        setTimeout(() => btnElement.classList.remove('wrong-anim'), 500);
    }
}

function updateProgress() {
    const pct = (currentQIndex / quizSequence.length) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
}

function speakWord(word) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(word);
        msg.lang = 'en-US';
        window.speechSynthesis.speak(msg);
    }
}

function playCorrectSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
}

function playWrongSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2); 
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}

function showSuccess() {
    playCorrectSound();
    
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    
    if (typeof PlayerStorage !== 'undefined' && currentPlayer) {
        const cacheBuster = '&v=' + Date.now();
        const nextUrl = levelId ? `index.html?openPopup=${levelId}${cacheBuster}` : null;
        PlayerStorage.showSuccessModal(
            currentPlayer, 
            currentLives, 
            currentScore, 
            levelId, 
            's1', // Stage 1 is Flashcards
            nextUrl
        );
    } else {
        // Fallback
        document.getElementById('success-overlay').style.display = 'flex';
        if (levelId) {
            setTimeout(() => {
                window.location.href = 'index.html?openPopup=' + levelId;
            }, 1500);
        }
    }
}

window.replayAudio = function() {
    if (currentSpokenText) speakWord(currentSpokenText);
}

document.getElementById('btn-quit-zone')?.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const levelId = urlParams.get('level');
    window.location.href = 'index.html?showTopicMap=' + levelId;
});

window.onload = initQuiz;
