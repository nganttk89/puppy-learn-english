const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'data.json');
const levelsPath = path.join(__dirname, 'data', 'levels.json');

try {
    let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let changedData = false;
    data.forEach(q => {
        if (q.type === 'routine') {
            q.type = 'quiz';
            changedData = true;
        }
        if (q.routineData) {
            q.quizData = q.routineData;
            delete q.routineData;
            changedData = true;
        }
    });
    if (changedData) {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
        console.log("data.json migrated successfully.");
    }

    let levels = JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
    let changedLevels = false;
    levels.forEach(lvl => {
        if (lvl.type === 'routine') {
            lvl.type = 'quiz';
            changedLevels = true;
        }
        if (lvl.subLevels) {
            lvl.subLevels.forEach(sub => {
                if (sub.type === 'routine') {
                    sub.type = 'quiz';
                    changedLevels = true;
                }
            });
        }
    });
    if (changedLevels) {
        fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 4));
        console.log("levels.json migrated successfully.");
    }
} catch (e) {
    console.error("Migration failed:", e);
}
