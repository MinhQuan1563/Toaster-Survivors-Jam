import Phaser from "phaser";
import { BaseEnemy } from "../BaseEnemy";
import GameScene from "../GameScene";

/**
 * BOSS: Mad Washing Machine
 * Skills (Keep original):
 * - Fire dirty Boomerang socks.
 * - Spin Mode: Violent shaking, creates a vortex that sucks the player in.
 */
export class WashingMachine extends BaseEnemy {
  private stateWashingMachine: "CHASE" | "SHOOTING" | "SPINNING" = "CHASE";
  private stateTimer: number = 0;

  // Boomerang sock skill management
  private socksGroup: Phaser.Physics.Arcade.Group;
  private socksFired: number = 0;
  private nextSockTime: number = 0;

  // Suction skill management
  private vortexGraphics: Phaser.GameObjects.Graphics;
  private pullStrength: number = 220;

  // Animation, Visuals & UI
  private drumRotation: number = 0;
  private foamBubbles: { x: number; y: number; life: number }[] = [];
  private angryGlow: number = 0;

  // Health bar floating below the Boss
  private hpBarGraphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: GameScene,
    x: number,
    y: number,
    hp: number,
    speed: number,
    damage: number,
  ) {
    super(scene, x, y, hp, speed, damage);

    this.hpBarGraphics = scene.add.graphics();
    this.add(this.hpBarGraphics);

    this.createSockTexture(scene);

    this.socksGroup = scene.physics.add.group();

    scene.physics.add.overlap(
      scene.player,
      this.socksGroup,
      (player: any, sock: any) => {
        if (sock.active) {
          scene.takePlayerDamage(15);
          sock.destroy();
        }
      },
    );

    this.vortexGraphics = scene.add.graphics();
    this.vortexGraphics.setDepth(1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(70, 80);
    body.setOffset(-35, -40);
    body.setMass(1000);
  }

  private createSockTexture(scene: Phaser.Scene) {
    if (!scene.textures.exists("dirty_sock")) {
      const g = scene.make.graphics({ x: 0, y: 0 });

      g.fillStyle(0x8fbc8f);
      g.lineStyle(2, 0x2f4f4f);

      // 1. Draw sock cuff
      g.fillRoundedRect(5, 5, 15, 25, 5);
      g.strokeRoundedRect(5, 5, 15, 25, 5);

      // 2. Draw foot (extend to the right)
      g.fillRoundedRect(5, 20, 30, 15, 5);
      g.strokeRoundedRect(5, 20, 30, 15, 5);

      // 3. Fill overlap area to remove borders (seamless effect)
      g.fillStyle(0x8fbc8f);
      g.fillRect(7, 18, 11, 4);

      // 4. Stain marks
      g.fillStyle(0x556b2f);
      g.fillCircle(12, 12, 3);
      g.fillCircle(26, 27, 4);

      // Create texture with proper size (40x40)
      g.generateTexture("dirty_sock", 40, 40);
      g.destroy();
    }
  }

  update(time: number, delta: number) {
    super.update(time, delta);
    if (!this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const player = this.sceneRef.player;
    const dt = delta / 1000;

    this.stateTimer += delta;

    const spinSpeed =
      this.stateWashingMachine === "SPINNING"
        ? 25
        : this.stateWashingMachine === "CHASE"
          ? 2
          : 0;
    this.drumRotation += spinSpeed * dt;

    this.visual.scaleX = player.x < this.x ? -1 : 1;

    this.vortexGraphics.clear();

    // ----------------------------------------
    // GAME LOGIC (KEEP ORIGINAL)
    // ----------------------------------------
    if (this.stateWashingMachine === "CHASE") {
      this.sceneRef.physics.moveToObject(this, player, this.speed);
      this.visual.rotation = Math.sin(time * 0.01) * 0.1;
      this.angryGlow = Phaser.Math.Linear(this.angryGlow, 0, 0.1);

      if (this.stateTimer > 6000) this.switchState("SHOOTING");
    } else if (this.stateWashingMachine === "SHOOTING") {
      body.setVelocity(0, 0);
      this.visual.rotation = 0;
      this.angryGlow = 0.5 + Math.sin(time * 0.01) * 0.5;

      if (time > this.nextSockTime && this.socksFired < 6) {
        this.fireBoomerangSock();
        this.nextSockTime = time + 400;
        this.socksFired++;
        this.sceneRef.tweens.add({
          targets: this.visual,
          x: -10 * this.visual.scaleX,
          yoyo: true,
          duration: 100,
        });
      }

      if (this.stateTimer > 4000) this.switchState("SPINNING");
    } else if (this.stateWashingMachine === "SPINNING") {
      body.setVelocity(0, 0);
      this.visual.x = Phaser.Math.Between(-4, 4);
      this.visual.y = Phaser.Math.Between(-4, 4);
      this.angryGlow = 1;

      this.applySuctionForce(player, dt, time);

      if (this.stateTimer > 5000) {
        this.switchState("CHASE");
        this.visual.x = 0;
        this.visual.y = 0;
      }
    }

    this.updateSocks(dt);

    this.drawLocalHpBar();
  }

  private drawLocalHpBar() {
    this.hpBarGraphics.clear();

    if (this.hp <= 0) return;

    const barWidth = 80;
    const barHeight = 8;
    const bx = -barWidth / 2;
    const by = 55;
    const percent = Math.max(0, this.hp / this.maxHp);

    // Health bar background (black/gray)
    this.hpBarGraphics.fillStyle(0x000000, 0.8);
    this.hpBarGraphics.fillRect(bx - 2, by - 2, barWidth + 4, barHeight + 4);

    // Boss health (red)
    this.hpBarGraphics.fillStyle(0xff2222, 1);
    this.hpBarGraphics.fillRect(bx, by, barWidth * percent, barHeight);
  }

  private switchState(newState: "CHASE" | "SHOOTING" | "SPINNING") {
    this.stateWashingMachine = newState;
    this.stateTimer = 0;
    if (newState === "SHOOTING") {
      this.socksFired = 0;
      this.nextSockTime = this.sceneRef.time.now + 500;
    }
    this.sceneRef.tweens.add({
      targets: this.visual,
      y: -15,
      yoyo: true,
      duration: 150,
    });
  }

  private fireBoomerangSock() {
    const sock = this.socksGroup.create(
      this.x,
      this.y,
      "dirty_sock",
    ) as Phaser.Physics.Arcade.Sprite;
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.sceneRef.player.x,
      this.sceneRef.player.y,
    );
    const spread = Phaser.Math.FloatBetween(-0.8, 0.8);
    const fireAngle = angle + spread;
    const speed = 400;
    sock.setVelocity(Math.cos(fireAngle) * speed, Math.sin(fireAngle) * speed);
    sock.setData("lifeTime", 0);
    sock.setData(
      "rotSpeed",
      Phaser.Math.FloatBetween(5, 15) * Phaser.Math.RND.sign(),
    );
  }

  private updateSocks(dt: number) {
    this.socksGroup.getChildren().forEach((s: any) => {
      const sock = s as Phaser.Physics.Arcade.Sprite;
      if (!sock.active) return;
      let life = sock.getData("lifeTime") + dt;
      sock.setData("lifeTime", life);
      sock.angle += sock.getData("rotSpeed");

      if (life > 0.5) {
        const angleToBoss = Phaser.Math.Angle.Between(
          sock.x,
          sock.y,
          this.x,
          this.y,
        );
        const returnAccel = 800;
        sock.setAcceleration(
          Math.cos(angleToBoss) * returnAccel,
          Math.sin(angleToBoss) * returnAccel,
        );
        const distToBoss = Phaser.Math.Distance.Between(
          sock.x,
          sock.y,
          this.x,
          this.y,
        );
        if (life > 1.0 && distToBoss < 40) sock.destroy();
      }
      if (life > 5) sock.destroy();
    });
  }

  private applySuctionForce(player: any, dt: number, time: number) {
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y,
    );
    if (dist < 500) {
      const angle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        this.x,
        this.y,
      );
      const force = this.pullStrength * (1 - dist / 600);
      player.x += Math.cos(angle) * force * dt;
      player.y += Math.sin(angle) * force * dt;
      if (dist < 50) this.sceneRef.takePlayerDamage(1);
    }

    this.vortexGraphics.setPosition(this.x, this.y);
    for (let i = 0; i < 3; i++) {
      const radius = 400 - ((time * 0.4 + i * 150) % 400);
      this.vortexGraphics.lineStyle(
        4,
        0x94a3b8,
        0.1 + (1 - radius / 400) * 0.4,
      );
      this.vortexGraphics.beginPath();
      this.vortexGraphics.arc(0, 0, radius, 0, Math.PI * 2, false, 0.1);
      this.vortexGraphics.strokePath();
    }
  }

  protected die() {
    if (this.vortexGraphics) this.vortexGraphics.destroy();
    this.socksGroup.clear(true, true);
    this.hpBarGraphics.clear();

    for (let i = 0; i < 15; i++) {
      const rx = this.x + Phaser.Math.Between(-40, 40);
      const ry = this.y + Phaser.Math.Between(-40, 40);
      const orb = this.sceneRef.physics.add.sprite(rx, ry, "screw");
      orb.setData("xp", 2);
      orb.setTint(0xff00ff);
      this.sceneRef.orbs.add(orb);
    }

    super.die();
  }

  // ----------------------------------------
  // BEAUTIFUL NEW WASHING MACHINE APPEARANCE
  // ----------------------------------------
  protected drawEnemy() {
    const g = this.visual;
    g.clear();

    const isSpinning = this.stateWashingMachine === "SPINNING";
    const isShooting = this.stateWashingMachine === "SHOOTING";

    const w = 80;
    const h = 90;

    // Washing machine frame
    g.fillStyle(0xe2e8f0);
    g.lineStyle(4, 0x718096);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Control panel
    g.fillStyle(0xcbd5e0);
    g.fillRect(-w / 2, -h / 2, w, 20);
    g.lineStyle(2, 0x718096);
    g.beginPath();
    g.moveTo(-w / 2, -h / 2 + 20);
    g.lineTo(w / 2, -h / 2 + 20);
    g.strokePath();

    // Crazy dial knob
    g.save();
    g.translateCanvas(-20, -h / 2 + 10);
    if (isSpinning || isShooting) g.rotateCanvas(this.animFrame * 0.3);
    g.fillStyle(0x2d3748);
    g.fillCircle(0, 0, 6);
    g.fillStyle(0xff0000);
    g.fillRect(-1, -4, 2, 4);
    g.restore();

    // Status LED light
    const ledColor = isSpinning ? 0xf56565 : isShooting ? 0xecc94b : 0x48bb78;
    g.fillStyle(ledColor);
    g.fillCircle(20, -h / 2 + 10, 4);

    // ANGRY FACE (Eyebrows) appears when attacking/spinning
    if (this.angryGlow > 0) {
      g.fillStyle(0xe53e3e, 0.5 + this.angryGlow * 0.5);
      g.save();
      g.translateCanvas(0, -10);
      g.rotateCanvas(0.3);
      g.fillRect(-30, 0, 20, 6);
      g.rotateCanvas(-0.6);
      g.fillRect(10, 0, 20, 6);
      g.restore();
    }

    // Glass door & Washing drum
    const doorY = 15;
    const doorRadius = 26;

    g.fillStyle(0xa0aec0);
    g.fillCircle(0, doorY, doorRadius + 6);
    g.lineStyle(3, 0x4a5568);
    g.strokeCircle(0, doorY, doorRadius + 6);

    let drumColor = 0x1a202c;
    if (isShooting) drumColor = 0x2f855a;
    if (isSpinning) drumColor = 0x742a2a;

    g.fillStyle(drumColor);
    g.fillCircle(0, doorY, doorRadius);

    // Rotating clothes inside
    g.save();
    g.translateCanvas(0, doorY);
    g.rotateCanvas(this.drumRotation);

    g.lineStyle(6, 0xdd6b20);
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 0.5, false);
    g.strokePath();
    g.lineStyle(8, 0xe2e8f0);
    g.beginPath();
    g.arc(0, 0, 20, Math.PI, Math.PI * 1.5, false);
    g.strokePath();
    g.lineStyle(4, 0x48bb78);
    g.beginPath();
    g.arc(0, 0, 10, Math.PI * 0.7, Math.PI * 1.2, false);
    g.strokePath();
    g.restore();

    // Glossy glass shine
    if (!isShooting) {
      g.fillStyle(0xffffff, 0.15);
      g.beginPath();
      g.arc(0, doorY, doorRadius, -Math.PI * 0.8, -Math.PI * 0.2, false);
      g.lineTo(0, doorY);
      g.closePath();
      g.fillPath();
    } else {
      g.lineStyle(4, 0x94a3b8);
      g.beginPath();
      g.arc(-doorRadius, doorY, doorRadius, 0, Math.PI * 2, false);
      g.strokePath();
    }

    // Washing machine legs
    g.fillStyle(0x4a5568);
    g.fillRect(-30, h / 2, 10, 6);
    g.fillRect(20, h / 2, 10, 6);

    // Soap bubbles overflowing
    if (isSpinning && Math.random() < 0.3) {
      this.foamBubbles.push({
        x: Phaser.Math.Between(-20, 20),
        y: 35,
        life: 1,
      });
    }

    for (let i = this.foamBubbles.length - 1; i >= 0; i--) {
      let b = this.foamBubbles[i];
      b.y -= 0.5;
      b.x += Math.sin(b.y * 0.1) * 0.5;
      b.life -= 0.02;

      if (b.life <= 0) {
        this.foamBubbles.splice(i, 1);
      } else {
        g.fillStyle(0xffffff, b.life);
        g.fillCircle(b.x, b.y, 5);
        g.lineStyle(1, 0x93c5fd, b.life);
        g.strokeCircle(b.x, b.y, 5);
      }
    }
  }
}
