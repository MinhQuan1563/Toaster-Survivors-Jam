import Phaser from "phaser";
import { GAME_CONFIG } from "./Constants";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.add.text(width / 2, height / 2, "LOADING ASSETS...", {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#94a3b8"
    }).setOrigin(0.5);

    this.load.on('complete', () => {
      loadingText.destroy();
    });

    // --- SFX ---
    this.load.audio("shoot", "assets/sounds/shoot.ogg");
    this.load.audio("hit", "assets/sounds/hit.ogg");
    this.load.audio("explode", "assets/sounds/explode.ogg");
    this.load.audio("hurt", "assets/sounds/hurt.ogg");
    this.load.audio("pickup", "assets/sounds/pickup.ogg");
    this.load.audio("level_up", "assets/sounds/level_up.ogg");
    this.load.audio("bgm_battle", "assets/sounds/bgm_battle.ogg");

    // --- SKILL SFX ---
    this.load.audio("skill_lightning", "assets/sounds/skill_lightning.ogg");
    this.load.audio("skill_cutlery", "assets/sounds/skill_cutlery.ogg");
    this.load.audio("skill_shrapnel", "assets/sounds/skill_shrapnel.ogg");

    // --- ITEM & BUFF SFX ---
    this.load.audio("item_emp", "assets/sounds/item_emp.ogg");
    this.load.audio("item_freeze", "assets/sounds/item_freeze.ogg");
    this.load.audio("buff_hyper", "assets/sounds/buff_hyper.ogg");
    this.load.audio("shield_block", "assets/sounds/shield_block.ogg");
  }

  create() {
    this.createTextures();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const title = this.add.text(width / 2, height / 2 - 50, "TOASTER SURVIVORS", {
      fontSize: "64px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#e2e8f0"
    }).setOrigin(0.5);
    
    title.setShadow(0, 0, 'rgba(249, 115, 22, 0.8)', 20);

    const playBtn = this.add.text(width / 2, height / 2 + 50, "PRESS ANY KEY TO START", {
      fontSize: "24px",
      fontFamily: "monospace",
      color: "#f97316"
    }).setOrigin(0.5);

    this.tweens.add({
      targets: playBtn,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.on("pointerdown", () => {
      this.scene.start("GameScene");
    });
    this.input.keyboard!.on("keydown", () => {
      this.scene.start("GameScene");
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

    // Icon blender
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.lineStyle(3, 0x94a3b8);
    g.strokeCircle(20, 20, 10);
    g.fillStyle(0xf1f5f9);
    g.fillCircle(20, 20, 4);
    g.generateTexture("icon_blender", 40, 40);

    // Blender blade (40x40)
    g.clear();
    g.fillStyle(0x94a3b8);
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(25, 20);
    g.lineTo(20, 40);
    g.lineTo(15, 20);
    g.fillPath();
    g.generateTexture("sprite_blender", 40, 40);

    // Floor tile (64x64) - UI Kitchen pattern
    g.clear();
    g.fillStyle(0xf8fafc);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0xe2e8f0, 0.8);
    g.strokeRect(0, 0, 64, 64);
    g.fillStyle(0xcbd5e1, 0.1);
    g.fillRect(32, 0, 32, 32);
    g.fillRect(0, 32, 32, 32);
    if (Math.random() > 0.5) {
      g.fillCircle(15, 15, 1);
      g.fillCircle(45, 50, 1.2);
    }
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

    // Icon Aura
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.lineStyle(3, 0xef4444);
    g.strokeCircle(20, 20, 12);
    g.lineStyle(2, 0xf97316);
    g.strokeCircle(20, 20, 6);
    g.generateTexture("icon_aura", 40, 40);

    // Icon Shrapnel
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0xf59e0b);
    g.fillRect(12, 12, 8, 8);
    g.fillRect(24, 14, 6, 6);
    g.fillRect(16, 24, 6, 6);
    g.lineStyle(2, 0xffffff);
    g.beginPath();
    g.moveTo(16, 16);
    g.lineTo(26, 10);
    g.moveTo(16, 16);
    g.lineTo(10, 26);
    g.moveTo(16, 16);
    g.lineTo(28, 26);
    g.strokePath();
    g.generateTexture("icon_shrapnel", 40, 40);

    // Icon Max HP
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0xef4444);
    g.fillCircle(14, 16, 6);
    g.fillCircle(26, 16, 6);
    g.beginPath();
    g.moveTo(8, 17);
    g.lineTo(32, 17);
    g.lineTo(20, 32);
    g.fillPath();
    g.generateTexture("icon_hp", 40, 40);

    // Icon Speed
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.lineStyle(4, 0x0ea5e9);
    g.beginPath();
    g.moveTo(12, 12);
    g.lineTo(20, 20);
    g.lineTo(12, 28);
    g.moveTo(22, 12);
    g.lineTo(30, 20);
    g.lineTo(22, 28);
    g.strokePath();
    g.lineStyle(2, 0x0ea5e9, 0.6);
    g.beginPath();
    g.moveTo(4, 20);
    g.lineTo(8, 20);
    g.moveTo(6, 14);
    g.lineTo(12, 14);
    g.moveTo(6, 26);
    g.lineTo(12, 26);
    g.strokePath();
    g.generateTexture("icon_speed", 40, 40);

    // Icon Toast Level
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.lineStyle(2, 0x38bdf8, 0.8);
    g.strokeCircle(20, 20, 14);
    g.fillStyle(0xf97316);
    g.fillCircle(20, 20, 8);
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath();
    g.moveTo(12, 28);
    g.lineTo(20, 20);
    g.lineTo(28, 12);
    g.strokePath();
    g.fillStyle(0xfef08a);
    g.fillCircle(20, 20, 4);
    g.generateTexture("icon_toast", 40, 40);

    // Icon Pickup
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.lineStyle(6, 0xef4444);
    g.beginPath();
    g.arc(20, 20, 10, Math.PI, 0);
    g.strokePath();
    g.lineStyle(6, 0xe2e8f0);
    g.beginPath();
    g.moveTo(10, 20);
    g.lineTo(10, 28);
    g.moveTo(30, 20);
    g.lineTo(30, 28);
    g.strokePath();
    g.generateTexture("icon_pickup", 40, 40);

    // Crumb Texture
    g.clear();
    g.fillStyle(0x78350f);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(6, 2);
    g.lineTo(8, 8);
    g.lineTo(2, 6);
    g.fillPath();
    g.fillStyle(0xd97706);
    g.fillCircle(4, 4, 2);
    g.generateTexture("crumb", 10, 10);

    // Icon Lightning
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0xfacc15);
    g.beginPath();
    g.moveTo(24, 6);
    g.lineTo(12, 22);
    g.lineTo(22, 22);
    g.lineTo(16, 36);
    g.lineTo(30, 18);
    g.lineTo(20, 18);
    g.fillPath();
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(16, 35, 2);
    g.generateTexture("icon_lightning", 40, 40);

    // Icon Butter Puddle
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0xfde047);
    g.fillEllipse(20, 24, 28, 14);
    g.fillCircle(14, 20, 6);
    g.fillCircle(26, 26, 5);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(16, 22, 8, 4);
    g.generateTexture("icon_butter", 40, 40);

    // Icon Flying Cutlery
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x78350f);
    g.fillRoundedRect(8, 24, 6, 12, 2);
    g.fillStyle(0xcbd5e1);
    g.beginPath();
    g.moveTo(9, 24);
    g.lineTo(13, 24);
    g.lineTo(26, 4);
    g.lineTo(8, 8);
    g.fillPath();
    g.fillStyle(0xffffff);
    g.beginPath();
    g.moveTo(9, 24);
    g.lineTo(8, 8);
    g.lineTo(12, 12);
    g.fillPath();
    g.generateTexture("icon_cutlery", 40, 40);

    // Icon Armor
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x64748b);
    g.beginPath();
    g.moveTo(10, 10);
    g.lineTo(30, 10);
    g.lineTo(30, 22);
    g.lineTo(20, 32);
    g.lineTo(10, 22);
    g.fillPath();
    g.fillStyle(0x94a3b8);
    g.beginPath();
    g.moveTo(12, 12);
    g.lineTo(20, 12);
    g.lineTo(20, 29);
    g.lineTo(12, 21);
    g.fillPath();
    g.generateTexture("icon_armor", 40, 40);

    // Icon Bracer
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x38bdf8);
    g.beginPath();
    g.moveTo(12, 20);
    g.lineTo(20, 12);
    g.lineTo(20, 16);
    g.lineTo(28, 16);
    g.lineTo(28, 24);
    g.lineTo(20, 24);
    g.lineTo(20, 28);
    g.fillPath();
    g.generateTexture("icon_bracer", 40, 40);

    // Icon Duplicator
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x78350f);
    g.fillRoundedRect(8, 8, 16, 16, 4);
    g.fillStyle(0xd946ef);
    g.fillRoundedRect(16, 16, 16, 16, 4);
    g.generateTexture("icon_duplicator", 40, 40);

    // Icon Luck
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x22c55e);
    g.fillCircle(16, 16, 5);
    g.fillCircle(24, 16, 5);
    g.fillCircle(16, 24, 5);
    g.fillCircle(24, 24, 5);
    g.lineStyle(2, 0x22c55e);
    g.beginPath();
    g.moveTo(20, 24);
    g.lineTo(20, 32);
    g.strokePath();
    g.generateTexture("icon_luck", 40, 40);

    // Icon Regen
    g.clear();
    g.fillStyle(0x1e293b);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(0x22c55e);
    g.fillRect(16, 10, 8, 20);
    g.fillRect(10, 16, 20, 8);
    g.generateTexture("icon_regen", 40, 40);

    // Sprite Cutlery
    g.clear();
    g.fillStyle(0x78350f);
    g.fillRoundedRect(17, 24, 6, 14, 2);
    g.fillStyle(0xcbd5e1);
    g.beginPath();
    g.moveTo(17, 25);
    g.lineTo(23, 25);
    g.lineTo(20, 2);
    g.fillPath();
    g.fillStyle(0xffffff);
    g.beginPath();
    g.moveTo(17, 25);
    g.lineTo(20, 2);
    g.lineTo(20, 25);
    g.fillPath();
    g.generateTexture("sprite_cutlery", 40, 40);

    // Sprite Butter
    g.clear();
    g.fillStyle(0xfde047);
    g.fillCircle(20, 20, 14);
    g.fillCircle(10, 25, 8);
    g.fillCircle(30, 22, 10);
    g.fillCircle(20, 32, 7);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(15, 18, 10, 5);
    g.generateTexture("sprite_butter", 40, 40);

    // Carton
    g.clear();
    g.fillStyle(0xb45309);
    g.fillRoundedRect(0, 0, 36, 36, 4);
    g.lineStyle(3, 0x78350f);
    g.strokeRoundedRect(0, 0, 36, 36, 4);
    g.fillStyle(0x78350f);
    g.beginPath().moveTo(0, 0).lineTo(-8, -10).lineTo(18, 0).fillPath().strokePath();
    g.beginPath().moveTo(36, 0).lineTo(44, -10).lineTo(18, 0).fillPath().strokePath();
    g.fillStyle(0xfde047);
    g.fillRect(13, 0, 10, 36);
    g.lineStyle(3, 0x000000);
    g.beginPath().moveTo(8, 8).lineTo(14, 14).strokePath();
    g.beginPath().moveTo(28, 8).lineTo(22, 14).strokePath();
    g.fillRect(10, 14, 4, 4);
    g.fillRect(22, 14, 4, 4);
    g.generateTexture("tex_carton", 50, 50);

    // Golden Carton
    g.clear();
    g.fillStyle(0xfacc15);
    g.fillRoundedRect(0, 0, 36, 36, 4);
    g.lineStyle(3, 0xca8a04);
    g.strokeRoundedRect(0, 0, 36, 36, 4);
    g.fillStyle(0xca8a04);
    g.beginPath().moveTo(0, 0).lineTo(-8, -10).lineTo(18, 0).fillPath().strokePath();
    g.beginPath().moveTo(36, 0).lineTo(44, -10).lineTo(18, 0).fillPath().strokePath();
    g.fillStyle(0xffffff);
    g.fillRect(13, 0, 10, 36);
    g.lineStyle(3, 0x000000);
    g.beginPath().moveTo(8, 14).lineTo(14, 8).strokePath();
    g.beginPath().moveTo(28, 14).lineTo(22, 8).strokePath();
    g.generateTexture("tex_golden_carton", 50, 50);

    g.destroy();
  }
}