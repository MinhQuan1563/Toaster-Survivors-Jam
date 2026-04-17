/**
 * Global configuration for the Toaster Survivors game.
 * Centralizing these values allows for easy balancing of difficulty and visuals.
 */
export const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  WORLD_W: 2000,
  WORLD_H: 2000,
  
  PLAYER_SPEED: 200,
  
  // Machine Theme Color Palette
  COLORS: {
    CHROME_LIGHT: 0xe2e8f0,
    CHROME_DARK: 0x475569,
    GLOW_ORANGE: 0xf97316,
    BREAD_BASE: 0xd97706,
    BREAD_CRUST: 0x92400e,
    METAL_PLATE: 0x1e293b,
    SHADOW: 0x000000,
    // Player
    CHROME_MID: 0x94a3b8,
    LED_AMBER: 0xfbbf24,
    // Enemies
    ROOMBA_GRAY: 0x334155,
    MICROWAVE_RED: 0xef4444,
    RICE_COOKER_WHITE: 0xf1f5f9,
    WASHING_MACHINE_BLUE: 0x3b82f6,
    COFFEE_BROWN: 0x451a03,
    STEAM_WHITE: 0xffffff,
  }
};