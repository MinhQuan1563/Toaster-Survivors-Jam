import Phaser from 'phaser';
import { GAME_CONFIG } from './Constants';

export class Player extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private faceText: Phaser.GameObjects.Text;
  private animFrame: number = 0;
  private isMoving: boolean = false;
  private currentTilt: number = 0;
  private attackTimer: number = 0;
  private isFlipped: boolean = false;

  // List of faces and corresponding colors for automatic switching
  private faceList: string[] = ['^_^', 'O_O', '>_<', 'ò_ó'];
  private faceColors: string[] = ['#22c55e', '#3b82f6', '#f59e0b', '#06b6d4'];
  private currentFaceIndex: number = 0;
  private faceTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // 1. Graphics layer draws the body
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    
    // 2. Text layer draws LED face (not flipped so text is always readable)
    this.faceText = scene.add.text(0, 0, '^_^', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#22c55e',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    this.add(this.faceText);
    
    // Enable physics for Container
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(50, 50);     // Adjust hitbox to fit Crisp-E
    body.setOffset(-25, -25);
  }

  public setVelocity(x: number, y: number) {
    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(x, y);
    }
  }

  /**
   * Flip the player image
   * Flip the graphics layer inside instead of the Container to avoid breaking physics hitbox.
   * Face (Text) is not flipped.
   */
  public setFlipX(flip: boolean) {
    this.isFlipped = flip;
    this.graphics.scaleX = flip ? -1 : 1;
  }

  /**
   * Call this when firing to change expression and machine color
   */
  public playAttackAnim() {
    this.attackTimer = 15; // Used only for red core glow effect and lever shake
  }

  /**
   * Main update loop for the player
   */
  update(vx: number, vy: number) {
    this.animFrame++;
    this.isMoving = vx !== 0 || vy !== 0;

    // --- AUTO FLIP FACE BASED ON HORIZONTAL MOVEMENT DIRECTION (Left/Right) ---
    if (vx < 0) {
        this.setFlipX(true);
    } else if (vx > 0) {
        this.setFlipX(false);
    }

    // Smooth body tilt effect when running
    const targetTilt = vx * 0.001;
    this.currentTilt = Phaser.Math.Interpolation.Linear([this.currentTilt, targetTilt], 0.1);

    this.renderCrispE(vx, vy);
  }

  private renderCrispE(vx: number, vy: number) {
    const g = this.graphics;
    g.clear();

    // Calculate simulated squash & stretch physics
    const isIdle = !this.isMoving;
    const walkCycle = isIdle ? 0 : Math.sin(this.animFrame * 0.25);
    const bounce = isIdle ? Math.sin(this.animFrame * 0.05) * 2 : Math.abs(walkCycle) * 6;
    const bodyY = -15 - bounce;
    
    // Keep timer to know when firing toast (red core and lever shake)
    const isAttacking = this.attackTimer > 0;
    if (isAttacking) this.attackTimer--;

    g.setAngle(Phaser.Math.RadToDeg(this.currentTilt));

    // 1. DYNAMIC SOFT SHADOW
    g.fillStyle(GAME_CONFIG.COLORS.SHADOW || 0x000000, 0.3);
    g.fillEllipse(0, 30, 50 - bounce * 0.5, 12);

    // 2. POWER CORD AND PLUG (Tail)
    const tailWave = Math.sin(this.animFrame * 0.1) * (isIdle ? 5 : 15);
    g.lineStyle(4, 0x1e293b);
    g.beginPath();
    g.moveTo(-15, bodyY + 15);
    // g.quadraticCurveTo(-35, bodyY + 20 + tailWave, -40 + tailWave * 0.5, bodyY + 35);
    g.strokePath();
    
    // Plug head
    g.fillStyle(0x94a3b8);
    g.fillRect(-45 + tailWave * 0.5, bodyY + 33, 10, 8);
    g.lineStyle(2, 0xcbd5e1);
    g.beginPath();
    g.moveTo(-45 + tailWave * 0.5, bodyY + 35); g.lineTo(-49 + tailWave * 0.5, bodyY + 35);
    g.moveTo(-45 + tailWave * 0.5, bodyY + 39); g.lineTo(-49 + tailWave * 0.5, bodyY + 39);
    g.strokePath();

    // 3. TREAD SYSTEM (Treads)
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(-25, 15, 50, 16, 8);
    
    // Rolling tread grooves
    g.fillStyle(0x334155);
    const offset = isIdle ? (this.animFrame * 0.5) % 10 : (this.animFrame * 2) % 10;
    for(let i=0; i<6; i++) {
        let lineX = -20 + i*10 - offset;
        if(lineX > -23 && lineX < 23) {
            g.fillRect(lineX, 15, 3, 16);
        }
    }
    
    // Wheel hubs
    g.fillStyle(0x94a3b8);
    g.fillCircle(-15, 23, 4);
    g.fillCircle(0, 23, 4);
    g.fillCircle(15, 23, 4);

    // 4. MAIN CHASSIS
    // Dark back shell layer
    g.fillStyle(0x64748b);
    g.fillRoundedRect(-25, bodyY - 5, 50, 38, 10);
    // Reflective front shell (Chrome)
    g.fillStyle(0xe2e8f0);
    g.fillRoundedRect(-22, bodyY - 3, 44, 34, 8);
    // Cyber design groove lines
    g.fillStyle(0x94a3b8);
    g.fillRect(-15, bodyY + 25, 30, 2);
    g.fillRect(-15, bodyY + 28, 30, 2);

    // 5. TOASTING SLOTS & YELLOW/RED HEAT CORE
    g.fillStyle(0x0f172a);
    g.fillRoundedRect(-15, bodyY - 8, 12, 6, 2);
    g.fillRoundedRect(3, bodyY - 8, 12, 6, 2);
    
    // Flashes red when attacking, orange normally
    const heatPulse = isAttacking ? 1 : (Math.sin(this.animFrame * 0.1) + 1) / 2;
    const glowColor = isAttacking ? 0xef4444 : 0xf97316; // Red or Neon Orange
    g.fillStyle(glowColor, 0.6 + heatPulse * 0.4);
    g.fillRect(-13, bodyY - 7, 8, 3);
    g.fillRect(5, bodyY - 7, 8, 3);

    // 6. TOAST LEVER
    g.fillStyle(0x0f172a);
    g.fillRect(22, bodyY + 5, 4, 18); // Lever slot
    // Lever shakes down when toasting (attacking)
    const leverY = isAttacking ? 10 : (this.isMoving ? Math.abs(walkCycle) * 4 : 0);
    g.fillStyle(0xef4444); // Red button
    g.fillRoundedRect(20, bodyY + 5 + leverY, 8, 6, 2);

    // 7. DIGITAL LED DISPLAY
    g.fillStyle(0x020617);
    g.fillRoundedRect(-18, bodyY + 4, 36, 16, 4);
    // Scanline effect horizontal lines on display
    g.fillStyle(0x1e293b, 0.3);
    g.fillRect(-18, bodyY + 6, 36, 2);
    g.fillRect(-18, bodyY + 10, 36, 2);
    g.fillRect(-18, bodyY + 14, 36, 2);

    // ---- SYNC TEXT TO DISPLAY ----
    // Slight bounce following body breathing rhythm
    this.faceText.y = bodyY + 12 + (Math.sin(this.animFrame * 0.1) > 0.5 ? 0.5 : 0);
    
    // Slightly offset Text X position if body is flipped (to keep Text centered on face)
    this.faceText.x = this.isFlipped ? 2 : -2; 
    
    // Update face expression SEQUENTIALLY OVER TIME
    this.faceTimer++;
    if (this.faceTimer >= 80) {
        this.faceTimer = 0;
        this.currentFaceIndex = (this.currentFaceIndex + 1) % this.faceList.length;
    }
    
    // Assign face and color from arrays
    this.faceText.setText(this.faceList[this.currentFaceIndex]);
    this.faceText.setColor(this.faceColors[this.currentFaceIndex]);
  }
}