import Phaser from "phaser";

export interface DamageNumberConfig {
  /** Duration of the float animation in milliseconds (default: 1200) */
  duration?: number;
  /** Vertical speed in pixels per second (default: -150) */
  verticalSpeed?: number;
  /** Text color in hex (default: varies by type) */
  color?: string;
  /** Font size in pixels (default: 28) */
  fontSize?: number;
  /** Stroke color for text (default: #000000) */
  strokeColor?: string;
  /** Stroke thickness (default: 3) */
  strokeThickness?: number;
}

/**
 * Damage number type - determines default color and behavior
 */
export type DamageNumberType = "damage" | "heal" | "player_damage" | "buff";

/**
 * Floating damage number display system
 * Shows animated, fading text that floats upward from a position
 */
export class DamageNumber {
  private static readonly DEFAULT_COLORS: Record<DamageNumberType, string> = {
    damage: "#ff6b6b", // Red for enemy damage
    heal: "#51cf66", // Green for healing
    player_damage: "#ff4444", // Bright red for player damage
    buff: "#facc15", // Yellow for buffs
  };

  private static readonly DEFAULT_DURATION = 1200; // ms
  private static readonly DEFAULT_VERTICAL_SPEED = -150; // pixels/sec (negative = upward)

  /**
   * Create and animate a floating damage number or text
   * @param scene The Phaser scene
   * @param x World X position
   * @param y World Y position
   * @param value The damage/heal value to display
   * @param type Type of number (affects color)
   * @param config Optional configuration overrides
   * @param textOverride Optional custom text to display instead of the value (e.g., "BLOCKED!")
   */
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: number,
    type: DamageNumberType = "damage",
    config?: DamageNumberConfig,
    textOverride?: string
  ): void {
    const cfg: DamageNumberConfig = {
      duration: DamageNumber.DEFAULT_DURATION,
      verticalSpeed: DamageNumber.DEFAULT_VERTICAL_SPEED,
      color: DamageNumber.DEFAULT_COLORS[type],
      fontSize: 28,
      strokeColor: "#000000",
      strokeThickness: 3,
      ...config,
    };

    const defaultDuration = DamageNumber.DEFAULT_DURATION;

    // Prioritize displaying textOverride (e.g., "BLOCKED!"), otherwise display the value
    const displayText = textOverride !== undefined 
        ? textOverride 
        : String(type === 'heal' && value > 0 ? '+' : '') + value;

    // Create text with shadow effect
    const text = scene.add.text(x, y, displayText, {
      fontSize: `${cfg.fontSize}px`,
      color: cfg.color,
      fontFamily: "Arial, sans-serif",
      fontStyle: "bold",
      stroke: cfg.strokeColor,
      strokeThickness: cfg.strokeThickness,
    });

    text.setDepth(200); // Increase depth to always be on top (overlay monsters and bosses)
    text.setOrigin(0.5, 0.5);

    // Animate: float up and fade out
    scene.tweens.add({
      targets: text,
      y: y + (cfg.verticalSpeed! / 1000) * (cfg.duration || defaultDuration),
      alpha: 0,
      duration: cfg.duration || defaultDuration,
      ease: Phaser.Math.Easing.Quadratic.Out,
      onComplete: () => {
        text.destroy();
      },
    });
  }
}

// Export default duration constant for external use
export const DEFAULT_DURATION = 1200;
export const DEFAULT_VERTICAL_SPEED = -150;