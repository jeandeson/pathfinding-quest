// src/config/GameConfig.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fonte única de verdade para todas as constantes do jogo.
// Alterar um valor aqui reflete em todo o sistema automaticamente.
// ─────────────────────────────────────────────────────────────────────────────

export const GameConfig = {
  GRID: {
    ROWS: 15,
    COLS: 20,
    CELL_SIZE: 64,
    OBSTACLE_DENSITY: 0.2,
    ITEM_COUNT: 12,
  },
  PLAYER: {
    SPEED: 100,
    DASH_SPEED_MULTIPLIER: 3.5,
    DASH_DURATION: 0.4,
    DASH_COOLDOWN: 1.5,
    JUMP_DURATION: 0.35,
    JUMP_HEIGHT_MULTIPLIER: 1.2,
  },
  ENEMY: {
    SPEED: 80,
    UPDATE_INTERVAL: 0.5,
    COUNT: 3,
  },
  ANIMATION: {
    FRAME_INTERVAL: 0.15,
    SPRITE_WIDTH:   24,
    SPRITE_HEIGHT:  24,
    SPRITE_SPACING: 0,   // 1px gap between frames in tilemap_packed
    MAX_FRAMES: 2,   // frames 0-1 = corrida; frame 2 = pulo; frame 3 = morto
  },
  SCORE: {
    ITEM_VALUE: 10,
  },
  ASSETS: {
    PLAYER_SPRITE: 'src/assets/PNG/Players/Tilemap/tilemap_packed.png',
    ENEMY_SPRITE:  'src/assets/PNG/Enemies/Tilemap/tilemap_packed.png',
    TILESET:       'src/assets/PNG/Tiles/Tilemap/tilemap_packed.png',
    OBSTACLE:      'src/assets/PNG/Tiles/Tilemap/tilemap_packed.png',
    // 3 variantes de chão para quebrar a monotonia (row 3, cols 0-2)
    GROUND_TILES: [
      { x: 86,  y: 10, size: 16 },   // col 0 – chão principal
      { x: 86, y: 10, size: 16 },   // col 1 – variante
      { x: 86, y: 10, size: 16 },   // col 2 – variante
    ],
    OBSTACLE_SRC:   { x: 144, y: 66, size: 16 },   // row 12 col 1 – crate
    EXIT_CLOSED_SRC: { x: 160,   y: 176,  size: 16 },   // porta fechada ← ajuste no tileset
    EXIT_OPEN_SRC:   { x: 176,   y: 176,  size: 16 },   // porta aberta  ← ajuste no tileset
  },
} as const;
