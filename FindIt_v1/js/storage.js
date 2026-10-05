// js/storage.js

const SceneStorage = {
    getScenes: function() {
        let qs = window.scenes || [];
        
        // CỨU DỮ LIỆU TỪ LOCALSTORAGE (Khôi phục toạ độ của người dùng)
        let localData = localStorage.getItem('findItScenes');
        if (localData) {
            try {
                let localQs = JSON.parse(localData);
                let changed = false;
                localQs.forEach(lq => {
                    let existing = qs.find(q => q.id === lq.id);
                    if (existing) {
                        // Ưu tiên dữ liệu từ localStorage vì user đã lưu đè
                        if (lq.objects && lq.objects.length > 0) {
                            existing.objects = lq.objects;
                            changed = true;
                        }
                        if (lq.subQuestions && lq.subQuestions.length > 0) {
                            existing.subQuestions = lq.subQuestions;
                            changed = true;
                        }
                        if (lq.image) {
                            existing.image = lq.image;
                        }
                    } else {
                        qs.push(lq);
                        changed = true;
                    }
                });
                
                if (changed) {
                    this.saveScenes(qs);
                }
                // Xoá đi để không merge lại lần sau
                localStorage.removeItem('findItScenes');
            } catch(e) {
                console.error("Lỗi khi khôi phục dữ liệu:", e);
            }
        }
        
        return qs;
    },
    saveScenes: function(qs) {
        try {
            fetch('/api/save-scenes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(qs)
            }).then(res => {
                if(!res.ok) console.error("Backend save failed");
            }).catch(e => console.error(e));
            window.scenes = qs; // Update memory reference
        } catch (e) {
            console.error("Storage error:", e);
            alert("Lỗi khi lưu dữ liệu.");
        }
    },
    getScene: function(id) {
        return this.getScenes().find(q => q.id == id);
    },
    saveScene: function(q) {
        let qs = this.getScenes();
        let index = qs.findIndex(item => item.id == q.id);
        if (index > -1) qs[index] = q;
        else qs.push(q);
        this.saveScenes(qs);
    },
    deleteScene: function(id) {
        let qs = this.getScenes();
        this.saveScenes(qs.filter(item => item.id != id));
    }
};

const ZoneStorage = {
    getZones: function() {
        let lvls = window.zones || [];
        
        // Ensure subScenes are correctly generated based on questions array
        lvls.forEach(l => {
            if (l.questions && l.questions.length > 0) {
                l.subScenes = l.questions.map(qId => {
                    const scene = SceneStorage.getScene(qId);
                    if (!scene) return null;
                    
                    let origId = 'level_' + qId;
                    if (l.subScenes) {
                        const foundSub = l.subScenes.find(s => s.questions && s.questions[0] === qId);
                        if (foundSub) origId = foundSub.id;
                    }
                    
                    return {
                        id: origId,
                        name: scene.name,
                        difficulty: scene.difficulty || 'Easy',
                        type: scene.type || 'hidden_object',
                        image: scene.thumbnail || scene.image,
                        questions: [qId]
                    };
                }).filter(Boolean);
            }
        });
        
        return lvls;
    },
    saveZones: function(levels) {
        try {
            fetch('/api/save-zones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(levels)
            }).then(res => {
                if(!res.ok) console.error("Backend save levels failed");
            }).catch(e => console.error(e));
            window.zones = levels; // Update memory reference
            localStorage.setItem('findItZones', JSON.stringify(levels)); // keep local copy as fallback
        } catch (e) {
            console.error("Storage error:", e);
        }
    },
    getZone: function(id) {
        const lvls = this.getZones();
        let found = lvls.find(l => l.id == id);
        if (found) return found;
        
        for (let region of lvls) {
            if (region.subScenes) {
                found = region.subScenes.find(sub => sub.id == id);
                if (found) return found;
            }
        }
        return null;
    },
    saveZone: function(level) {
        let lvls = this.getZones();
        let index = lvls.findIndex(item => item.id == level.id);
        if (index > -1) lvls[index] = level;
        else lvls.push(level);
        this.saveZones(lvls);
    },
    deleteZone: function(id) {
        let lvls = this.getZones();
        this.saveZones(lvls.filter(item => item.id != id));
    }
};

const PlayerStorage = {
    savePlayer: function(name, progress) {
        progress.lastUpdate = Date.now();
        const data = { playerName: name, progress: progress };
        localStorage.setItem('findItPlayer', JSON.stringify(data));
    },
    getPlayer: function() {
        const data = localStorage.getItem('findItPlayer');
        if (!data) return null;
        let player = JSON.parse(data);
        if (player && player.progress) {
            if (player.progress.lastUpdate) {
                const now = Date.now();
                const twelveHours = 12 * 60 * 60 * 1000;
                if (now - player.progress.lastUpdate >= twelveHours) {
                    player.progress.lives = 3;
                }
            }
            
            // Initialize Pet Stats if missing
            if (!player.progress.pet) {
                player.progress.pet = {
                    fullness: 100,
                    happiness: 100,
                    hygiene: 100,
                    energy: 100,
                    lastTick: Date.now()
                };
            }
        }
        return player;
    },
    logoutPlayer: function() {
        localStorage.removeItem('findItPlayer');
    },
    clearProgress: function(name) {
        this.savePlayer(name, {
            lives: 3,
            score: 0,
            currentZone: null,
            currentSceneIndex: 0,
            completedZones: [],
            pet: {
                fullness: 100,
                happiness: 100,
                hygiene: 100,
                energy: 100,
                lastTick: Date.now()
            }
        });
    },
    showBuyLivesModal: function(player, currentLives, currentScore, onBuySuccess, onCancel) {
        let modal = document.getElementById('buy-lives-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'buy-lives-modal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column;';
            
            const content = document.createElement('div');
            content.style.cssText = 'background:white; padding:30px; border-radius:20px; text-align:center; max-width:400px; width:90%; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-family:"Nunito", sans-serif;';
            
            content.innerHTML = `
                <h2 style="color:#d63031; font-family:'Fredoka One', cursive; font-size:2em; margin-top:0;">Out of Lives! 💔</h2>
                <p style="font-size:1.2em; color:#2d3436; margin-bottom:20px;">Don't give up! Use your coins to buy more lives and keep playing.</p>
                <div style="font-size:1.5em; color:#f1c40f; font-weight:bold; margin-bottom:20px;">
                    <img src="images/coin.png" style="width:24px; vertical-align:middle;"> <span id="bl-current-score">0</span>
                </div>
                
                <button id="btn-buy-1-life" class="btn" style="width:100%; margin-bottom:15px; padding:15px; font-size:1.2em; border-radius:15px; border:none; background:#0984e3; color:white; font-family:'Fredoka One', cursive; cursor:pointer; box-shadow:0 5px 0 #074b83; transition:all 0.2s;">
                    +1 ❤️ for 100 <img src="images/coin.png" style="width:20px; vertical-align:middle;">
                </button>
                
                <button id="btn-buy-3-lives" class="btn" style="width:100%; margin-bottom:20px; padding:15px; font-size:1.2em; border-radius:15px; border:none; background:#00b894; color:white; font-family:'Fredoka One', cursive; cursor:pointer; box-shadow:0 5px 0 #009879; transition:all 0.2s;">
                    +3 ❤️ for 250 <img src="images/coin.png" style="width:20px; vertical-align:middle;">
                </button>
                
                <button id="btn-bl-cancel" style="background:transparent; border:none; color:#b2bec3; font-size:1.1em; font-family:'Nunito', sans-serif; cursor:pointer; text-decoration:underline;">No thanks, I'll quit</button>
            `;
            
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
        
        document.getElementById('bl-current-score').innerText = currentScore;
        modal.style.display = 'flex';
        
        const btn1 = document.getElementById('btn-buy-1-life');
        const btn3 = document.getElementById('btn-buy-3-lives');
        const btnCancel = document.getElementById('btn-bl-cancel');
        
        // Setup button states based on coins
        if (currentScore < 100) {
            btn1.style.opacity = '0.5';
            btn1.style.pointerEvents = 'none';
        } else {
            btn1.style.opacity = '1';
            btn1.style.pointerEvents = 'auto';
        }
        
        if (currentScore < 250) {
            btn3.style.opacity = '0.5';
            btn3.style.pointerEvents = 'none';
        } else {
            btn3.style.opacity = '1';
            btn3.style.pointerEvents = 'auto';
        }
        
        // Remove old listeners by replacing buttons (simple clone)
        const newBtn1 = btn1.cloneNode(true);
        btn1.parentNode.replaceChild(newBtn1, btn1);
        const newBtn3 = btn3.cloneNode(true);
        btn3.parentNode.replaceChild(newBtn3, btn3);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
        
        newBtn1.onclick = () => {
            if (currentScore >= 100) {
                currentScore -= 100;
                currentLives += 1;
                player.progress.score = currentScore;
                player.progress.lives = currentLives;
                PlayerStorage.savePlayer(player.playerName, player.progress);
                modal.style.display = 'none';
                if (onBuySuccess) onBuySuccess(currentLives, currentScore);
            }
        };
        
        newBtn3.onclick = () => {
            if (currentScore >= 250) {
                currentScore -= 250;
                currentLives += 3;
                player.progress.score = currentScore;
                player.progress.lives = currentLives;
                PlayerStorage.savePlayer(player.playerName, player.progress);
                modal.style.display = 'none';
                if (onBuySuccess) onBuySuccess(currentLives, currentScore);
            }
        };
        
        newBtnCancel.onclick = () => {
            modal.style.display = 'none';
            if (onCancel) onCancel();
        };
    },
    
    showSuccessModal: function(player, currentLives, currentScore, levelId, stageKey, nextUrl, onBackToMap) {
        // Calculate reward: 10 coins per remaining life (min 10)
        let reward = Math.max(10, currentLives * 10);
        currentScore += reward;
        
        // Save progress if applicable
        if (player && levelId) {
            if (!player.progress[levelId]) {
                player.progress[levelId] = { s1: false, s2: false, s3: false, s4: false };
            }
            if (stageKey) {
                player.progress[levelId][stageKey] = true;
                
                let hasThumbnails = false;
                let hasBigImage = false;
                const lvl = typeof ZoneStorage !== 'undefined' ? ZoneStorage.getZone(levelId) : null;
                if (lvl) {
                    const allQs = typeof SceneStorage !== 'undefined' ? SceneStorage.getScenes() : [];
                    const levelScenes = allQs.filter(q => lvl.questions && lvl.questions.includes(q.id));
                    for (let t of levelScenes) {
                        if (t.image && t.image.trim() !== '') hasBigImage = true;
                        let objects = t.objects || t.quizData || [];
                        if (objects.some(o => o.image && o.image.trim() !== '')) hasThumbnails = true;
                    }
                } else {
                    hasThumbnails = true;
                    hasBigImage = true;
                }
                
                let isLastMode = false;
                if (hasThumbnails && stageKey === 's4') isLastMode = true;
                if (!hasThumbnails && hasBigImage && stageKey === 's2') isLastMode = true;

                if (isLastMode) {
                    if (!player.progress.completedZones) {
                        player.progress.completedZones = [];
                    }
                    if (!player.progress.completedZones.includes(levelId)) {
                        player.progress.completedZones.push(levelId);
                    }
                    
                    let mistakes = 0;
                    let N = 5;
                    if (stageKey === 's4') {
                        mistakes = parseInt(sessionStorage.getItem('currentTopicMistakes') || '0');
                        if (lvl && lvl.questions && lvl.questions.length > 0) {
                            const scene = typeof SceneStorage !== 'undefined' ? SceneStorage.getScene(lvl.questions[0]) : null;
                            if (scene && scene.objects) {
                                const uniqueNames = new Set();
                                for (let obj of scene.objects) {
                                    const lowerName = obj.name.toLowerCase().trim();
                                    if (obj.image && !uniqueNames.has(lowerName)) {
                                        uniqueNames.add(lowerName);
                                    }
                                }
                                if(uniqueNames.size > 0) N = uniqueNames.size;
                            }
                        }
                        
                        let earnedStars = 1;
                        if (mistakes === 0) earnedStars = 3;
                        else if (mistakes <= N) earnedStars = 2;
                        else earnedStars = 1;
                        
                        if (!player.progress.stars) player.progress.stars = {};
                        if (!player.progress.stars[levelId] || player.progress.stars[levelId] < earnedStars) {
                            player.progress.stars[levelId] = earnedStars;
                        }
                    } else if (stageKey === 's2') {
                        // Find It ONLY topic
                        let earnedStars = 1;
                        if (currentLives === 3) earnedStars = 3;
                        else if (currentLives === 2) earnedStars = 2;
                        else earnedStars = 1;
                        
                        if (!player.progress.stars) player.progress.stars = {};
                        if (!player.progress.stars[levelId] || player.progress.stars[levelId] < earnedStars) {
                            player.progress.stars[levelId] = earnedStars;
                        }
                    }
                }
            }
            player.progress.score = currentScore;
            this.savePlayer(player.playerName, player.progress);
        }
        
        // Confetti Fireworks
        if (!document.getElementById('confetti-script')) {
            const script = document.createElement('script');
            script.id = 'confetti-script';
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.onload = () => {
                fireConfetti();
            };
            document.head.appendChild(script);
        } else if (typeof confetti !== 'undefined') {
            fireConfetti();
        }
        
        function fireConfetti() {
            var duration = 3 * 1000;
            var end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
                });
                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
        
        // Modal UI
        let modal = document.getElementById('success-generic-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'success-generic-modal';
            modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.95); z-index:9999; display:flex; align-items:center; justify-content:center; flex-direction:column;';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <h1 style="color:#00b894; font-family:'Fredoka One', cursive; font-size:4em; margin:0; text-shadow:0 4px 0 #009879;">Great Job! 🎉</h1>
            <p style="font-size:1.5em; color:#2d3436; font-family:'Nunito', sans-serif; margin-top:10px;">You are so smart!</p>
            
            <div style="background:#fff3cd; border:3px solid #f1c40f; border-radius:20px; padding:20px 40px; margin:30px 0; display:flex; flex-direction:column; align-items:center;">
                <span style="color:#e67e22; font-size:1.2em; font-family:'Fredoka One', cursive; margin-bottom:10px;">Reward</span>
                <div style="font-size:2.5em; color:#f1c40f; font-weight:bold; display:flex; align-items:center; gap:10px;">
                    <img src="images/coin.png" style="width:40px;"> +${reward}
                </div>
                <div style="color:#7f8c8d; font-size:1em; margin-top:5px; font-family:'Nunito', sans-serif;">Lives remaining bonus</div>
            </div>
            
            <div style="display:flex; gap:20px; margin-top:20px;">
                <button id="btn-success-map" class="btn" style="background:#0984e3; color:white; padding:15px 40px; font-size:1.5em; border-radius:30px; border:none; font-family:'Fredoka One', cursive; cursor:pointer; box-shadow:0 5px 0 #074b83; transition:transform 0.2s;">
                    Back to Map
                </button>
                <button id="btn-success-next" class="btn" style="display:${nextUrl ? 'block' : 'none'}; background:#00b894; color:white; padding:15px 40px; font-size:1.5em; border-radius:30px; border:none; font-family:'Fredoka One', cursive; cursor:pointer; box-shadow:0 5px 0 #009879; transition:transform 0.2s;">
                    Next ➔
                </button>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        document.getElementById('btn-success-map').onclick = () => {
            modal.style.display = 'none';
            if (onBackToMap) onBackToMap();
            else window.location.href = 'index.html?showTopicMap=' + levelId;
        };
        
        document.getElementById('btn-success-next').onclick = () => {
            if (nextUrl) {
                window.location.href = nextUrl;
            }
        };
    },
    getNextLevelUrl: function(currentId) {
        if (typeof ZoneStorage === 'undefined') return null;
        const regions = ZoneStorage.getZones();
        for (let rIndex = 0; rIndex < regions.length; rIndex++) {
            const region = regions[rIndex];
            if (region.subScenes) {
                const index = region.subScenes.findIndex(s => s.id === currentId);
                if (index > -1) {
                    if (index < region.subScenes.length - 1) {
                        return 'index.html?playScene=' + region.subScenes[index + 1].id + '&v=' + Date.now();
                    } else if (rIndex < regions.length - 1 && regions[rIndex+1].subScenes && regions[rIndex+1].subScenes.length > 0) {
                        return 'index.html?playScene=' + regions[rIndex+1].subScenes[0].id + '&v=' + Date.now();
                    }
                }
            }
        }
        return null;
    }
};

const QuestionSetStorage = {
    getSets: function() {
        return window.questionSets || [];
    },
    saveSets: function(sets) {
        try {
            fetch('/api/save-question-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sets)
            });
            window.questionSets = sets;
        } catch(e) {
            console.error("Lỗi lưu Question Sets:", e);
        }
    },
    getSetById: function(id) {
        return this.getSets().find(s => s.id === id);
    },
    saveSet: function(set) {
        let sets = this.getSets();
        let index = sets.findIndex(s => s.id === set.id);
        if (index > -1) {
            sets[index] = set;
        } else {
            sets.push(set);
        }
        this.saveSets(sets);
    },
    deleteSet: function(id) {
        let sets = this.getSets();
        sets = sets.filter(s => s.id !== id);
        this.saveSets(sets);
    }
};
