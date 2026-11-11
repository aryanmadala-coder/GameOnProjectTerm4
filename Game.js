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