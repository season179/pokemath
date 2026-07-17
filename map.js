// Map legend:
//   T = tree (blocks walking)
//   . = grass ground
//   p = path
//   G = tall grass (wild encounters later, in Slice 2)
const MAP = [
  "TTTTTTTTTTTTTTTT",
  "T....GGG.......T",
  "T....GGG..TT...T",
  "T.ppppppppppp..T",
  "T.p...T...GGG..T",
  "T.p...T...GGG..T",
  "T.p.......GGG..T",
  "T.ppppppp......T",
  "T....GG.p..TT..T",
  "T....GG.p......T",
  "T........ppppp.T",
  "TTTTTTTTTTTTTTTT",
];

const SOLID_TILES = new Set(["T"]);

function tileAt(x, y) {
  if (y < 0 || y >= MAP.length || x < 0 || x >= MAP[0].length) return "T";
  return MAP[y][x];
}

function isWalkable(x, y) {
  return !SOLID_TILES.has(tileAt(x, y));
}
