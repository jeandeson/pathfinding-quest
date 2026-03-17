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
    SPRITE_WIDTH: 32,
    SPRITE_HEIGHT: 32,
    MAX_FRAMES: 4,
  },
  SCORE: {
    ITEM_VALUE: 10,
  },
  ASSETS: {
    PLAYER_SPRITE: 'src/assets/Characters/sheep.png',
    ENEMY_SPRITE:  'src/assets/Characters/cow.png',
    TILESET:       'src/assets/Tilesets/Grass.png',
    OBSTACLE:      'src/assets/Objects/Egg_item.png',
    TILE_SRC:      { x: 16, y: 16, size: 16 },
  },
} as const;
