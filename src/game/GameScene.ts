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

// Upgrade definitions
interface Upgrade {
  key: string;
  label: string;
  description: string;
  apply: (scene: GameScene) => void;
  canApply: (scene: GameScene) => boolean;
}

const UPGRADES: Upgrade[] = [
  {
    key: "maxhp",
    label: "+Max HP",
    description: "+20 Integrity",
    apply: (s) => {
      s.maxHp += 20;
      s.hp = Math.min(s.hp + 20, s.maxHp);
    },
    canApply: () => true,
  },
  {
    key: "speed",
    label: "+Move Speed",
    description: "+30 Speed",
    apply: (s) => {
      s.playerSpeed += 30;
    },
    canApply: () => true,
  },
  {
    key: "pickup",
    label: "+Pickup Radius",
    description: "+20 Pickup",
    apply: (s) => {
      s.pickupRadius += 20;
    },
    canApply: () => true,
  },
  {
    key: "toastlvl",
    label: "Burnt Toast Level+",
    description: "+2 damage, -0.05s cooldown",
    apply: (s) => {
      s.toastLevel++;
      s.toastDmg += 2;
      s.toastCooldown = Math.max(0.15, s.toastCooldown - 0.05);
    },
    canApply: (s) => s.toastLevel < 10,
  },
];

export default class GameScene extends Phaser.Scene {
  // Player stats
  hp = 100;
  maxHp = 100;
  playerSpeed = 200;
  pickupRadius = 80;
  toastLevel = 1;
  toastDmg = 15;
  toastCooldown = 0.6;
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

  // Buff Status
  public isFrozen: boolean = false;
  private freezeTimer: number = 0;
  private espressoTimer: number = 0;

  // Game objects
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

  // UI NEW: Boss Health Bar
  currentBoss: BaseEnemy | null = null;
  bossHpBarBg!: Phaser.GameObjects.Graphics;
  bossHpBarFill!: Phaser.GameObjects.Graphics;
  bossNameText!: Phaser.GameObjects.Text;

  // Floor
  floor!: Phaser.GameObjects.TileSprite;

  // Blackout effect
  blackout!: Blackout;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // --- SFX ---
    this.load.audio("shoot", "/assets/sounds/shoot.ogg");
    this.load.audio("hit", "/assets/sounds/hit.ogg");
    this.load.audio("explode", "/assets/sounds/explode.ogg");
    this.load.audio("hurt", "/assets/sounds/hurt.ogg");
    this.load.audio("pickup", "/assets/sounds/pickup.ogg");
    this.load.audio("level_up", "/assets/sounds/level_up.ogg");
    this.load.audio("bgm_battle", "/assets/sounds/bgm_battle.ogg");

    this.createTextures();
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

  createTextures() {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Player: Toaster (32x32)
    g.clear();
    g.fillStyle(0xc0c0c0);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x808080);
    g.fillRect(4, 2, 10, 14);
    g.fillRect(18, 2, 10, 14);
    g.fillStyle(0xff6600);
    g.fillRect(6, 4, 6, 8);
    g.fillRect(20, 4, 6, 8);
    g.fillStyle(0x333333);
    g.fillRect(14, 18, 4, 12);
    g.generateTexture("toaster", 32, 32);

    // Bullet: Burnt Toast (28x28)
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(2, 4, 24, 24, 6);
    g.fillStyle(0x78350f);
    g.fillRoundedRect(0, 0, 24, 24, 6);
    g.fillStyle(0xfef08a);
    g.fillRoundedRect(2, 2, 20, 20, 4);
    g.fillStyle(0xc2410c, 0.3);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0x9a3412, 0.5);
    g.fillCircle(12, 12, 6);
    g.fillStyle(0x431407, 0.6);
    g.fillCircle(12, 12, 2.5);
    g.fillStyle(0xd97706, 0.6);
    g.fillCircle(6, 6, 1);
    g.fillCircle(18, 5, 1.5);
    g.fillCircle(5, 18, 1);
    g.fillCircle(19, 19, 1);
    g.fillCircle(8, 16, 0.5);
    g.fillCircle(16, 11, 1);
    g.fillCircle(8, 8, 1);
    g.lineStyle(1.5, 0xffffff, 0.5);
    g.beginPath();
    g.moveTo(4, 2);
    g.lineTo(20, 2);
    g.strokePath();
    g.generateTexture("toast", 28, 28);

    // XP Orb: Screw
    g.clear();
    g.fillStyle(0x94a3b8);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xe2e8f0);
    g.fillCircle(7, 7, 4);
    g.lineStyle(2, 0x334155);
    g.beginPath();
    g.moveTo(4, 4);
    g.lineTo(16, 16);
    g.strokePath();
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(4, 16);
    g.strokePath();
    g.generateTexture("screw", 20, 20);

    // Floor tile (64x64)
    g.clear();
    g.fillStyle(0xf5e6c8);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0xe0d0b0);
    g.strokeRect(0, 0, 64, 64);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture("floor", 64, 64);

    // Heart
    g.clear();
    g.fillStyle(0xef4444);
    g.fillCircle(10, 12, 6);
    g.fillCircle(20, 12, 6);
    g.beginPath();
    g.moveTo(4, 13);
    g.lineTo(26, 13);
    g.lineTo(15, 26);
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokePath();
    g.generateTexture("item_heart", 30, 30);

    // Magnet
    g.clear();
    g.lineStyle(8, 0xef4444);
    g.beginPath();
    g.arc(15, 15, 10, Math.PI, 0);
    g.strokePath();
    g.lineStyle(8, 0xe2e8f0);
    g.beginPath();
    g.moveTo(5, 15);
    g.lineTo(5, 22);
    g.moveTo(25, 15);
    g.lineTo(25, 22);
    g.strokePath();
    g.generateTexture("item_magnet", 30, 30);

    // Espresso item
    g.clear();
    g.fillStyle(0xffffff);
    g.fillRoundedRect(5, 10, 18, 16, 4);
    g.lineStyle(3, 0xffffff);
    g.strokeCircle(25, 18, 5);
    g.fillStyle(0x451a03);
    g.fillEllipse(14, 12, 14, 4);
    g.lineStyle(2, 0xffffff);
    g.beginPath();
    g.moveTo(10, 6);
    g.lineTo(13, 2);
    g.moveTo(17, 6);
    g.lineTo(14, 2);
    g.strokePath();
    g.generateTexture("item_espresso", 35, 30);

    // Butter
    g.clear();
    g.fillStyle(0xffffff);
    g.fillEllipse(15, 22, 24, 8);
    g.fillStyle(0xfef08a);
    g.fillRoundedRect(5, 10, 20, 12, 2);
    g.generateTexture("item_butter", 30, 30);

    // Bomb EMP
    g.clear();
    g.fillStyle(0x22c55e);
    g.fillCircle(15, 15, 12);
    g.lineStyle(2, 0x86efac);
    g.beginPath();
    g.moveTo(7, 15);
    g.lineTo(12, 8);
    g.lineTo(18, 15);
    g.lineTo(23, 8);
    g.strokePath();
    g.generateTexture("item_emp", 30, 30);

    // Bomb WD-40
    g.clear();
    g.fillStyle(0x0284c7);
    g.fillRoundedRect(8, 10, 14, 18, 2);
    g.fillStyle(0xfde047);
    g.fillRect(8, 16, 14, 6);
    g.fillStyle(0xe2e8f0);
    g.fillRect(12, 6, 6, 4);
    g.lineStyle(3, 0xef4444);
    g.beginPath();
    g.moveTo(15, 8);
    g.lineTo(28, 2);
    g.strokePath();
    g.generateTexture("item_wd40", 30, 30);

    g.destroy();
  }

  create() {
    this.hp = 100;
    this.maxHp = 100;
    this.playerSpeed = 200;
    this.pickupRadius = 80;
    this.toastLevel = 1;
    this.toastDmg = 15;
    this.toastCooldown = 0.6;
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
    this.freezeTimer = 0;
    this.espressoTimer = 0;

    this.sound.play("bgm_battle", { loop: true, volume: 0.25 });

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

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.WORLD_W, GAME_CONFIG.WORLD_H);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

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

    // Initialize blackout effect
    this.blackout = new Blackout(this, this.player, {
      minDuration: 5,
      maxDuration: 10,
      visionRadius: 120,
      minInterval: 10,
      maxInterval: 30,
      enabled: false,
    });

    this.input.keyboard!.on("keydown-R", () => {
      if (this.gameOver) this.scene.restart();
    });
  }

  createUI() {
    const width = GAME_CONFIG.CANVAS_WIDTH;
    const height = GAME_CONFIG.CANVAS_HEIGHT;

    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
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
      .setDepth(101);

    this.timerText = this.add
      .text(width - 16, 16, "00:00", {
        fontSize: "16px",
        color: "#ffffff",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(101)
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

    // --- UI Boss: Large Health Bar in Center of Screen ---
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
    this.iceOverlay = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(199)
      .setVisible(false);
    this.iceOverlay.fillStyle(0x06b6d4, 0.2);
    this.iceOverlay.fillRect(0, 0, width, height);
  }

  update(_time: number, delta: number) {
    if (this.gameOver || this.paused) return;

    const dt = delta / 1000;
    this.elapsed += dt;

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
        
        this.enemies.getChildren().forEach((e: any) => {
          if (e.visual && !e.isBoss) e.visual.setAlpha(1);
        });
      }
    }

    // Move Player
    this.movePlayer();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    this.player.update(body.velocity.x, body.velocity.y);

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

      if (this.isFrozen && !e.isBoss) {
        if (e.body) (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
      else {
        if (e.update) e.update(_time, delta);
      }
    });

    // Fire bullets
    this.weaponTimer += dt;
    const currentCooldown =
      this.toastCooldown * (this.player.isHyper ? 0.2 : 1);
    if (this.weaponTimer >= currentCooldown) {
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
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        orb.x,
        orb.y,
      );
      if (orb.getData("magnetized") || dist < this.pickupRadius) {
        this.physics.moveToObject(orb, this.player, 500);
      }
    });

    this.updateUI();

    // Update blackout effect
    this.blackout.update(delta);
  }

  movePlayer() {
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

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random();
    let enemy: any;

    // --- GOLDEN CARTON SPAWN LOGIC ---
    const isGoldenCarton = r < 0.03;
    const spawnRadius = isGoldenCarton ? 250 : 550;

    const x = this.player.x + Math.cos(angle) * spawnRadius;
    const y = this.player.y + Math.sin(angle) * spawnRadius;

    // --- BOSS SPAWN LOGIC ---
    if (this.elapsed > 60 && r < 0.04 && !this.currentBoss && !isGoldenCarton) {
      enemy = new WashingMachine(this, x, y, 1500, 70, 20);
    } else if (
      this.elapsed > 120 &&
      r < 0.02 &&
      !this.currentBoss &&
      !isGoldenCarton
    ) {
      enemy = new EspressoMachine(this, x, y, 1200, 150, 15);
    }
    // --- GOLDEN CARTON ---
    else if (isGoldenCarton) {
      enemy = new BaseEnemy(this, x, y, 30, 250, 0, "GOLDEN_CARTON");
    }
    // --- NORMAL ENEMY TYPES ---
    else if (r < 0.2) {
      enemy = new Microwave(this, x, y, 60, 150, 0);
    } else if (r < 0.3) {
      // enemy = new Roomba(this, x, y, 25, 110, 2);
      enemy = new BaseEnemy(this, x, y, 30, 250, 0, "GOLDEN_CARTON");
    } else if (r < 0.4) {
      // enemy = new RiceCooker(this, x, y, 180, 60, 10);
      enemy = new BaseEnemy(this, x, y, 30, 250, 0, "GOLDEN_CARTON");
    } else {
      // enemy = new BaseEnemy(this, x, y, 15, 100, 5, "CARTON");
      enemy = new BaseEnemy(this, x, y, 30, 250, 0, "GOLDEN_CARTON");
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
    const orb = this.physics.add.sprite(x, y, "screw");
    orb.setData("xp", 1);
    this.orbs.add(orb);
  }

  fireToast() {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearDist = Infinity;
    this.enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );
      if (d < nearDist) {
        nearDist = d;
        nearest = enemy;
      }
    });

    if (!nearest) return;

    if (this.player.playAttackAnim) {
      this.player.playAttackAnim();
    }

    this.playSoundEffect("shoot", 0.3);

    const bullet = new ToastBullet(
      this,
      this.player.x,
      this.player.y,
      this.toastDmg,
    );
    this.bullets.add(bullet);

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      nearest.x,
      nearest.y,
    );

    const bulletSpeed = 500;
    bullet.setVelocity(
      Math.cos(angle) * bulletSpeed,
      Math.sin(angle) * bulletSpeed,
    );

    this.time.delayedCall(2500, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  onBulletHitEnemy(bullet: Phaser.Physics.Arcade.Sprite | any, enemy: any) {
    const dmg = bullet.getDamage
      ? bullet.getDamage()
      : (bullet.getData("dmg") as number);
    bullet.destroy();

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
      this.playSoundEffect("hit", 0.8);
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

    this.hp -= typeof dmg === "number" ? dmg : 5;
    this.iFrameTimer = 0.5;
    // Display player damage number (negative shows as -damage)
    DamageNumber.create(this, player.x, player.y - 30, -dmg, "player_damage", {
      fontSize: 32,
    });

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

  // When player picks up a buff item
  onPickupItem(_player: any, item: any) {
    const type = item.getData("type");
    item.destroy();
    this.playSoundEffect("pickup", 0.8);

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
          if(e.visual && !e.isBoss) e.visual.setAlpha(0.5); 
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
            e.takeDamage(9999);
          }
        });
      },
    });
    this.cameras.main.flash(300, 34, 197, 94);
  }

  private triggerWD40Pulse() {
    const frostRing = this.add.graphics();
    frostRing.setDepth(199);

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

    // Sound effect when picking up XP
    this.playSoundEffect("pickup", 0.2 + (xpVal > 1 ? 0.2 : 0));

    // Visual effect when picking up XP
    this.createSparkVFX(orb.x, orb.y, 0x38bdf8);

    orb.destroy();

    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.5);
      this.showLevelUp();
    }
  }

  showLevelUp() {
    this.paused = true;
    this.playSoundEffect("level_up", 0.4); // Sound effect when leveling up
    this.physics.pause();

    const available = UPGRADES.filter((u) => u.canApply(this));
    const picks: Upgrade[] = [];
    const pool = [...available];
    while (picks.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }

    this.levelUpContainer.removeAll(true);
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const overlay = this.add.graphics().setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, cam.width, cam.height);
    this.levelUpContainer.add(overlay);

    const title = this.add
      .text(cx, cy - 120, `LEVEL UP! (Lv.${this.level})`, {
        fontSize: "24px",
        color: "#ffdd00",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.levelUpContainer.add(title);

    picks.forEach((upgrade, i) => {
      const by = cy - 40 + i * 70;
      const bg = this.add.graphics().setScrollFactor(0);
      bg.fillStyle(0x444444, 0.9);
      bg.fillRoundedRect(cx - 140, by - 20, 280, 55, 8);
      bg.lineStyle(2, 0xffdd00);
      bg.strokeRoundedRect(cx - 140, by - 20, 280, 55, 8);
      this.levelUpContainer.add(bg);

      const txt = this.add
        .text(cx, by, `${upgrade.label}\n${upgrade.description}`, {
          fontSize: "14px",
          color: "#ffffff",
          fontFamily: "monospace",
          align: "center",
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0);
      this.levelUpContainer.add(txt);

      const zone = this.add
        .zone(cx, by + 10, 280, 55)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerover", () =>
        bg
          .clear()
          .fillStyle(0x666600, 0.9)
          .fillRoundedRect(cx - 140, by - 20, 280, 55, 8)
          .lineStyle(2, 0xffdd00)
          .strokeRoundedRect(cx - 140, by - 20, 280, 55, 8),
      );
      zone.on("pointerout", () =>
        bg
          .clear()
          .fillStyle(0x444444, 0.9)
          .fillRoundedRect(cx - 140, by - 20, 280, 55, 8)
          .lineStyle(2, 0xffdd00)
          .strokeRoundedRect(cx - 140, by - 20, 280, 55, 8),
      );
      zone.on("pointerdown", () => {
        upgrade.apply(this);
        this.hideLevelUp();
      });
      this.levelUpContainer.add(zone);
    });

    this.levelUpContainer.setVisible(true);
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
    const cam = this.cameras.main;
    const bestTime = this.getBestTime();
    const mins = Math.floor(bestTime / 60);
    const secs = Math.floor(bestTime % 60);
    this.gameOverText.setText(
      "GAME OVER\n Your Best Score: " +
        `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` +
        " \nPress R to restart",
    );
    this.gameOverText.setPosition(cam.width / 2, cam.height / 2);
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
    const width = GAME_CONFIG.CANVAS_WIDTH;
    const height = GAME_CONFIG.CANVAS_HEIGHT;

    this.hpBar.clear();
    this.hpBar.fillStyle(0x333333);
    this.hpBar.fillRect(16, 36, 160, 14);
    this.hpBar.fillStyle(0x44cc44);
    this.hpBar.fillRect(16, 36, 160 * (this.hp / this.maxHp), 14);
    this.hpText.setText(`HP: ${this.hp}/${this.maxHp}`);

    this.xpBar.clear();
    this.xpBar.fillStyle(0x333333);
    this.xpBar.fillRect(0, height - 10, width, 10);
    this.xpBar.fillStyle(0x4488ff);
    this.xpBar.fillRect(0, height - 10, width * (this.xp / this.xpToNext), 10);

    const mins = Math.floor(this.elapsed / 60);
    const secs = Math.floor(this.elapsed % 60);
    this.timerText.setText(
      `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    );

    this.levelText.setText(`Lv.${this.level}  Toast:${this.toastLevel}`);

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
