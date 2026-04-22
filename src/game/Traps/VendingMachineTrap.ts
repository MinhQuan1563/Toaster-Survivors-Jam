import Phaser from "phaser";
import GameScene from "../GameScene";

export class VendingMachineTrap extends Phaser.GameObjects.Container {
  private isActivated: boolean = false;
  private sceneRef: GameScene;
  private shocked: boolean = false;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);
    this.sceneRef = scene;

    // Create graphics object to draw vending machine
    const graphics = scene.add.graphics();
    this.renderVendingMachine(graphics);
    this.add(graphics);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(60, 60);
    body.setOffset(-30, -30);

    this.setDepth(5);
  }

  private renderVendingMachine(graphics: Phaser.GameObjects.Graphics) {
    // Drawing Helper Functions
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      graphics.fillStyle(Phaser.Display.Color.HexStringToColor(c).color);
      graphics.fillRect(x - 32, y - 32, w, h);
    };

    const p = (x: number, y: number, c: string) => {
      graphics.fillStyle(Phaser.Display.Color.HexStringToColor(c).color);
      graphics.fillRect(x - 32, y - 32, 1, 1);
    };

    // --- PALETTE ---
    const C_OUTLINE = "#181425"; // Bold dark outline
    const C_SHADOW = "#1a1a1a"; // Subtle drop shadow
    const C_BASE = "#f4f4f4"; // White/light gray casing
    const C_SHADE = "#94b0c2"; // Casing shadow
    const C_HIGH = "#ffffff"; // Casing highlight
    const C_GLASS = "#29366f"; // Dark glass
    const C_LCD = "#38b764"; // Small green display
    const C_FLAP = "#566c86"; // Dispenser slot flap

    // --- RENDER SPRITE ---

    // 1. Drop Shadow (Subtle pill shape at bottom)
    rect(16, 56, 32, 4, C_SHADOW);
    rect(18, 60, 28, 1, "#0a0a0a");
    rect(14, 55, 36, 2, "#0d0d0d");

    // 2. Bold Outline (Rounded Rectangle 36x48)
    rect(16, 8, 32, 1, C_OUTLINE); // Top
    rect(16, 55, 32, 1, C_OUTLINE); // Bottom
    rect(14, 10, 1, 44, C_OUTLINE); // Left
    rect(49, 10, 1, 44, C_OUTLINE); // Right
    // Corners
    p(15, 9, C_OUTLINE);
    p(48, 9, C_OUTLINE);
    p(15, 54, C_OUTLINE);
    p(48, 54, C_OUTLINE);

    // 3. Base Body Fill
    rect(15, 10, 34, 44, C_BASE);
    rect(16, 9, 32, 1, C_BASE);
    rect(16, 54, 32, 1, C_BASE);

    // 4. Body Shading & Highlights (For depth)
    rect(15, 10, 1, 44, C_HIGH); // Left highlight
    rect(16, 9, 32, 1, C_HIGH); // Top highlight
    p(15, 9, C_HIGH); // Corner highlight

    rect(48, 10, 1, 44, C_SHADE); // Right core shadow
    rect(16, 54, 32, 1, C_SHADE); // Bottom core shadow
    p(48, 54, C_SHADE); // Corner shadow
    rect(47, 10, 1, 44, "#b0c4de"); // Shadow transition

    // 5. Divider Line (Subtle panel detail)
    rect(16, 14, 32, 1, C_SHADE);

    // 6. Product Display Window
    rect(17, 16, 22, 25, C_OUTLINE); // Window outline
    rect(18, 17, 20, 23, C_GLASS); // Glass backplate

    // Shelves
    rect(18, 24, 20, 1, C_OUTLINE);
    rect(18, 32, 20, 1, C_OUTLINE);

    // Vending Items (Pixel blobs for arcade style)
    const drawCan = (x: number, y: number, c: string) => {
      rect(x, y, 3, 4, c);
      rect(x + 1, y, 1, 4, C_HIGH); // Shine
    };
    const drawSnack = (x: number, y: number, c1: string, c2: string) => {
      rect(x, y, 4, 4, c1);
      rect(x + 1, y + 1, 2, 2, c2);
    };

    // Shelf 1 (Top)
    drawCan(19, 20, "#e43b44"); // Red
    drawCan(24, 20, "#38b764"); // Green
    drawCan(29, 20, "#f77622"); // Orange
    drawCan(34, 20, "#3b5dc9"); // Blue

    // Shelf 2 (Middle)
    drawSnack(19, 28, "#fee761", "#f77622");
    drawSnack(25, 28, "#feae34", "#e43b44");
    drawSnack(31, 28, "#e43b44", "#ffffff");

    // Shelf 3 (Bottom)
    drawCan(20, 36, "#a22633");
    drawCan(25, 36, "#a22633");
    drawCan(30, 36, "#a22633");
    drawCan(35, 36, "#a22633");

    // Glass Glare (Diagonal Slants)
    const diagLine = (x: number, y: number, len: number) => {
      graphics.fillStyle(0x73eff7, 0.15);
      for (let i = 0; i < len; i++) {
        graphics.fillRect(x - i - 32, y + i - 32, 1, 1);
      }
    };
    diagLine(32, 17, 8);
    diagLine(37, 17, 13);
    diagLine(38, 26, 10);

    // 7. Control Panel (Right Side)
    // Green LCD Display
    rect(41, 16, 6, 4, C_OUTLINE);
    rect(42, 17, 4, 2, C_LCD);
    p(42, 17, "#a7f070"); // LCD Glow
    p(44, 18, "#257179"); // LCD Text shadow mock

    // Coin Slot
    rect(43, 22, 2, 4, C_OUTLINE);
    p(43, 23, "#f4f4f4"); // Silver coin detail

    // Simple Buttons
    rect(41, 28, 6, 9, C_OUTLINE); // Button panel frame
    rect(42, 29, 4, 7, C_SHADE); // Button panel back
    p(42, 29, "#e43b44");
    p(44, 29, "#e43b44"); // Red buttons
    p(42, 31, "#ffffff");
    p(44, 31, "#ffffff"); // White buttons
    p(42, 33, "#3b5dc9");
    p(44, 33, "#3b5dc9"); // Blue buttons
    p(42, 35, "#f77622"); // Single orange button

    // 8. Base Details & Branding Stripe
    rect(15, 41, 34, 2, "#3b5dc9"); // Blue stripe
    p(15, 41, "#73eff7");
    p(15, 42, "#73eff7"); // Stripe Left highlight
    p(48, 41, "#29366f");
    p(48, 42, "#29366f"); // Stripe Right shadow

    // 9. Item Dispenser Slot (Bottom)
    rect(17, 44, 30, 9, C_OUTLINE); // Slot frame
    rect(18, 45, 28, 7, "#000000"); // Inner dark void

    // Dispenser Flap
    rect(19, 45, 26, 5, C_FLAP);
    rect(19, 45, 26, 1, C_SHADE); // Flap hinge highlight

    // Vended Item sticking out
    rect(24, 48, 8, 4, "#e43b44"); // Vended red can
    rect(25, 48, 2, 4, C_HIGH); // Can highlight
    rect(24, 50, 8, 2, "#1a1a1a"); // Ambient occlusion shadow on can
  }

  /**
   * Trigger the trap - 50% XP, 50% shock damage
   */
  public activateTrap() {
    if (this.isActivated) return;
    this.isActivated = true;

    const player = this.sceneRef.player;
    const chance = Math.random();

    if (chance < 0.5) {
      // Drop XP
      this.spawnXpReward();
      this.playHappyAnimation();
    } else {
      // Shock and damage
      this.shockPlayer();
    }

    // Destroy trap after activation
    this.sceneRef.time.delayedCall(500, () => {
      this.destroy();
    });
  }

  private spawnXpReward() {
    this.sceneRef.playSoundEffect("pickup", 0.3);

    // Spawn 2-3 XP orbs
    const orbCount = Phaser.Math.Between(2, 3);
    for (let i = 0; i < orbCount; i++) {
      const angle = (Math.PI * 2 * i) / orbCount;
      const offsetX = Math.cos(angle) * 30;
      const offsetY = Math.sin(angle) * 30;
      this.sceneRef.spawnXpOrb(this.x + offsetX, this.y + offsetY);
    }

    // Happy animation
    this.createParticles("#38b764", 8);
  }

  private shockPlayer() {
    const player = this.sceneRef.player;
    const shockDamage = 5;
    const shockDuration = Phaser.Math.Between(1, 2); // 1-2 seconds

    // Deal damage
    this.sceneRef.hp -= shockDamage;

    // Visual feedback
    this.sceneRef.playSoundEffect("hurt", 0.5);
    this.sceneRef.createSparkVFX(this.x, this.y, 0xffff00); // Yellow sparks for electric
    this.createLightningEffect(player);

    // Stun the player
    const body = player.body as Phaser.Physics.Arcade.Body;
    const originalVelocityX = body.velocity.x;
    const originalVelocityY = body.velocity.y;

    body.setVelocity(0, 0);

    // Create lightning ring around player
    this.createLightningRing(player, shockDuration);

    // Flash the player using tween
    this.sceneRef.tweens.add({
      targets: player,
      alpha: { from: 0.5, to: 1 },
      duration: 100,
      repeat: (shockDuration * 10) - 1,
      yoyo: true,
    });

    // Unfreeze player after stun duration
    this.sceneRef.time.delayedCall(shockDuration * 500, () => {
      body.setVelocity(originalVelocityX, originalVelocityY);
      player.setAlpha(1);
      this.shocked = false;
    });

    this.shocked = true;

    // Electric particles
    this.createParticles("#ffff00", 12);
  }

  private createLightningRing(target: Phaser.GameObjects.Container, duration: number) {
    const numBolts = 8; // Number of lightning bolts around the ring
    const radius = 50; // Distance from player center
    
    // Create multiple lightning arcs around the player
    for (let i = 0; i < numBolts; i++) {
      const angle = (Math.PI * 2 * i) / numBolts;
      const endX = target.x + Math.cos(angle) * radius;
      const endY = target.y + Math.sin(angle) * radius;

      const lightning = this.sceneRef.add.graphics();
      lightning.setDepth(25);
      
      // Draw jagged lightning bolt
      this.drawJaggedLightning(lightning, target.x, target.y, endX, endY);

      // Fade and destroy lightning
      this.sceneRef.tweens.add({
        targets: lightning,
        alpha: 0,
        duration: 200 + Math.random() * 200,
        onComplete: () => lightning.destroy(),
      });

      // Repeat lightning strikes during stun
      for (let strike = 1; strike < duration * 2; strike++) {
        this.sceneRef.time.delayedCall(strike * 500, () => {
          if (target.active && this.sceneRef) {
            const newLightning = this.sceneRef.add.graphics();
            newLightning.setDepth(25);
            this.drawJaggedLightning(newLightning, target.x, target.y, endX, endY);
            
            this.sceneRef.tweens.add({
              targets: newLightning,
              alpha: 0,
              duration: 150 + Math.random() * 150,
              onComplete: () => newLightning.destroy(),
            });
          }
        });
      }
    }

    // Add a glowing circle effect around the player
    const glowCircle = this.sceneRef.add.graphics();
    glowCircle.setDepth(24);
    glowCircle.lineStyle(2, 0xffff00, 0.8);
    glowCircle.strokeCircle(0, 0, radius);
    
    // Make glow circle follow player and fade
    this.sceneRef.tweens.add({
      targets: glowCircle,
      alpha: 0,
      duration: duration * 1000,
      onUpdate: () => {
        glowCircle.x = target.x;
        glowCircle.y = target.y;
      },
      onComplete: () => glowCircle.destroy(),
    });
  }

  private drawJaggedLightning(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    graphics.lineStyle(2, 0xffff00, 1);
    graphics.beginPath();
    graphics.moveTo(startX, startY);

    // Create jagged path with random deviations
    const segments = 5;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      
      // Random deviation for jagged effect
      const deviation = (Math.random() - 0.5) * 20;
      const perpAngle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
      
      const jX = x + Math.cos(perpAngle) * deviation;
      const jY = y + Math.sin(perpAngle) * deviation;
      
      graphics.lineTo(jX, jY);
    }
    
    graphics.lineTo(endX, endY);
    graphics.strokePath();
  }

  private createLightningEffect(target: Phaser.GameObjects.Container) {
    // Create a simple line between trap and player
    const line = this.sceneRef.add.graphics();
    line.lineStyle(3, 0xffff00, 0.8);
    line.beginPath();
    line.moveTo(this.x, this.y);
    line.lineTo(target.x, target.y);
    line.strokePath();
    line.setDepth(20);

    // Fade out the line
    this.sceneRef.tweens.add({
      targets: line,
      alpha: 0,
      duration: 300,
      onComplete: () => line.destroy(),
    });
  }

  private playHappyAnimation() {
    // Bounce animation
    this.sceneRef.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });

    // Rotate animation
    this.sceneRef.tweens.add({
      targets: this,
      rotation: 0.1,
      duration: 150,
      yoyo: true,
      repeat: 2,
    });
  }

  private createParticles(color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const particle = this.sceneRef.add.graphics({ x: this.x, y: this.y });
      particle.fillStyle(Phaser.Display.Color.HexStringToColor(color).color);
      particle.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      particle.setDepth(15);

      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(100, 250);

      this.sceneRef.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * speed,
        y: this.y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(400, 600),
        onComplete: () => particle.destroy(),
      });
    }
  }

  update() {
    // Could add idle animations here
  }
}
