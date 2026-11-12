// ---------- SETUP ----------
var c = document.getElementById("c");
var ctx = c.getContext("2d");

// a second, hidden canvas used to draw the darkness
var dark = document.createElement("canvas");
dark.width = 800;
dark.height = 500;
var dctx = dark.getContext("2d");

// ---------- LEVEL DATA ----------
// bg = background colour, light = size of the lantern light,
// enemies = number of shadows, sparks = number to collect,
// rocks = obstacles that block you [x, y, width, height]
var levels = [
  { bg: "#1d3b2a", light: 170, enemies: 3, sparks: 5, rocks: [[350, 200, 100, 100]] },
  { bg: "#483222", light: 130, enemies: 5, sparks: 7, rocks: [[200, 100, 40, 300], [560, 100, 40, 300]] },
  { bg: "#2a1d3b", light: 100, enemies: 7, sparks: 9, rocks: [[150, 150, 200, 40], [450, 310, 200, 40], [380, 60, 40, 120]] }
];

var keys = {};
var state = "menu";   // menu, play, over, win
var level = 0;
var players = [];
var enemies = [];
var sparks = [];
var twoPlayer = false;
var audio = null;
var frame = 0;

// ---------- SOUND (made with code, so no copyright issues) ----------
function beep(freq, length, volume) {
  if (!audio) return;
  var osc = audio.createOscillator();
  var gain = audio.createGain();
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + length);
}

// background music: a simple repeating tune
var notes = [131, 165, 196, 165, 131, 165, 196, 262];
var noteNumber = 0;
setInterval(function () {
  if (state == "play") {
    beep(notes[noteNumber % 8], 0.3, 0.05);
    noteNumber++;
  }
}, 400);

// ---------- HELPER FUNCTIONS ----------
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// is this spot inside a rock?
function hitsRock(x, y) {
  var rocks = levels[level].rocks;
  for (var i = 0; i < rocks.length; i++) {
    var r = rocks[i];
    if (x + 12 > r[0] && x - 12 < r[0] + r[2] && y + 12 > r[1] && y - 12 < r[1] + r[3]) {
      return true;
    }
  }
  return false;
}

// pick a random spot that is not inside a rock
function freeSpot() {
  var x, y;
  do {
    x = 40 + Math.random() * 720;
    y = 40 + Math.random() * 420;
  } while (hitsRock(x, y));
  return { x: x, y: y };
}

// ---------- STARTING THE GAME ----------
function makePlayer(color, up, down, left, right) {
  return { x: 100, y: 250, color: color, up: up, down: down, left: left, right: right,
           lives: 3, score: 0, invincible: 0 };
}

function startGame(two) {
  twoPlayer = two;
  players = [makePlayer("#ffd34d", "KeyW", "KeyS", "KeyA", "KeyD")];
  if (two) {
    players.push(makePlayer("#4dd2ff", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"));
  }
  level = 0;
  loadLevel();
  state = "play";
}

function loadLevel() {
  var L = levels[level];
  enemies = [];
  sparks = [];
  for (var i = 0; i < L.enemies; i++) {
    var speed = 1.5 + level * 0.5;
    enemies.push({
      x: 300 + Math.random() * 450,
      y: 30 + Math.random() * 440,
      dx: Math.random() < 0.5 ? speed : -speed,
      dy: Math.random() < 0.5 ? speed : -speed
    });
  }
for (var j = 0; j < L.sparks; j++) {
    sparks.push(freeSpot());
  }
  for (var k = 0; k < players.length; k++) {
    players[k].x = 100;
    players[k].y = 200 + k * 100;
    players[k].invincible = 60;
  }
}
// ---------- UPDATE (runs every frame) ----------
function update() {
  var alive = 0;

  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (p.lives <= 0) continue;
    alive++;

    // movement (4 pixels per frame), blocked by rocks
    var nx = p.x;
    var ny = p.y;
    if (keys[p.left]) nx -= 4;
    if (keys[p.right]) nx += 4;
    if (keys[p.up]) ny -= 4;
    if (keys[p.down]) ny += 4;
    if (!hitsRock(nx, p.y)) p.x = nx;
    if (!hitsRock(p.x, ny)) p.y = ny;

    // stay inside the screen
    p.x = Math.max(12, Math.min(788, p.x));
    p.y = Math.max(12, Math.min(488, p.y));

    if (p.invincible > 0) p.invincible--;

    // collect sparks
    for (var j = sparks.length - 1; j >= 0; j--) {
      if (distance(p, sparks[j]) < 22) {
        sparks.splice(j, 1);
        p.score += 10;
        beep(880, 0.1, 0.15);
      }
    }

    // touching a shadow costs a life
    if (p.invincible == 0) {
      for (var k = 0; k < enemies.length; k++) {
        if (distance(p, enemies[k]) < 28) {
          p.lives--;
          p.invincible = 90;
          p.x = 100;
          beep(120, 0.4, 0.2);
          break;
        }
      }
    }
  }

  // move shadows and bounce them off the edges
  for (var m = 0; m < enemies.length; m++) {
    var e = enemies[m];
    e.x += e.dx;
    e.y += e.dy;
    if (e.x < 15 || e.x > 785) e.dx = -e.dx;
    if (e.y < 15 || e.y > 485) e.dy = -e.dy;
  }

  // everyone out of lives: game over, then restart automatically
  if (alive == 0) {
    state = "over";
    setTimeout(function () { startGame(twoPlayer); }, 3000);
    return;
  }

  // all sparks collected: next level (or win)
  if (sparks.length == 0) {
    for (var n = 0; n < players.length; n++) {
      if (players[n].lives > 0) players[n].score += 50;
    }
    beep(660, 0.4, 0.2);
    if (level == 2) {
      state = "win";
      setTimeout(function () { state = "menu"; }, 5000);
    } else {
      level++;
      loadLevel();
    }
  }
}
