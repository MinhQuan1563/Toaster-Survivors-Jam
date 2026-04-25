import Phaser from "phaser";
import { Player } from "./Player";
import { GAME_CONFIG } from "./Constants";
import { BaseEnemy } from "./BaseEnemy";
import { Microwave } from "./NormalEnemies/Microwave";
import { Roomba } from "./NormalEnemies/Roomba";
import { RiceCooker } from "./NormalEnemies/RiceCooker";
import { ToastBullet } from "./Weapons/ToastBullet";
import { WashingMachine } from "./Bosses/WashingMachine";
import { EspressoMachine } from "./Bosses/EspressoMachine";
import { DamageNumber } from "./DamageNumber";
import { Blackout } from "./Blackout";
import { VendingMachineTrap } from "./Traps/VendingMachineTrap";
import { SkillManager } from "./SkillManager";

// Upgrade definitions
interface Upgrade {
  id: string;
  key:
    | "aura"
    | "shrapnel"
    | "lightning"
    | "butter"
    | "cutlery"
    | "blender"
    | "regen"
    | "maxhp"
    | "speed"
    | "pickup"
    | "toastlvl"
    | "armor"
    | "luck"
    | "duplicator"
    | "bracer";
  label: string;
  description: string;
  icon?: string;
  color?: number;
  apply: (scene: GameScene) => void;
}

export default class GameScene extends Phaser.Scene {
  // Player stats
  hp = 100;
  maxHp = 100;
  playerSpeed = 200;
  pickupRadius = 80;
  toastLevel = 1;
  toastDmg = 15;
  toastCooldown = 1.1;
  xp = 0;
  xpToNext = 10;
  level = 1;
  spawnTimer = 0;
  elapsed = 0;
  weaponTimer = 0;
  gameOver = false;
  paused = false;
  iFrameTimer = 0;
  trapSpawnTimer = 0;
  trapSpawnInterval = 10;

  // Passive Stats
  armor = 0; // Reduces incoming damage
  hpRegen = 0; // Heals over time
  regenTimer = 0; // Internal timer for regen
  projectileSpeed = 1; // Bracer multiplier (1 = 100%)
  projectileCount = 0; // Duplicator (+ Amount)
  luck = 1; // Clover (Multiplier for good RNG)

  // Buff Status
  public isFrozen: boolean = false;
  private freezeTimer: number = 0;
  private espressoTimer: number = 0;
  public isFrozenByTrap: boolean = false;
  private frozenByTrapTimer: number = 0;

  // Quiz System
  private quizOverlay!: Phaser.GameObjects.Graphics;
  private quizUIContainer!: Phaser.GameObjects.Container;
  private frozenBlockGfx?: Phaser.GameObjects.Graphics;
  player!: Player;
  enemies!: Phaser.Physics.Arcade.Group;
  bullets!: Phaser.Physics.Arcade.Group;
  orbs!: Phaser.Physics.Arcade.Group;
  items!: Phaser.Physics.Arcade.Group;
  traps!: Phaser.Physics.Arcade.Group;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // UI
  hpText!: Phaser.GameObjects.Text;
  hpBar!: Phaser.GameObjects.Graphics;
  xpBar!: Phaser.GameObjects.Graphics;
  timerText!: Phaser.GameObjects.Text;
  levelText!: Phaser.GameObjects.Text;
  gameOverText!: Phaser.GameObjects.Text;
  levelUpContainer!: Phaser.GameObjects.Container;
  iceOverlay!: Phaser.GameObjects.Graphics;
  fpsText!: Phaser.GameObjects.Text;

  // UI Boss Health Bar
  currentBoss: BaseEnemy | null = null;
  bossHpBarBg!: Phaser.GameObjects.Graphics;
  bossHpBarFill!: Phaser.GameObjects.Graphics;
  bossNameText!: Phaser.GameObjects.Text;

  // UI Skills & Tooltip
  skillHUDContainer!: Phaser.GameObjects.Container;
  tooltipContainer!: Phaser.GameObjects.Container;
  tooltipText!: Phaser.GameObjects.Text;

  // Floor
  floor!: Phaser.GameObjects.TileSprite;

  // Blackout effect
  blackout!: Blackout;

  // Skill Manager
  public skillManager!: SkillManager;

  // Upgrade system
  private levelUpKeys: Phaser.Input.Keyboard.Key[] = [];

  // Intro state
  private resumeOverlay!: Phaser.GameObjects.Container;
  public kills: number = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  private toRoman(num: number): string {
    const map: { [key: number]: string } = {
      4: "IV",
      3: "III",
      2: "II",
      1: "I",
    };
    return map[num] || num.toString();
  }

  // --- SAFE SOUND EFFECT MANAGER ---
  public playSoundEffect(key: string, volume: number = 0.5) {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: volume });
    } else {
      console.log(
        `[SFX Missing]: Tried to play sound '${key}' but it was not found.`,
      );
    }
  }

  // --- VISUAL EFFECT (VFX) MANAGER ---

  // 1. Spark effect when hit by a bullet
  public createSparkVFX(x: number, y: number, color: number = 0xfef08a) {
    for (let i = 0; i < 4; i++) {
      const spark = this.add.graphics({ x, y });
      spark.fillStyle(color);
      spark.fillRect(-2, -2, 4, 4);
      spark.setDepth(150);

      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 80);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(200, 400),
        onComplete: () => spark.destroy(),
      });
    }
  }

  // 2. Explosion effect (when an enemy dies)
  public createExplosionVFX(x: number, y: number, scaleMod: number = 1) {
    const boom = this.add.graphics({ x, y });
    boom.setDepth(140);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 300,
      onUpdate: (tween) => {
        const p = tween.getValue();
        boom.clear();
        // White core
        boom.fillStyle(0xffffff, 1 - p);
        boom.fillCircle(0, 0, 15 * p * scaleMod);
        // Orange flame
        boom.fillStyle(0xff6600, (1 - p) * 0.8);
        boom.fillCircle(0, 0, 30 * p * scaleMod);
        // Dark smoke ring
        boom.lineStyle(2, 0x333333, 1 - p);
        boom.strokeCircle(0, 0, 45 * p * scaleMod);
      },
      onComplete: () => boom.destroy(),
    });
  }

  // 3. Smoke trail effect behind bullets
  public createTrailVFX(x: number, y: number) {
    const trail = this.add.graphics({ x, y });
    trail.fillStyle(0x78350f, 0.5); // Toasted bread color
    trail.fillCircle(0, 0, Phaser.Math.Between(3, 6));
    trail.setDepth(8); // Below the bullet

    this.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.1,
      y: y - 10,
      duration: 300,
      onComplete: () => trail.destroy(),
    });
  }

  create() {
    this.hp = 100;
    this.maxHp = 100;
    this.playerSpeed = 200;
    this.pickupRadius = 80;
    this.toastLevel = 1;
    this.toastDmg = 15;
    this.toastCooldown = 1.1;
    this.xp = 0;
    this.xpToNext = 10;
    this.level = 1;
    this.spawnTimer = 0;
    this.elapsed = 0;
    this.weaponTimer = 0;
    this.gameOver = false;
    this.paused = false;
    this.iFrameTimer = 0;
    this.currentBoss = null;
    this.isFrozen = false;
    this.isFrozenByTrap = false;
    this.frozenByTrapTimer = 0;
    this.freezeTimer = 0;
    this.espressoTimer = 0;
    this.armor = 0;
    this.hpRegen = 0;
    this.regenTimer = 0;
    this.projectileSpeed = 1;
    this.projectileCount = 0;
    this.luck = 1;
    this.kills = 0;

    this.sound.play("bgm_battle", { loop: true, volume: 0.1 });

    this.physics.world.setBounds(
      0,
      0,
      GAME_CONFIG.WORLD_W,
      GAME_CONFIG.WORLD_H,
    );

    this.floor = this.add.tileSprite(
      GAME_CONFIG.WORLD_W / 2,
      GAME_CONFIG.WORLD_H / 2,
      GAME_CONFIG.WORLD_W,
      GAME_CONFIG.WORLD_H,
      "floor",
    );

    this.player = new Player(
      this,
      GAME_CONFIG.WORLD_W / 2,
      GAME_CONFIG.WORLD_H / 2,
    );
    this.player.setDepth(10);

    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.bullets = this.physics.add.group({ runChildUpdate: true });
    this.orbs = this.physics.add.group({ runChildUpdate: false });
    this.traps = this.physics.add.group({ runChildUpdate: false });
    this.items = this.physics.add.group({ runChildUpdate: false });

    this.skillManager = new SkillManager(this);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_W, GAME_CONFIG.WORLD_H);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.levelUpKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.onBulletHitEnemy as any,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.onPlayerHitEnemy as any,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.orbs,
      this.onPickupOrb as any,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.items,
      this.onPickupItem as any,
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.traps,
      this.onPlayerHitTrap as any,
      undefined,
      this,
    );

    this.createUI();

    this.initFrozenBlockGfx();

    // Initialize blackout effect
    this.blackout = new Blackout(this, this.player, {
      minDuration: 5,
      maxDuration: 10,
      visionRadius: 150,
      minInterval: 50,
      maxInterval: 110,
      enabled: true,
    });

    this.input.keyboard!.on("keydown-R", () => {
      if (this.gameOver) this.scene.restart();
    });

    this.input.keyboard!.on("keydown-K", () => {
      if (!this.gameOver && !this.paused) {
        this.level++;
        this.showLevelUp();
      }
    });

    // Bấm phím J: Lập tức gọi ra 10 con quái để test skill (làm bao cát)
    this.input.keyboard!.on("keydown-J", () => {
      if (!this.gameOver && !this.paused) {
        for (let i = 0; i < 10; i++) {
          this.spawnEnemy();
        }
      }
    });

    // Bấm phím M: Lập tức sinh ra một hộp quà buff (EMP, Đóng băng...)
    this.input.keyboard!.on("keydown-M", () => {
      if (!this.gameOver && !this.paused) {
        this.spawnBuffItem(this.player.x + 50, this.player.y);
      }
    });

    this.createResumeOverlay();

    this.game.events.on("blur", () => {
      if (!this.gameOver && !this.paused) {
        this.showResumeMenu();
      }
    });
  }

  private createResumeOverlay() {
    const cam = this.cameras.main;
    this.resumeOverlay = this.add
      .container(0, 0)
      .setDepth(3000)
      .setScrollFactor(0)
      .setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, cam.width, cam.height);

    const midText = this.add
      .text(cam.width / 2, cam.height / 2, "GET READY\n\n\n\nTAP TO CONTINUE", {
        fontSize: "60px",
        fontFamily: "monospace",
        fontStyle: "bold",
        align: "center",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.resumeOverlay.add([bg, midText]);

    const hitArea = this.add
      .zone(0, 0, cam.width, cam.height)
      .setOrigin(0, 0)
      .setInteractive()
      .setScrollFactor(0);

    hitArea.on("pointerdown", () => {
      this.hideResumeMenu();
    });

    this.resumeOverlay.add(hitArea);
  }

  private showResumeMenu() {
    this.paused = true;
    this.physics.pause();
    this.resumeOverlay.setVisible(true);
  }

  private hideResumeMenu() {
    this.paused = false;
    this.physics.resume();
    this.resumeOverlay.setVisible(false);
  }

  createUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(205);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.hpText = this.add
      .text(16, 16, "", {
        fontSize: "14px",
        color: "#ffffff",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(206);

    this.timerText = this.add
      .text(width - 16, 16, "00:00", {
        fontSize: "18px",
        color: "#0f172a",
        fontFamily: "monospace",
        fontStyle: "bold",
        stroke: "#ffffff",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setOrigin(1, 0);

    this.fpsText = this.add
      .text(width - 16, 40, "FPS: 60", {
        fontSize: "14px",
        color: "#00ff00",
        fontFamily: "monospace",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(200)
      .setOrigin(1, 0);

    this.levelText = this.add
      .text(width / 2, 16, "Lv.1", {
        fontSize: "14px",
        color: "#ffdd00",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setOrigin(0.5, 0);

    // Skill HUD (Below HP Bar)
    this.skillHUDContainer = this.add
      .container(16, 55)
      .setScrollFactor(0)
      .setDepth(205);

    // Tooltip
    this.tooltipContainer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(310)
      .setVisible(false);

    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x0f172a, 0.9);
    tooltipBg.fillRoundedRect(0, 0, 200, 60, 4);
    tooltipBg.lineStyle(2, 0x475569);
    tooltipBg.strokeRoundedRect(0, 0, 200, 60, 4);
    this.tooltipText = this.add.text(10, 10, "", {
      fontSize: "12px",
      color: "#e2e8f0",
      fontFamily: "Arial, sans-serif",
    });
    this.tooltipContainer.add([tooltipBg, this.tooltipText]);

    // --- UI Boss ---
    this.bossHpBarBg = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(150)
      .setVisible(false);
    this.bossHpBarFill = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(151)
      .setVisible(false);
    this.bossNameText = this.add
      .text(width / 2, 40, "", {
        fontSize: "20px",
        color: "#ff4444",
        fontFamily: "monospace",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: { color: "#ff0000", blur: 5, fill: true },
      })
      .setScrollFactor(0)
      .setDepth(152)
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.gameOverText = this.add
      .text(width / 2, height / 2, "", {
        fontSize: "32px",
        color: "#ff4444",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
      })
      .setScrollFactor(0)
      .setDepth(200)
      .setOrigin(0.5);

    this.levelUpContainer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    // Background overlay for freeze effect
    this.iceOverlay = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(199)
      .setVisible(false);
    this.iceOverlay.fillStyle(0x06b6d4, 0.2);
    this.iceOverlay.fillRect(0, 0, width, height);

    // Quiz overlay graphics
    this.quizOverlay = this.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(true);

    // Quiz UI container for text and graphics
    this.quizUIContainer = this.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(301)
      .setVisible(true);
  }

  // DISPLAY PASSIVES IN HUD
  updateSkillHUD() {
    this.skillHUDContainer.removeAll(true);

    // --- ROW 1: Essential Passives (Directly below HP bar) ---
    let passiveX = 0;
    const passives = [
      {
        key: "armor",
        icon: "icon_armor",
        name: "Steel Plating",
        val: this.armor,
        max: 30,
      },
      {
        key: "regen",
        icon: "icon_regen",
        name: "Self-Repair",
        val: this.hpRegen,
        max: 4,
      },
      {
        key: "bracer",
        icon: "icon_bracer",
        name: "Spring",
        val: Math.round((this.projectileSpeed - 1) * 5),
        max: 20,
      },
      {
        key: "duplicator",
        icon: "icon_duplicator",
        name: "Extra Slot",
        val: this.projectileCount,
        max: 2,
      },
      {
        key: "luck",
        icon: "icon_luck",
        name: "Luck",
        val: Math.round((this.luck - 1) * 10),
        max: 40,
      },
      {
        key: "toastlvl",
        icon: "icon_toast",
        name: "Toast Level",
        val: this.toastLevel,
        max: 16,
      },
    ];

    passives.forEach((p) => {
      if (p.val > 0) {
        const icon = this.add
          .sprite(passiveX, 4, p.icon)
          .setOrigin(0, 0)
          .setScale(0.6); // Scale smaller
        const isMax = p.val >= p.max;
        const lvlText = this.add
          .text(passiveX + 24, 28, isMax ? "MAX" : `${p.val}`, {
            fontSize: "10px",
            fontFamily: "monospace",
            color: isMax ? "#facc15" : "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(1, 1);

        const zone = this.add
          .zone(passiveX, 4, 24, 24)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        zone.on("pointerover", (pointer: any) => {
          this.tooltipText.setText(`[${p.name}]\nCurrent Level: ${p.val}`);
          this.tooltipContainer.setPosition(pointer.x + 10, pointer.y + 10);
          this.tooltipContainer.setVisible(true);
        });
        zone.on("pointermove", (pointer: any) => {
          this.tooltipContainer.setPosition(pointer.x + 10, pointer.y + 10);
        });
        zone.on("pointerout", () => {
          this.tooltipContainer.setVisible(false);
        });

        this.skillHUDContainer.add([icon, lvlText, zone]);
        passiveX += 30; // Tighter spacing for passives
      }
    });

    // --- ROW 2: Active Weapon Skills (Below Passives) ---
    let activeX = 0;
    const activeY = 38; // Vertical spacing between rows
    const weaponKeys: (
      | "aura"
      | "shrapnel"
      | "lightning"
      | "butter"
      | "cutlery"
      | "blender"
    )[] = ["aura", "shrapnel", "lightning", "butter", "cutlery", "blender"];

    weaponKeys.forEach((key) => {
      const lv = this.skillManager.levels[key];
      if (lv > 0) {
        const data = SkillManager.SKILL_DATA[key];
        const icon = this.add
          .sprite(activeX, activeY, data.icon)
          .setOrigin(0, 0)
          .setScale(0.8);
        const isMax = lv === 4;
        const lvlText = this.add
          .text(activeX + 32, activeY + 32, isMax ? "MAX" : `${lv}`, {
            fontSize: "10px",
            fontFamily: "monospace",
            color: isMax ? "#facc15" : "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(1, 1);

        const zone = this.add
          .zone(activeX, activeY, 32, 32)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        zone.on("pointerover", (pointer: any) => {
          this.tooltipText.setText(
            `[${data.name}]\n${data.tiers[lv - 1].shortDesc}`,
          );
          this.tooltipContainer
            .setPosition(pointer.x + 10, pointer.y + 10)
            .setVisible(true)
            .setDepth(310);
        });
        zone.on("pointermove", (pointer: any) => {
          this.tooltipContainer.setPosition(pointer.x + 10, pointer.y + 10);
        });
        zone.on("pointerout", () => {
          this.tooltipContainer.setVisible(false);
        });

        this.skillHUDContainer.add([icon, lvlText, zone]);
        activeX += 40;
      }
    });
  }

  update(_time: number, delta: number) {
    // Draw freeze effect if active
    this.drawFrozenBlockEffect(_time);

    if (this.gameOver || this.paused) return;

    const dt = delta / 1000;
    this.elapsed += dt;

    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.regenTimer += dt;

      const regenCooldown = 5 - this.hpRegen;

      if (this.regenTimer >= regenCooldown) {
        this.regenTimer = 0;
        this.hp = Math.min(this.maxHp, this.hp + 1);
        if (typeof DamageNumber !== "undefined")
          DamageNumber.create(this, this.player.x, this.player.y, 1, "heal");
      }
    }

    // Handle espresso hyper mode timer
    if (this.espressoTimer > 0) {
      this.espressoTimer -= delta;
      if (this.espressoTimer <= 0) {
        this.player.isHyper = false;
      }
    }

    // Handle freeze timer
    if (this.freezeTimer > 0) {
      this.freezeTimer -= delta;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
        this.iceOverlay.setVisible(false);
        if (!this.isFrozenByTrap) this.showFrozenBlock(false);
        this.enemies.getChildren().forEach((e: any) => {
          if (e.visual && !e.isBoss) e.visual.setAlpha(1);
        });
      }
    }

    // Handle Trap freeze timer
    if (this.frozenByTrapTimer > 0) {
      this.frozenByTrapTimer -= delta;
      if (this.frozenByTrapTimer <= 0) {
        this.frozenByTrapTimer = 0;
        this.isFrozenByTrap = false;
        if (!this.isFrozen) this.showFrozenBlock(false);
      }
    }

    // Move Player
    this.movePlayer();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.isFrozenByTrap) {
      this.player.setVelocity(0, 0);
      this.player.update(0, 0);
    } else {
      this.player.update(body.velocity.x, body.velocity.y);
    }

    // Update skills (Aura, Shrapnel, Lightning, Butter, Cutlery)
    this.skillManager.update(delta);

    this.spawnTimer += dt;
    if (this.spawnTimer >= Math.max(0.4, 1.5 - this.elapsed * 0.01)) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Spawn traps
    this.trapSpawnTimer += dt;
    if (this.trapSpawnTimer >= this.trapSpawnInterval) {
      this.trapSpawnTimer = 0;
      this.spawnTrap();
    }

    this.enemies.getChildren().forEach((e: any) => {
      if (!e.active) return;

      const isFrozenByItem = this.isFrozen && !e.isBoss;
      const isStunnedBySkill = this.skillManager.stunnedEnemies.has(e);

      if (isFrozenByItem || isStunnedBySkill) {
        if (e.body) (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      } else {
        if (e.update) e.update(_time, delta);
      }
    });

    // Fire bullets
    this.weaponTimer += dt;
    const currentCooldown =
      this.toastCooldown * (this.player.isHyper ? 0.2 : 1);
    if (
      this.weaponTimer >= currentCooldown &&
      !this.isFrozen &&
      !this.isFrozenByTrap
    ) {
      this.weaponTimer = 0;
      this.fireToast();
    }

    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (!bullet.active) return;
      const cam = this.cameras.main;
      if (
        bullet.x < cam.scrollX - 100 ||
        bullet.x > cam.scrollX + cam.width + 100 ||
        bullet.y < cam.scrollY - 100 ||
        bullet.y > cam.scrollY + cam.height + 100
      ) {
        bullet.destroy();
      }
    });

    if (this.iFrameTimer > 0) this.iFrameTimer -= dt;

    // Orb magnetization
    this.orbs.getChildren().forEach((o) => {
      const orb = o as Phaser.Physics.Arcade.Sprite;
      if (!orb.active) return;

      // [OPTIMIZATION] Use squared distance
      const distSq = Phaser.Math.Distance.Squared(
        this.player.x,
        this.player.y,
        orb.x,
        orb.y,
      );

      const pickupRadiusSq = this.pickupRadius * this.pickupRadius;

      if (orb.getData("magnetized") || distSq < pickupRadiusSq) {
        this.physics.moveToObject(orb, this.player, 500);
      }
    });

    this.updateUI();

    // Update blackout effect
    this.blackout.update(delta);
  }

  movePlayer() {
    if (this.paused || this.isFrozenByTrap) {
      this.player.setVelocity(0, 0);
      return;
    }

    let vx = 0,
      vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const speed = this.playerSpeed * (this.player.isHyper ? 1.8 : 1);
    this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
  }

  private initFrozenBlockGfx() {
    if (this.frozenBlockGfx) return;
    this.frozenBlockGfx = this.add.graphics().setDepth(999).setVisible(false);
  }

  /**
   * Utility function to wrap text
   */
  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine += (currentLine ? " " : "") + word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random();
    let enemy: any;

    // --- SCALING LOGIC (Enemy) ---
    const minutesSurvived = Math.floor(this.elapsed / 60);
    const hpMult = 1 + minutesSurvived * 0.2;
    const dmgMult = 1 + minutesSurvived * 0.2;
    // Boss Scaling
    const bossHpMult = 1 + minutesSurvived * 0.8;

    // --- GOLDEN CARTON SPAWN LOGIC ---
    const isGoldenCarton = r < 0.03 * this.luck;
    const spawnRadius = isGoldenCarton ? 250 : 550;

    const x = this.player.x + Math.cos(angle) * spawnRadius;
    const y = this.player.y + Math.sin(angle) * spawnRadius;

    // --- BOSS SPAWN LOGIC ---
    if (this.elapsed > 120 && r < 0.02 && !isGoldenCarton) {
      enemy = new EspressoMachine(
        this,
        x,
        y,
        1200 * bossHpMult,
        150,
        15 * dmgMult,
      );

      this.currentBoss = enemy;
    } else if (this.elapsed > 60 && r < 0.04 && !isGoldenCarton) {
      enemy = new WashingMachine(
        this,
        x,
        y,
        1500 * bossHpMult,
        70,
        20 * dmgMult,
      );

      if (!this.currentBoss || !this.currentBoss.active) {
        this.currentBoss = enemy;
      }
    }
    // --- GOLDEN CARTON ---
    else if (isGoldenCarton) {
      enemy = new BaseEnemy(this, x, y, 30 * hpMult, 250, 0, "GOLDEN_CARTON");
    }
    // --- NORMAL ENEMY TYPES ---
    else if (r < 0.2) {
      enemy = new Microwave(this, x, y, 40 * hpMult, 150, 0);
    } else if (r < 0.3) {
      enemy = new Roomba(this, x, y, 25 * hpMult, 110, 6 * dmgMult);
    } else if (r < 0.4) {
      enemy = new RiceCooker(this, x, y, 180 * hpMult, 60, 14 * dmgMult);
    } else {
      enemy = new BaseEnemy(
        this,
        x,
        y,
        15 * hpMult,
        100,
        5 * dmgMult,
        "CARTON",
      );
    }

    this.enemies.add(enemy);
  }

  spawnTrap() {
    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * 400;
    const y = this.player.y + Math.sin(angle) * 400;

    const trap = new VendingMachineTrap(this, x, y);
    this.traps.add(trap);
  }

  public takePlayerDamage(amount: number) {
    this.onPlayerHitEnemy(this.player, amount);
  }

  public spawnXpOrb(x: number, y: number) {
    // Object Pooling: Reuse dead orbs instead of creating new ones
    let orb = this.orbs.getFirstDead(false) as Phaser.Physics.Arcade.Sprite;

    if (orb) {
      orb.enableBody(true, x, y, true, true);
      orb.setData("magnetized", false);
    } else {
      orb = this.physics.add.sprite(x, y, "screw");
      this.orbs.add(orb);
    }

    orb.setData("xp", 1);
  }

  fireToast() {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearDistSq = Infinity;

    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      // Check squared distance
      const dSq = Phaser.Math.Distance.Squared(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );

      if (dSq < nearDistSq) {
        nearDistSq = dSq;
        nearest = enemy;
      }
    });

    if (!nearest) return;

    // Calculate total shots (Base 1 + Duplicator bonus)
    const totalShots = 1 + this.projectileCount;

    for (let i = 0; i < totalShots; i++) {
      this.time.delayedCall(i * 40, () => {
        if (this.gameOver) return;

        if (this.player.playAttackAnim) this.player.playAttackAnim();
        this.playSoundEffect("shoot", 0.15);

        const bullet = new ToastBullet(
          this,
          this.player.x,
          this.player.y,
          this.toastDmg,
        );
        this.bullets.add(bullet);

        // Re-calculate target position in case enemy moved
        const targetX =
          nearest && nearest.active ? nearest.x : this.player.x + 100;
        const targetY = nearest && nearest.active ? nearest.y : this.player.y;
        const angle = Phaser.Math.Angle.Between(
          this.player.x,
          this.player.y,
          targetX,
          targetY,
        );

        // Apply Bracer (Projectile Speed) multiplier
        const bulletSpeed = 500 * this.projectileSpeed;
        bullet.setVelocity(
          Math.cos(angle) * bulletSpeed,
          Math.sin(angle) * bulletSpeed,
        );

        this.time.delayedCall(2500, () => {
          if (bullet.active) bullet.destroy();
        });
      });
    }
  }

  onBulletHitEnemy(bullet: Phaser.Physics.Arcade.Sprite | any, enemy: any) {
    const dmg = bullet.getDamage
      ? bullet.getDamage()
      : (bullet.getData("dmg") as number);
    bullet.destroy();

    // Trigger Shrapnel effect at enemy position
    this.skillManager.triggerShrapnel(enemy.x, enemy.y, dmg);

    this.cameras.main.shake(30, 0.002);

    if (typeof DamageNumber !== "undefined") {
      DamageNumber.create(this, enemy.x, enemy.y, dmg, "damage");
    }

    if (typeof enemy.takeDamage === "function") {
      enemy.takeDamage(dmg);
    }
  }

  onPlayerHitEnemy(player: Player, enemy: any) {
    if (this.iFrameTimer > 0) return;
    const dmg =
      typeof enemy.getData === "function" ? enemy.getData("dmg") || 5 : enemy;

    // Check for shield buff
    if (this.player.hasShield) {
      this.player.hasShield = false;
      this.iFrameTimer = 0.5;
      this.playSoundEffect("shield_block", 0.4);
      this.createSparkVFX(player.x, player.y, 0xfde047);

      const angle = Phaser.Math.Angle.Between(
        player.x,
        player.y,
        enemy.x,
        enemy.y,
      );
      if (enemy.setVelocity)
        enemy.setVelocity(Math.cos(angle) * 600, Math.sin(angle) * 600);

      if (typeof DamageNumber !== "undefined")
        DamageNumber.create(
          this,
          player.x,
          player.y - 30,
          0,
          "buff",
          { fontSize: 24 },
          "BLOCKED!",
        );
      return;
    }

    const rawDmg = typeof dmg === "number" ? dmg : 5;
    const finalDmg = Math.max(1, rawDmg - this.armor); // Armor reduces damage, minimum 1
    this.hp -= finalDmg;
    this.iFrameTimer = 0.5;
    // Display player damage number (negative shows as -damage)
    DamageNumber.create(
      this,
      player.x,
      player.y - 30,
      -finalDmg,
      "player_damage",
      { fontSize: 32 },
    );

    // SFX & VFX when player takes damage
    this.playSoundEffect("hurt", 0.5);
    this.createSparkVFX(player.x, player.y, 0xff0000);
    this.cameras.main.flash(200, 150, 0, 0);
    this.cameras.main.shake(150, 0.015);

    player.setAlpha(0.5);
    this.time.delayedCall(100, () => player.setAlpha(1));

    if (this.hp <= 0) {
      this.hpText.setText(`HP: 0/${this.maxHp}`);
      this.hpBar.fillStyle(0x333333);
      this.hpBar.fillRect(16, 36, 160, 14);
      this.doGameOver();
    }
  }

  public spawnBuffItem(x: number, y: number) {
    const types = ["HEART", "MAGNET", "BUTTER", "EMP", "WD40"];
    const buffType = Phaser.Math.RND.pick(types);
    const texMap: Record<string, string> = {
      HEART: "item_heart",
      MAGNET: "item_magnet",
      BUTTER: "item_butter",
      EMP: "item_emp",
      WD40: "item_wd40",
    };

    const item = this.physics.add.sprite(x, y, texMap[buffType]);
    item.setData("type", buffType);
    this.tweens.add({
      targets: item,
      y: y - 10,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: "Sine.easeInOut",
    });
    this.items.add(item);
  }

  public freezePlayerFor(durationMs: number) {
    this.frozenByTrapTimer = Math.max(this.frozenByTrapTimer, durationMs);
    this.isFrozenByTrap = true;
    this.player.setVelocity?.(0, 0);
    this.showFrozenBlock(true);
    this.drawFrozenBlockEffect(this.time.now);
  }

  private showFrozenBlock(show: boolean) {
    if (!this.frozenBlockGfx) {
      this.frozenBlockGfx = this.add.graphics().setDepth(999).setVisible(false);
    }
    this.frozenBlockGfx.setVisible(show);
  }

  private drawFrozenBlockEffect(timeMs: number) {
    if (!this.isFrozenByTrap || !this.frozenBlockGfx) return;
    const g = this.frozenBlockGfx;
    const pad = 10;
    const w = 40 + pad * 2;
    const h = 44 + pad * 2;
    const x = this.player.x - w / 2;
    const y = this.player.y - h / 2 - 6;
    const t = timeMs / 1000;
    const shimmer = 0.5 + 0.5 * Math.sin(t * 2.2);
    g.clear();
    g.fillStyle(0x9be7ff, 0.22);
    g.fillRoundedRect(x, y, w, h, 10);

    g.fillStyle(0x06b6d4, 0.18 + 0.06 * shimmer);
    g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, 9);

    // glass highlight stripe
    g.fillStyle(0xffffff, 0.18 + 0.08 * shimmer);
    g.fillRoundedRect(x + w * 0.12, y + h * 0.12, w * 0.18, h * 0.76, 8);

    // border
    g.lineStyle(3, 0xd9fbff, 0.65);
    g.strokeRoundedRect(x, y, w, h, 10);

    // cracks (simple deterministic pattern, animated slightly)
    g.lineStyle(1.5, 0xffffff, 0.35);
    g.beginPath();
    g.moveTo(x + w * 0.52, y + h * 0.3);
    g.lineTo(x + w * 0.7, y + h * (0.18 + 0.02 * shimmer));
    g.lineTo(x + w * 0.82, y + h * 0.32);
    g.moveTo(x + w * 0.52, y + h * 0.3);
    g.lineTo(x + w * 0.4, y + h * 0.52);
    g.lineTo(x + w * 0.22, y + h * 0.62);
    g.moveTo(x + w * 0.48, y + h * 0.58);
    g.lineTo(x + w * 0.62, y + h * 0.74);
    g.strokePath();

    // tiny bubbles
    g.fillStyle(0xffffff, 0.22 + 0.06 * shimmer);
    g.fillCircle(x + w * 0.32, y + h * 0.38, 1.6);
    g.fillCircle(x + w * 0.64, y + h * 0.52, 1.2);
    g.fillCircle(x + w * 0.42, y + h * 0.74, 1.4);
  }

  // When player picks up a buff item
  onPickupItem(_player: any, item: any) {
    const type = item.getData("type");
    item.destroy();
    this.playSoundEffect("pickup", 0.3);

    let buffText = "";
    switch (type) {
      case "HEART":
        this.hp = Math.min(this.maxHp, this.hp + 30);
        buffText = "+30 HP";
        this.createSparkVFX(this.player.x, this.player.y, 0x22c55e);
        break;
      case "MAGNET":
        buffText = "MAGNET!";
        this.orbs
          .getChildren()
          .forEach((o: any) => o.setData("magnetized", true));
        break;
      case "ESPRESSO":
        this.espressoTimer = 6000;
        this.player.isHyper = true;
        buffText = "HYPER MODE!";
        this.playSoundEffect("buff_hyper", 0.4);
        break;
      case "BUTTER":
        this.player.hasShield = true;
        buffText = "BUTTER SHIELD!";
        break;
      case "EMP":
        buffText = "EMP BOMB!";
        this.triggerEMP();
        break;
      case "WD40":
        this.freezeTimer = 3000;
        this.isFrozen = true;
        buffText = "FROZEN!";
        this.iceOverlay.setVisible(true);

        this.triggerWD40Pulse();

        this.enemies.getChildren().forEach((e: any) => {
          if (e.visual && !e.isBoss) e.visual.setAlpha(0.5);
        });
        break;
    }
    if (typeof DamageNumber !== "undefined")
      DamageNumber.create(
        this,
        this.player.x,
        this.player.y - 40,
        0,
        "buff",
        { fontSize: 24, color: "#facc15" },
        buffText,
      );
  }

  private triggerEMP() {
    const empRing = this.add.graphics();
    empRing.setDepth(199);
    this.playSoundEffect("item_emp", 0.2);

    this.tweens.addCounter({
      from: 0,
      to: Math.max(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT) * 1.5,
      duration: 800,
      onUpdate: (tw) => {
        empRing.clear();
        empRing.lineStyle(10, 0x22c55e, 1 - tw.progress);
        empRing.strokeCircle(this.player.x, this.player.y, tw.getValue());
      },
      onComplete: () => {
        empRing.destroy();
        this.enemies.getChildren().forEach((e: any) => {
          if (e.active && !e.isBoss) {
            const empDmg = 150 + this.toastLevel * 10;
            e.takeDamage(empDmg);
            if (typeof DamageNumber !== "undefined")
              DamageNumber.create(this, e.x, e.y, empDmg, "damage", {
                color: "#22c55e",
                fontSize: 24,
              });
          }
        });
      },
    });
    this.cameras.main.flash(300, 34, 197, 94);
  }

  private triggerWD40Pulse() {
    const frostRing = this.add.graphics();
    frostRing.setDepth(199);
    this.playSoundEffect("item_freeze", 0.4);

    this.tweens.addCounter({
      from: 0,
      to: Math.max(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT) * 1.5,
      duration: 600,
      onUpdate: (tw) => {
        frostRing.clear();
        frostRing.lineStyle(15, 0x06b6d4, 1 - tw.progress);
        frostRing.strokeCircle(this.player.x, this.player.y, tw.getValue());
      },
      onComplete: () => {
        frostRing.destroy();
      },
    });

    this.cameras.main.flash(200, 6, 182, 212);
  }

  onPlayerHitTrap(player: Player, trap: VendingMachineTrap) {
    trap.activateTrap();
  }

  onPickupOrb(
    _player: Phaser.Physics.Arcade.Sprite,
    orb: Phaser.Physics.Arcade.Sprite,
  ) {
    const xpVal = (orb.getData("xp") as number) || 1;
    this.xp += xpVal;

    this.playSoundEffect("pickup", 0.1 + (xpVal > 1 ? 0.2 : 0));
    this.createSparkVFX(orb.x, orb.y, 0x38bdf8);

    // Return to pool by disabling body instead of calling orb.destroy()
    orb.disableBody(true, true);

    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.xpToNext + 10 + (this.level * 5);
      this.showLevelUp();
    }
  }

  showLevelUp() {
    this.paused = true;
    this.playSoundEffect("level_up", 0.2);
    this.physics.pause();

    const baseUpgrades: Upgrade[] = [
      {
        id: "maxhp",
        key: "maxhp",
        label: "Reinforced Frame",
        description: "+20 Max HP (Integrity)",
        icon: "icon_hp",
        color: 0xef4444,
        apply: (s) => {
          s.maxHp += 20;
          s.hp = Math.min(s.hp + 20, s.maxHp);
          s.updateSkillHUD();
        },
      },
      {
        id: "speed",
        key: "speed",
        label: "Overdrive Engine",
        description: "+30 Move Speed",
        icon: "icon_speed",
        color: 0xfde047,
        apply: (s) => {
          s.playerSpeed += 30;
          s.updateSkillHUD();
        },
      },
      {
        id: "pickup",
        key: "pickup",
        label: "Magnetic Pull",
        description: "+20 Screw Pickup Radius",
        icon: "icon_pickup",
        color: 0xa855f7,
        apply: (s) => {
          s.pickupRadius += 20;
          s.updateSkillHUD();
        },
      },
      {
        id: "armor",
        key: "armor",
        label: "Steel Plating (Armor)",
        description: "-1 Damage Taken from enemies",
        icon: "icon_armor",
        color: 0x94a3b8,
        apply: (s) => {
          s.armor += 1;
          s.updateSkillHUD();
        },
      },
      {
        id: "bracer",
        key: "bracer",
        label: "High-Tension Spring",
        description: "+10% Projectile Speed",
        icon: "icon_bracer",
        color: 0x38bdf8,
        apply: (s) => {
          s.projectileSpeed += 0.1;
          s.updateSkillHUD();
        },
      },
      {
        id: "luck",
        key: "luck",
        label: "Lucky Charm (Clover)",
        description: "+10% Chance for rare drops",
        icon: "icon_luck",
        color: 0x22c55e,
        apply: (s) => {
          s.luck += 0.1;
          s.updateSkillHUD();
        },
      },
    ];

    if (this.hpRegen < 4) {
      baseUpgrades.push({
        id: "regen",
        key: "regen",
        label: `Self-Repair ${this.toRoman(this.hpRegen + 1)}`,
        description: `+1 HP recovered every ${4 - this.hpRegen} seconds`,
        icon: "icon_regen",
        color: 0x22c55e,
        apply: (s) => {
          s.hpRegen += 1;
          s.updateSkillHUD();
        },
      });
    }

    if (this.projectileCount < 1) {
      baseUpgrades.push({
        id: "duplicator",
        key: "duplicator",
        label: "Extra Slot (Duplicator)",
        description: "+1 Projectile fired per attack",
        icon: "icon_duplicator",
        color: 0xd946ef,
        apply: (s) => {
          s.projectileCount += 1;
          s.updateSkillHUD();
        },
      });
    }

    if (this.toastLevel < 20) {
      baseUpgrades.push({
        id: "toastlvl",
        key: "toastlvl",
        label: "High-Heat Toast Core",
        description: "+5 Toast Damage\n-0.05s Cooldown",
        icon: "icon_toast",
        color: 0xf97316,
        apply: (s) => {
          s.toastLevel++;
          s.toastDmg += 5;
          s.toastCooldown = Math.max(0.3, s.toastCooldown - 0.05);
        },
      });
    }

    // Select skill upgrades based on current levels (level < 4)
    const skillKeys: (
      | "aura"
      | "shrapnel"
      | "lightning"
      | "butter"
      | "cutlery"
      | "blender"
    )[] = ["aura", "shrapnel", "lightning", "butter", "cutlery", "blender"];
    const skillUpgrades: Upgrade[] = [];

    skillKeys.forEach((key) => {
      const currentLvl = this.skillManager.levels[key];
      if (currentLvl < 4) {
        const data = SkillManager.SKILL_DATA[key];
        const nextTierData = data.tiers[currentLvl];
        skillUpgrades.push({
          id: `skill_${key}_${currentLvl + 1}`,
          key: key,
          label:
            data.name +
            (currentLvl === 3 ? " [MAX]" : ` ${this.toRoman(currentLvl + 1)}`),
          description: nextTierData.desc,
          icon: data.icon,
          color: data.color,
          apply: (s) => {
            s.skillManager.levels[key]++;
            s.updateSkillHUD(); // Update icons below the HP bar
          },
        });
      }
    });

    const pool = [...skillUpgrades, ...baseUpgrades]; // Combine skill and stat upgrades
    const picks: Upgrade[] = [];
    while (picks.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }

    this.levelUpContainer.removeAll(true);
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const overlay = this.add.graphics().setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, cam.width, cam.height);
    this.levelUpContainer.add(overlay);
    const title = this.add
      .text(cx, cy - 250, `LEVEL ${this.level} - CHOOSE AN UPGRADE`, {
        fontSize: "42px",
        color: "#facc15",
        fontFamily: "monospace",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.levelUpContainer.add(title);

    const cardW = 280;
    const cardH = 380;
    const spacing = 40;
    const totalW = cardW * 3 + spacing * 2;
    const startX = cx - totalW / 2 + cardW / 2;

    picks.forEach((upgrade, i) => {
      const bx = startX + i * (cardW + spacing);
      const by = cy + 20; // Vị trí y trung tâm

      const bg = this.add.graphics().setScrollFactor(0);
      const mainColor = upgrade.color || 0x475569;

      const drawCard = (isHover: boolean) => {
        bg.clear();
        bg.fillStyle(isHover ? 0x1e293b : 0x0f172a, 0.95);
        // Vẽ card dọc nhưng xếp hàng ngang
        bg.fillRoundedRect(bx - cardW / 2, by - cardH / 2, cardW, cardH, 12);
        bg.lineStyle(isHover ? 6 : 3, isHover ? 0xffffff : mainColor);
        bg.strokeRoundedRect(bx - cardW / 2, by - cardH / 2, cardW, cardH, 12);
      };
      drawCard(false);
      this.levelUpContainer.add(bg);

      // Icon to hơn ở phía trên card
      if (upgrade.icon) {
        const icon = this.add
          .sprite(bx, by - 100, upgrade.icon)
          .setScale(2) // Phóng to icon
          .setScrollFactor(0);
        this.levelUpContainer.add(icon);
      }

      // Label (Tên skill)
      const lblTxt = this.add
        .text(bx, by - 10, upgrade.label, {
          fontSize: "22px",
          color: "#ffffff",
          fontFamily: "monospace",
          fontStyle: "bold",
          align: "center",
          wordWrap: { width: cardW - 20 },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0);

      // Description (Mô tả)
      const descTxt = this.add
        .text(bx, by + 60, upgrade.description, {
          fontSize: "16px",
          color: "#cbd5e1",
          fontFamily: "Arial",
          align: "center",
          wordWrap: { width: cardW - 40 },
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0);

      // Thêm dòng hướng dẫn phím bấm [1], [2], [3]
      const keyHint = this.add
        .text(bx, by + cardH / 2 - 30, `Press [${i + 1}]`, {
          fontSize: "16px",
          color: "#94a3b8",
          fontFamily: "monospace",
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

      this.levelUpContainer.add([lblTxt, descTxt, keyHint]);

      // Vùng tương tác chuột
      const zone = this.add
        .zone(bx, by, cardW, cardH)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      zone.on("pointerover", () => drawCard(true));
      zone.on("pointerout", () => drawCard(false));
      zone.on("pointerdown", () => this.executeUpgrade(upgrade));

      this.levelUpContainer.add(zone);
    });
    this.levelUpContainer.setVisible(true);

    this.setupLevelUpControls(picks);
  }

  // Hàm hỗ trợ chọn upgrade
  private executeUpgrade(upgrade: Upgrade) {
    upgrade.apply(this);
    this.cleanupLevelUpControls();
    this.hideLevelUp();
  }

  // Thiết lập phím 1, 2, 3
  private setupLevelUpControls(picks: Upgrade[]) {
    this.levelUpKeys.forEach((key, index) => {
      // Xóa các sự kiện cũ nếu có
      key.removeAllListeners();

      // Chỉ thêm sự kiện nếu có đủ số lượng upgrade tương ứng
      if (picks[index]) {
        key.once("down", () => {
          this.executeUpgrade(picks[index]);
        });
      }
    });
  }

  // Xóa sự kiện khi đóng bảng
  private cleanupLevelUpControls() {
    this.levelUpKeys.forEach((key) => key.removeAllListeners());
  }

  hideLevelUp() {
    this.levelUpContainer.setVisible(false);
    this.levelUpContainer.removeAll(true);
    this.paused = false;
    this.physics.resume();
  }

  doGameOver() {
    this.gameOver = true;
    this.physics.pause();

    this.saveBestTimeScore();
    const bestTime = this.getBestTime();

    const cam = this.cameras.main;
    const width = cam.width;
    const height = cam.height;

    const goContainer = this.add
      .container(0, 0)
      .setDepth(2000)
      .setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, 0, width, height);
    goContainer.add(bg);

    const title = this.add
      .text(width / 2, height / 2 - 160, "GAME OVER", {
        fontSize: "72px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#f97316",
      })
      .setOrigin(0.5);

    // Tính thời gian hiện tại
    const mins = Math.floor(bestTime / 60);
    const secs = Math.floor(bestTime % 60);
    const currentTimeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const currentMins = Math.floor(this.elapsed / 60);
    const currentSecs = Math.floor(this.elapsed % 60);
    const currentTime = `${String(currentMins).padStart(2, "0")}:${String(currentSecs).padStart(2, "0")}`;

    // Hiển thị thông số (Thêm Best Time vào đây)
    const statsStyle = {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#ffffff",
    };
    const bestTxt = this.add
      .text(width / 2, height / 2 - 40, `YOUR BEST SCORE: ${currentTimeStr}`, {
        ...statsStyle,
        color: "#facc15",
      })
      .setOrigin(0.5);
    const timeTxt = this.add
      .text(
        width / 2,
        height / 2 + 10,
        `CURRENT TIME: ${currentTime}`,
        statsStyle,
      )
      .setOrigin(0.5);

    const killTxt = this.add
      .text(width / 2, height / 2 + 60, `KILLS: ${this.kills}`, statsStyle)
      .setOrigin(0.5);

    // Nút Restart (Hình chữ nhật bo góc trắng như hình 5)
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xffffff, 1);
    btnBg.fillRoundedRect(width / 2 - 140, height / 2 + 140, 280, 50, 10);

    const restartTxt = this.add
      .text(width / 2, height / 2 + 165, "PRESS R TO RESTART", {
        fontSize: "20px",
        fontFamily: "monospace",
        fontStyle: "bold",
        color: "#000000",
      })
      .setOrigin(0.5);

    goContainer.add([title, bestTxt, timeTxt, killTxt, btnBg, restartTxt]);
    goContainer.setAlpha(0);
    this.tweens.add({ targets: goContainer, alpha: 1, duration: 500 });
  }

  saveBestTimeScore() {
    const best = this.getBestTime();
    if (!best || this.elapsed > best) {
      localStorage.setItem("bestTime", this.elapsed.toString());
    }
  }

  getBestTime() {
    const best = localStorage.getItem("bestTime");
    return best ? parseFloat(best) : null;
  }

  shutdown() {
    if (this.blackout) {
      this.blackout.destroy();
    }
  }

  updateUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const hpBarWidth = Math.max(160, this.maxHp * 1.5);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x000000, 0.5);
    this.hpBar.fillRoundedRect(16, 36, hpBarWidth, 16, 8);
    this.hpBar.fillStyle(0xef4444, 0.8);
    this.hpBar.fillRoundedRect(
      16,
      36,
      hpBarWidth * (this.hp / this.maxHp),
      16,
      8,
    );
    this.hpText.setText(`HP: ${this.hp}/${this.maxHp}`);

    this.xpBar.clear();
    this.xpBar.fillStyle(0x333333);
    this.xpBar.fillRect(0, height - 10, width, 10);
    this.xpBar.fillStyle(0xd946ef, 0.8);
    this.xpBar.fillRect(0, height - 10, width * (this.xp / this.xpToNext), 10);

    const mins = Math.floor(this.elapsed / 60);
    const secs = Math.floor(this.elapsed % 60);
    this.timerText.setText(
      `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    );

    this.levelText.setText(`LVL ${this.level}`);

    // --- UPDATE BOSS HEALTH BAR ---
    if (this.currentBoss && this.currentBoss.active) {
      const barWidth = 300;
      const barHeight = 16;
      const bx = width / 2 - barWidth / 2;
      const by = 65;
      const percent = Math.max(0, this.currentBoss.hp / this.currentBoss.maxHp);

      this.bossHpBarBg.clear();
      this.bossHpBarBg.fillStyle(0x000000, 0.8);
      this.bossHpBarBg.fillRoundedRect(
        bx - 4,
        by - 4,
        barWidth + 8,
        barHeight + 8,
        4,
      );
      this.bossHpBarBg.lineStyle(2, 0x555555);
      this.bossHpBarBg.strokeRoundedRect(
        bx - 4,
        by - 4,
        barWidth + 8,
        barHeight + 8,
        4,
      );

      this.bossHpBarFill.clear();
      this.bossHpBarFill.fillStyle(0xff2222, 1);
      this.bossHpBarFill.fillRoundedRect(
        bx,
        by,
        barWidth * percent,
        barHeight,
        2,
      );
    }

    // --- UPDATE FPS ---
    const currentFps = Math.round(this.game.loop.actualFps);
    this.fpsText.setText(`FPS: ${currentFps} || Enemies: ${this.enemies.countActive()}`);

    if (currentFps >= 55) {
      this.fpsText.setColor("#22c55e");
    } else if (currentFps >= 30) {
      this.fpsText.setColor("#facc15");
    } else {
      this.fpsText.setColor("#ef4444");
    }
  }

  public spawnSteamCloud(x: number, y: number) {
    const cloud = this.add.graphics();
    cloud.fillStyle(0xffffff, 0.5);
    cloud.fillCircle(x, y, 150);
    cloud.setDepth(50);

    this.tweens.add({
      targets: cloud,
      alpha: 0,
      scale: 1.5,
      duration: 2000,
      onComplete: () => cloud.destroy(),
    });
  }

  public spawnCoffeePuddle(x: number, y: number) {
    const puddle = this.add.graphics();
    puddle.fillStyle(0x451a03, 0.7);
    puddle.fillCircle(x, y, 20);

    this.time.delayedCall(3000, () => puddle.destroy());

    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      x,
      y,
    );
    if (dist < 25) {
      this.takePlayerDamage(2);
      DamageNumber.create(
        this,
        this.player.x,
        this.player.y - 30,
        -2,
        "player_damage",
        { fontSize: 24 },
      );
    }
  }

  public spawnSocks(x: number, y: number) {
    const sock = this.physics.add.sprite(x, y, "toast");
    sock.setTint(0xffffff);
    this.physics.moveToObject(sock, this.player, 250);

    this.time.delayedCall(2000, () => {
      if (sock.active) sock.destroy();
    });
  }
}
