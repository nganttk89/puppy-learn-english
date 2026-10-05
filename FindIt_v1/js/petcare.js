let player = null;

function initPetCare() {
    player = PlayerStorage.getPlayer();
    if (!player) {
        PlayerStorage.savePlayer("Guest", { lives: 3, score: 0, completedLevels: [], lastUpdate: Date.now() });
        player = PlayerStorage.getPlayer();
    }
    
    // Simulate offline progress immediately on load
    tickDecay(true);
    
    updateUI();
    changeRoom('bedroom');
    startPetLoop();
}

function updateUI() {
    document.getElementById('coin-count').innerText = player.progress.score;
    
    const p = player.progress.pet;
    if (p) {
        document.getElementById('fill-fullness').style.width = p.fullness + '%';
        document.getElementById('fill-happiness').style.width = p.happiness + '%';
        document.getElementById('fill-hygiene').style.width = p.hygiene + '%';
        document.getElementById('fill-energy').style.width = p.energy + '%';
    }
}

function changeRoom(roomName) {
    const roomArea = document.getElementById('room-area');
    roomArea.className = 'room-' + roomName;
    
    // Hide menus
    document.getElementById('kitchen-menu').style.display = 'none';
    document.getElementById('garden-menu').style.display = 'none';
    document.getElementById('bathroom-menu').style.display = 'none';
    document.getElementById('room-clock').style.display = 'none';
    document.getElementById('wardrobe-hotspot').style.display = 'none';
    
    // Reset puppy
    const petSvg = document.getElementById('svg-puppy');
    petSvg.classList.remove('idle', 'asking', 'happy');
    petSvg.classList.add('idle');
    const existingZzz = document.querySelector('.zzz-bubble');
    if (existingZzz) existingZzz.remove();
    
    if (roomName === 'bedroom') {
        document.getElementById('room-clock').style.display = 'block';
        document.getElementById('wardrobe-hotspot').style.display = 'block';
        
        // Sleep animation
        const zzz = document.createElement('div');
        zzz.className = 'zzz-bubble';
        zzz.innerText = 'Zzz...';
        zzz.style.position = 'absolute';
        zzz.style.top = '-20px';
        zzz.style.right = '0px';
        zzz.style.fontSize = '2.5em';
        zzz.style.color = '#74b9ff';
        zzz.style.fontWeight = 'bold';
        zzz.style.fontFamily = "'Fredoka One', cursive";
        zzz.style.textShadow = "2px 2px 0px white";
        zzz.style.animation = 'floatUp 2.5s infinite';
        
        if (!document.getElementById('zzz-style')) {
            const style = document.createElement('style');
            style.id = 'zzz-style';
            style.innerHTML = '@keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-50px) scale(1.5); opacity: 0; } }';
            document.head.appendChild(style);
        }
        
        document.getElementById('pet').appendChild(zzz);
        speakWord("Good night!");
        
    } else if (roomName === 'kitchen') {
        document.getElementById('kitchen-menu').style.display = 'flex';
        speakWord("Yummy food!");
    } else if (roomName === 'garden') {
        document.getElementById('garden-menu').style.display = 'flex';
        speakWord("Let's play!");
    } else if (roomName === 'bathroom') {
        document.getElementById('bathroom-menu').style.display = 'flex';
        speakWord("Wash wash wash!");
    }
    
    startAmbientEffects(roomName);
}

let ambientInterval = null;

function startAmbientEffects(roomName) {
    if (ambientInterval) clearInterval(ambientInterval);
    
    ambientInterval = setInterval(() => {
        const roomArea = document.getElementById('room-area');
        if (!roomArea) return;
        
        const effect = document.createElement('div');
        
        let emoji = '';
        let startX = Math.random() * roomArea.clientWidth;
        let startY = 0;
        let animationName = '';
        let duration = 0;
        
        if (roomName === 'garden') {
            if (Math.random() > 0.5) {
                emoji = '🦋';
                startY = Math.random() * roomArea.clientHeight * 0.5;
                animationName = 'flutter';
                duration = 4000 + Math.random() * 2000;
            } else {
                emoji = '☁️';
                startX = -100;
                startY = Math.random() * 150;
                animationName = 'driftRight';
                duration = 15000 + Math.random() * 5000;
                effect.style.opacity = '0.7';
                effect.style.fontSize = '4em';
            }
        } else if (roomName === 'bathroom') {
            emoji = '🫧';
            startX = roomArea.clientWidth / 2 + (Math.random() * 300 - 150);
            startY = roomArea.clientHeight - 100;
            animationName = 'floatUpSlow';
            duration = 3000 + Math.random() * 2000;
        } else if (roomName === 'kitchen') {
            emoji = '💨';
            startX = roomArea.clientWidth / 2 + (Math.random() * 200 - 100);
            startY = roomArea.clientHeight - 200;
            animationName = 'steamRise';
            duration = 2000 + Math.random() * 1000;
            effect.style.opacity = '0.4';
        } else if (roomName === 'bedroom') {
            emoji = '✨';
            startY = Math.random() * roomArea.clientHeight;
            animationName = 'twinkleFloat';
            duration = 3000 + Math.random() * 2000;
            effect.style.opacity = '0.6';
        }
        
        if (!emoji) return;
        
        effect.innerText = emoji;
        effect.style.position = 'absolute';
        effect.style.left = startX + 'px';
        effect.style.top = startY + 'px';
        effect.style.pointerEvents = 'none';
        effect.style.zIndex = '1';
        effect.style.animation = `${animationName} ${duration}ms linear forwards`;
        
        roomArea.appendChild(effect);
        
        setTimeout(() => {
            if(effect.parentNode) effect.parentNode.removeChild(effect);
        }, duration);
        
    }, 1500);
}

function updateClock() {
    const clock = document.getElementById('room-clock');
    if (!clock) return;
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    clock.innerText = hours + ':' + mins;
}

setInterval(updateClock, 1000);
updateClock();

function openWardrobe() {
    showMessage("The wardrobe is locked! More outfits coming soon!");
    speakWord("Oh! It's locked!");
}

let petLoopInterval = null;

function tickDecay(isOffline = false) {
    let p = player.progress.pet;
    if (!p) return;
    
    let now = Date.now();
    let elapsed = now - p.lastTick;
    // 1 point per 30 seconds
    let pointsToDecay = Math.floor(elapsed / 30000); 
    
    if (pointsToDecay > 0) {
        p.fullness = Math.max(0, p.fullness - pointsToDecay);
        p.happiness = Math.max(0, p.happiness - pointsToDecay);
        p.hygiene = Math.max(0, p.hygiene - pointsToDecay);
        
        if (!isOffline && document.getElementById('room-area').classList.contains('room-bedroom') && document.querySelector('.zzz-bubble')) {
            p.energy = Math.min(100, p.energy + pointsToDecay * 10);
        } else {
            p.energy = Math.max(0, p.energy - Math.floor(pointsToDecay / 2));
        }
        
        p.lastTick = now;
        PlayerStorage.savePlayer(player.playerName, player.progress);
        
        updateUI();
        updateMood();
    }
}

function startPetLoop() {
    if (petLoopInterval) clearInterval(petLoopInterval);
    petLoopInterval = setInterval(() => {
        tickDecay();
    }, 1000);
}

function updateMood() {
    let p = player.progress.pet;
    if (!p || currentAction) return;
    
    const petSvg = document.getElementById('svg-puppy');
    if (petSvg.classList.contains('happy') || document.querySelector('.zzz-bubble')) return;
    
    if (p.fullness < 30 || p.happiness < 30 || p.hygiene < 30 || p.energy < 30) {
        petSvg.classList.remove('idle');
        petSvg.classList.add('sad');
    } else {
        petSvg.classList.remove('sad');
        petSvg.classList.add('idle');
    }
}

function showMessage(text) {
    const msgBox = document.getElementById('message-box');
    msgBox.innerText = text;
    msgBox.style.display = 'block';
    setTimeout(() => {
        msgBox.style.display = 'none';
    }, 4000);
}

function spawnBubble(emoji, startX, startY, angle, distance) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerText = emoji;
    
    // Calculate end position based on angle and distance
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance - 50;
    
    bubble.style.left = startX + 'px';
    bubble.style.top = startY + 'px';
    bubble.style.setProperty('--end-x', endX + 'px');
    bubble.style.setProperty('--end-y', endY + 'px');
    
    document.getElementById('room-area').appendChild(bubble);
    
    setTimeout(() => bubble.remove(), 1500);
}

let currentAction = null;
let currentCost = 0;
let currentEmoji = '';

function buyItem(action, cost, emoji) {
    if (player.progress.score < cost) {
        showMessage("Not enough coins! Go play games to earn more!");
        speakWord("Oh no! Not enough coins. Let's play games to get more!");
        return;
    }
    
    // Spawn draggable item
    currentAction = action;
    currentCost = cost;
    currentEmoji = emoji;
    
    const dragItem = document.getElementById('drag-item');
    const hint = document.getElementById('drop-hint');
    
    dragItem.innerText = emoji;
    dragItem.style.display = 'block';
    
    // Position it in the middle of the room
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    dragItem.style.left = (containerRect.width / 2 - 40) + 'px';
    dragItem.style.top = (containerRect.height / 2 - 40) + 'px';
    
    hint.style.display = 'block';
}

function processAction() {
    if (!currentAction) return;
    
    // Increase stats
    let p = player.progress.pet;
    if (p) {
        if (currentAction === 'feed') p.fullness = Math.min(100, p.fullness + 30);
        else if (currentAction === 'wash') p.hygiene = Math.min(100, p.hygiene + 40);
        else if (currentAction === 'play') p.happiness = Math.min(100, p.happiness + 30);
        
        p.lastTick = Date.now();
        PlayerStorage.savePlayer(player.playerName, player.progress);
    }
    
    updateUI();
    
    // Play sound
    playSound();
    
    // Animate pet
    const petSvg = document.getElementById('svg-puppy');
    petSvg.classList.remove('idle');
    petSvg.classList.add('happy');
    
    // Add glow effect to room
    const room = document.getElementById('room-area');
    room.classList.add('glow-anim');
    setTimeout(() => room.classList.remove('glow-anim'), 1000);
    
    // Spawn particles around pet in a burst
    const petRect = document.getElementById('pet').getBoundingClientRect();
    const roomRect = document.getElementById('room-area').getBoundingClientRect();
    const centerX = petRect.left - roomRect.left + petRect.width / 2 - 20;
    const centerY = petRect.top - roomRect.top + petRect.height / 2;
    
    let extraEmojis = [];
    if (currentAction === 'feed') extraEmojis = [currentEmoji, '😋', '⭐', '✨'];
    else if (currentAction === 'wash') extraEmojis = [currentEmoji, '🫧', '✨', '💦'];
    else if (currentAction === 'play') extraEmojis = [currentEmoji, '⭐', '✨', '🐶'];
    
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i;
        const distance = 80 + Math.random() * 60;
        const randEmoji = extraEmojis[Math.floor(Math.random() * extraEmojis.length)];
        
        setTimeout(() => {
            spawnBubble(randEmoji, centerX, centerY, angle, distance);
        }, Math.random() * 200);
    }
    
    // Special animations based on action
    if (currentAction === 'feed') {
        speakWord("Yummy!");
    } else if (currentAction === 'wash') {
        speakWord("So clean!");
    } else if (currentAction === 'play') {
        speakWord("So fun!");
    }
    
    setTimeout(() => {
        petSvg.classList.remove('happy');
        petSvg.classList.add('idle');
    }, 1500);
    
    currentAction = null;
}


function playSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
}

function speakWord(word) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(word);
        msg.lang = 'en-US';
        msg.pitch = 1.5;
        window.speechSynthesis.speak(msg);
    }
}

// --- Drag and Drop Logic ---
const dragItem = document.getElementById('drag-item');
const petEl = document.getElementById('pet');
const hint = document.getElementById('drop-hint');

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

dragItem.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragItem.setPointerCapture(e.pointerId);
    
    const rect = dragItem.getBoundingClientRect();
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
});

dragItem.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    
    let newLeft = e.clientX - containerRect.left - offsetX;
    let newTop = e.clientY - containerRect.top - offsetY;
    
    dragItem.style.left = newLeft + 'px';
    dragItem.style.top = newTop + 'px';
});

dragItem.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    dragItem.releasePointerCapture(e.pointerId);
    
    // Check collision with pet
    const itemRect = dragItem.getBoundingClientRect();
    const targetRect = petEl.getBoundingClientRect();
    
    if (itemRect.right > targetRect.left && 
        itemRect.left < targetRect.right && 
        itemRect.bottom > targetRect.top && 
        itemRect.top < targetRect.bottom) {
        // Successful drop!
        dragItem.style.display = 'none';
        hint.style.display = 'none';
        processAction();
    } else {
        // Return to start
        dragItem.style.display = 'none';
        hint.style.display = 'none';
        currentAction = null; // Cancel
    }
});

window.onload = initPetCare;
