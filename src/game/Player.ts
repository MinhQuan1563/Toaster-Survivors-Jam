import Phaser from 'phaser';
import { GAME_CONFIG } from './Constants';

export class Player extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private animFrame: number = 0;
  private isMoving: boolean = false;
  private currentTilt: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Create the graphics object inside the container
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    
    // Enable physics for this container
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 10);
    body.setOffset(-10, -10);
  }

  public setVelocity(x: number, y: number) {
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(x, y);
    }
  }

  /**
   * Main update loop for the player
   * @param vx Horizontal velocity
   * @param vy Vertical velocity
   */
  update(vx: number, vy: number) {
    this.animFrame++;
    this.isMoving = vx !== 0 || vy !== 0;

    // Smooth tilting effect based on horizontal movement
    const targetTilt = vx * 0.001;
    this.currentTilt = Phaser.Math.Interpolation.Linear([this.currentTilt, targetTilt], 0.1);

    this.renderMecha(vx, vy);
  }

  private renderMecha(vx: number, vy: number) {
    const g = this.graphics;
    g.clear();

    // Animation values
    const walkCycle = Math.sin(this.animFrame * 0.15);
    const bodyBob = this.isMoving ? Math.abs(Math.cos(this.animFrame * 0.15)) * 6 : Math.sin(this.animFrame * 0.05) * 2;
    
    g.setAngle(Phaser.Math.RadToDeg(this.currentTilt));

    // 1. DYNAMIC SHADOW
    g.fillStyle(GAME_CONFIG.COLORS.SHADOW, 0.2);
    g.fillEllipse(0, 45, 50 + bodyBob, 12);

    // 2. HYDRAULIC JOINTED LEGS
    g.lineStyle(5, GAME_CONFIG.COLORS.METAL_PLATE);
    const drawLeg = (side: number) => {
      const legX = (side * 18) + (this.isMoving ? -side * walkCycle * 12 : 0);
      const kneeY = 25 - (this.isMoving && (side * walkCycle > 0) ? 8 : 0);
      
      g.beginPath();
      g.moveTo(side * 15, 10 - bodyBob);
      g.lineTo(legX, kneeY - bodyBob);
      g.lineTo(legX + (side * 5), 42); // Foot contact
      g.strokePath();
    };
    drawLeg(-1); // Left
    drawLeg(1);  // Right

    // 3. THE BREAD (Signature Feature)
    const breadY = -35 - bodyBob + (Math.sin(this.animFrame * 0.1) * 3);
    const drawBreadSlice = (x: number) => {
        g.fillStyle(GAME_CONFIG.COLORS.BREAD_CRUST);
        g.fillRoundedRect(x, breadY, 18, 18, 4);
        g.fillStyle(GAME_CONFIG.COLORS.BREAD_BASE);
        g.fillRoundedRect(x + 2, breadY + 2, 14, 14, 2);
    };
    drawBreadSlice(-22);
    drawBreadSlice(4);

    // 4. MAIN CHASSIS (Industrial Design)
    // Body base
    g.lineStyle(2, 0x000000, 0.5);
    g.fillStyle(GAME_CONFIG.COLORS.CHROME_MID);
    g.fillRoundedRect(-35, -30 - bodyBob, 70, 55, 12);
    g.strokeRoundedRect(-35, -30 - bodyBob, 70, 55, 12);

    // Shading/Plate Detail
    g.fillStyle(GAME_CONFIG.COLORS.CHROME_LIGHT, 0.3);
    g.fillRoundedRect(-30, -25 - bodyBob, 60, 20, 8);

    // Rivets (Mechanical Detail)
    g.fillStyle(GAME_CONFIG.COLORS.METAL_PLATE);
    const rivetPositions = [[-30, -25], [30, -25], [-30, 20], [30, 20]];
    rivetPositions.forEach(pos => {
        g.fillCircle(pos[0], pos[1] - bodyBob, 2);
    });

    // 5. INTERNAL GLOWING COILS
    const heatGlow = (Math.sin(this.animFrame * 0.1) + 1) / 2;
    g.fillStyle(GAME_CONFIG.COLORS.GLOW_ORANGE, 0.3 + heatGlow * 0.7);
    g.fillRect(-22, -28 - bodyBob, 12, 3);
    g.fillRect(10, -28 - bodyBob, 12, 3);

    // 6. CONTROL PANEL
    g.fillStyle(0x334155);
    g.fillCircle(20, 10 - bodyBob, 6); // Dial knob
    g.fillStyle(0xef4444);
    g.fillRect(-25, 8 - bodyBob, 6, 6); // Red button

    // 7. LED MATRIX DISPLAY
    g.fillStyle(0x0f172a);
    g.fillRoundedRect(-22, -15 - bodyBob, 44, 20, 4);
    
    // Eye Pixels (Blinking Logic)
    const isBlinking = Math.sin(this.animFrame * 0.05) > 0.92;
    if (!isBlinking) {
      g.fillStyle(GAME_CONFIG.COLORS.LED_AMBER);
      // Simple 2x2 or 3x3 pixel eyes
      g.fillRect(-15, -10 - bodyBob, 5, 5);
      g.fillRect(10, -10 - bodyBob, 5, 5);
    } else {
      g.fillStyle(GAME_CONFIG.COLORS.LED_AMBER, 0.5);
      g.fillRect(-15, -7 - bodyBob, 5, 2);
      g.fillRect(10, -7 - bodyBob, 5, 2);
    }
  }
}