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


// ---------- DRAW ----------
function text(words, x, y, size, align) {
  ctx.fillStyle = "white";
  ctx.font = size + "px Arial";
  ctx.textAlign = align;
  ctx.fillText(words, x, y);
}

function draw() {
  if (state == "menu") {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 800, 500);
    text("LANTERN SPIRITS", 400, 150, 50, "center");
    text("Collect every spark. Shadows hide in the dark!", 400, 200, 20, "center");
    text("Press 1 for ONE player   -   Press 2 for TWO players", 400, 270, 22, "center");
    text("Player 1: W A S D        Player 2: Arrow keys", 400, 320, 18, "center");
    return;
  }

  var L = levels[level];

  // background
  ctx.fillStyle = L.bg;
  ctx.fillRect(0, 0, 800, 500);

  // shadows (these get hidden by the darkness)
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 18, 0, 7);
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.fillRect(e.x - 9, e.y - 5, 5, 5);
    ctx.fillRect(e.x + 4, e.y - 5, 5, 5);
  }

  // darkness: fill black, then cut a glowing hole around each player
  dctx.globalCompositeOperation = "source-over";
  dctx.fillStyle = "rgba(0,0,0,0.96)";
  dctx.fillRect(0, 0, 800, 500);
  dctx.globalCompositeOperation = "destination-out";
  for (var p = 0; p < players.length; p++) {
    var pl = players[p];
    if (pl.lives <= 0) continue;
    var g = dctx.createRadialGradient(pl.x, pl.y, 10, pl.x, pl.y, L.light);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = g;
    dctx.fillRect(0, 0, 800, 500);
  }
  ctx.drawImage(dark, 0, 0);

  // rocks (always visible)
  ctx.fillStyle = "#777";
  for (var r = 0; r < L.rocks.length; r++) {
    var rock = L.rocks[r];
    ctx.fillRect(rock[0], rock[1], rock[2], rock[3]);
  }

  // sparks (always visible, they pulse)
  ctx.fillStyle = "#fff176";
  for (var s = 0; s < sparks.length; s++) {
    ctx.beginPath();
    ctx.arc(sparks[s].x, sparks[s].y, 6 + Math.sin(frame / 8) * 2, 0, 7);
    ctx.fill();
  }

  // players (flash when recently hit)
  for (var q = 0; q < players.length; q++) {
    var a = players[q];
    if (a.lives <= 0) continue;
    if (a.invincible > 0 && frame % 10 < 5) continue;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 12, 0, 7);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.fillRect(a.x - 6, a.y - 4, 4, 4);
    ctx.fillRect(a.x + 2, a.y - 4, 4, 4);
  }

  // scoreboard
  text("P1  Lives: " + players[0].lives + "  Score: " + players[0].score, 10, 25, 16, "left");
  if (twoPlayer) {
    text("P2  Lives: " + players[1].lives + "  Score: " + players[1].score, 790, 25, 16, "right");
  }
  text("Level " + (level + 1) + "   Sparks left: " + sparks.length, 400, 25, 16, "center");

  if (state == "over") {
    text("GAME OVER - restarting...", 400, 250, 40, "center");
  }
  if (state == "win") {
    text("YOU WIN! The forest is bright again", 400, 250, 36, "center");
  }
}