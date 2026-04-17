import Phaser from 'phaser';
import { GAME_CONFIG } from './Constants';

export interface BlackoutConfig {
  /** Minimum blackout duration in seconds (default: 15) */
  minDuration?: number;
  /** Maximum blackout duration in seconds (default: 20) */
  maxDuration?: number;
  /** Radius of vision circle in pixels (default: 120) */
  visionRadius?: number;
  /** Minimum time between blackouts in seconds (default: 30) */
  minInterval?: number;
  /** Maximum time between blackouts in seconds (default: 60) */
  maxInterval?: number;
  /** Enable/disable blackout feature (default: true) */
  enabled?: boolean;
}

export class Blackout {
  private static readonly DEFAULT_CONFIG: Required<BlackoutConfig> = {
    minDuration: 15,
    maxDuration: 20,
    visionRadius: 120,
    minInterval: 30,
    maxInterval: 60,
    enabled: true,
  };

  private scene: Phaser.Scene;
  private config: Required<BlackoutConfig>;

  // Full-screen dark overlay
  private darkOverlay!: Phaser.GameObjects.Graphics;
  // White circle used purely as a mask shape
  private visionCircle!: Phaser.GameObjects.Graphics;
  // The geometry mask that references visionCircle
  private geometryMask!: Phaser.Display.Masks.GeometryMask;

  private isActive: boolean = false;
  private remainingTime: number = 0;
  private nextBlackoutTime: number = 0;

  // Reference to player sprite/container — must expose .x and .y in world space
  private player: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    player: { x: number; y: number },
    userConfig?: BlackoutConfig
  ) {
    this.scene = scene;
    this.player = player;
    this.config = { ...Blackout.DEFAULT_CONFIG, ...userConfig };

    this.scheduleNextBlackout();
  }

/**
   * Call this every frame from your scene's update(time, delta) method.
*/
  update(delta: number): void {
    if (!this.config.enabled) return;

    if (!this.isActive) {
      this.nextBlackoutTime -= delta / 1000;
      if (this.nextBlackoutTime <= 0) {
        this.triggerBlackout();
      }
    } else {
      this.remainingTime -= delta / 1000;
      if (this.remainingTime <= 0) {
        this.endBlackout();
      } else {
        this.updateVisionCircle();
      }
    }
  }

  /** Returns true while a blackout is in progress. */
  isBlackoutActive(): boolean {
    return this.isActive;
  }

  /** Remaining blackout duration in seconds, or 0 if inactive. */
  getRemainingTime(): number {
    return this.isActive ? this.remainingTime : 0;
  }

  stopBlackout(): void {
    if (this.isActive) {
      this.endBlackout();
    }
  }

  forceBlackout(): void {
    if (!this.isActive) {
      this.triggerBlackout();
    }
  }

  updateConfig(newConfig: Partial<BlackoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Enable or disable the blackout system entirely.
   * If disabled while active, the current blackout is ended immediately.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled && this.isActive) {
      this.endBlackout();
    }
  }

  /** Release all Phaser objects. Call when the scene shuts down. */
  destroy(): void {
    this.cleanupGraphics();
  }

  
private triggerBlackout(): void {
    if (this.isActive) return;

    this.isActive = true;

    // Random duration between min and max (in seconds)
    this.remainingTime =
      Phaser.Math.Between(
        this.config.minDuration * 1000,
        this.config.maxDuration * 1000
      ) / 1000;

    // Full-screen black overlay ---
    this.darkOverlay = this.scene.add.graphics();
    this.darkOverlay.setScrollFactor(0).setDepth(11);
    this.darkOverlay.fillStyle(0x000000, 1);
    this.darkOverlay.fillRect(
      0,
      0,
      GAME_CONFIG.CANVAS_WIDTH,
      GAME_CONFIG.CANVAS_HEIGHT
    );

    // Vision circle (mask shape only — never visible itself) ---
    this.visionCircle = this.scene.add.graphics();
    this.visionCircle.setScrollFactor(0);
    this.visionCircle.setVisible(false);
    this.visionCircle.setDepth(10);

    // GeometryMask with invertAlpha ---
    this.geometryMask = new Phaser.Display.Masks.GeometryMask(
      this.scene,
      this.visionCircle
    );
    this.geometryMask.invertAlpha = true;

    this.darkOverlay.setMask(this.geometryMask);

    // Draw initial position
    this.updateVisionCircle();
  }

  /**
   * Redraws the white circle at the player's current screen position.
  **/
  private updateVisionCircle(): void {
    if (!this.visionCircle || !this.isActive) return;

    const cam = this.scene.cameras.main;
    // Convert world position → screen (camera-relative) position
    const screenX = this.player.x - cam.scrollX;
    const screenY = this.player.y - cam.scrollY;

    this.visionCircle.clear();
    this.visionCircle.fillStyle(0xffffff, 1);
    this.visionCircle.fillCircle(screenX, screenY, this.config.visionRadius);
  }

  private endBlackout(): void {
    this.isActive = false;
    this.cleanupGraphics();
    this.scheduleNextBlackout();
  }

  private scheduleNextBlackout(): void {
    this.nextBlackoutTime =
      Phaser.Math.Between(
        this.config.minInterval * 1000,
        this.config.maxInterval * 1000
      ) / 1000;
  }

  private cleanupGraphics(): void {
    if (this.darkOverlay) {
      this.darkOverlay.clearMask(true);
      this.darkOverlay.destroy();
    }
    if (this.visionCircle) {
      this.visionCircle.destroy();
    }
  }
}
