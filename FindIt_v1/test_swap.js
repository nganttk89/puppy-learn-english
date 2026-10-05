const fs = require('fs');
let lvls = JSON.parse(fs.readFileSync('data/zones.json', 'utf8'));
let id = lvls[1].id;
let index = lvls.findIndex(item => item.id === id);
let temp = lvls[index - 1];
lvls[index - 1] = lvls[index];
lvls[index] = temp;
console.log(lvls[0].name, lvls[1].name);
