import Phaser from "phaser";
import GameScene from "./GameScene";
import { BaseEnemy } from "./BaseEnemy";
import { DamageNumber } from "./DamageNumber";

export interface SkillLevelData {
  desc: string;
  shortDesc: string;
}

export class SkillManager {
  private scene: GameScene;

  public levels = {
    aura: 0,
    shrapnel: 0,
    lightning: 0,
    butter: 0,
    cutlery: 0,
  };

  public static readonly SKILL_DATA = {
    aura: {
      name: "Heat Aura",
      icon: "icon_aura",
      color: 0xef4444,
      tiers: [
        {
          desc: "Unlock Heat Aura\n(Deals 10 dmg/s)",
          shortDesc: "Lv.1: 10 dmg/s, Small radius",
        },
        {
          desc: "Increase radius and\ndamage (15 dmg/s)",
          shortDesc: "Lv.2: 15 dmg/s, Medium radius",
        },
        {
          desc: "Maximize radius\n(20 dmg/s)",
          shortDesc: "Lv.3: 20 dmg/s, Large radius",
        },
        {
          desc: "MUTATION: Meltdown!\nAdds Burn effect for 2s",
          shortDesc: "MAX: +Burn on targets",
        },
      ],
    },
    shrapnel: {
      name: "Bread Crumbs",
      icon: "icon_shrapnel",
      color: 0xf59e0b,
      tiers: [
        {
          desc: "On hit, bullets split into\n2 shards (30% Dmg)",
          shortDesc: "Lv.1: Split into 2 shards",
        },
        { desc: "Split into 4 shards", shortDesc: "Lv.2: Split into 4 shards" },
        { desc: "Split into 6 shards", shortDesc: "Lv.3: Split into 6 shards" },
        {
          desc: "MUTATION: Hardened Crumbs!\nShards can pierce",
          shortDesc: "MAX: Piercing shards",
        },
      ],
    },
    lightning: {
      name: "Short Circuit",
      icon: "icon_lightning",
      color: 0xfde047,
      tiers: [
        {
          desc: "Strikes 2 random enemies\nevery 3s",
          shortDesc: "Lv.1: 2 Strikes/3s",
        },
        {
          desc: "Strikes 3 enemies\n+More Damage",
          shortDesc: "Lv.2: 3 Strikes, +Dmg",
        },
        {
          desc: "Strikes 4 enemies\n+Faster (Every 2s)",
          shortDesc: "Lv.3: 4 Strikes/2s",
        },
        {
          desc: "MUTATION: EMP Storm!\n5 Strikes + AoE + Stun",
          shortDesc: "MAX: 5 Strikes + AoE Stun",
        },
      ],
    },
    butter: {
      name: "Butter Puddle",
      icon: "icon_butter",
      color: 0xfef08a,
      tiers: [
        {
          desc: "Drops 1 puddle every 5s\nSlows enemies",
          shortDesc: "Lv.1: 1 Puddle, Slows enemies",
        },
        { desc: "Drops 2 puddles at once", shortDesc: "Lv.2: 2 Puddles" },
        {
          desc: "Puddles last 5s and\nare wider",
          shortDesc: "Lv.3: Wider, lasts longer",
        },
        {
          desc: "MUTATION: Black Hole!\nPuddles move to player & deal DMG",
          shortDesc: "MAX: Moves & deals heavy damage",
        },
      ],
    },
    cutlery: {
      name: "Flying Cutlery",
      icon: "icon_cutlery",
      color: 0x94a3b8,
      tiers: [
        {
          desc: "Fires 2 knives in the\ndirection you move",
          shortDesc: "Lv.1: Fires 2 knives forward",
        },
        {
          desc: "Fires 4 knives\n(Fan shape)",
          shortDesc: "Lv.2: Fires 4 knives",
        },
        {
          desc: "Fires faster and\ndeals more damage",
          shortDesc: "Lv.3: Faster reload & speed",
        },
        {
          desc: "MUTATION: Master Chef!\nKnives pierce infinitely",
          shortDesc: "MAX: Infinite piercing",
        },
      ],
    },
  };

  // Internal variables
  private auraGraphics: Phaser.GameObjects.Graphics;
  private auraTickTimer: number = 0;
  private lightningTimer: number = 0;
  private butterTimer: number = 0;
  private cutleryTimer: number = 0;

  public crumbsGroup: Phaser.Physics.Arcade.Group;
  public butterGroup: Phaser.Physics.Arcade.Group;
  public cutleryGroup: Phaser.Physics.Arcade.Group;

  private burnedEnemies: Map<BaseEnemy, number> = new Map();
  public stunnedEnemies: Map<BaseEnemy, number> = new Map();

  constructor(scene: GameScene) {
    this.scene = scene;

    this.auraGraphics = scene.add.graphics();
    this.auraGraphics.setDepth(9);

    // [FIXED] Shrapnel Group with custom crumb texture
    this.crumbsGroup = scene.physics.add.group({ runChildUpdate: true });
    this.butterGroup = scene.physics.add.group({ runChildUpdate: true });
    this.cutleryGroup = scene.physics.add.group({ runChildUpdate: true });

    // Shrapnel Collision (Fixed to ensure damage triggers)
    scene.physics.add.overlap(
      this.crumbsGroup,
      scene.enemies,
      (c: any, e: any) => {
        const crumb = c as Phaser.Physics.Arcade.Sprite;
        const enemy = e as BaseEnemy;
        if (!crumb.active || !enemy.active) return;

        const hitList = crumb.getData("hitList") as Set<BaseEnemy>;
        if (hitList.has(enemy)) return;

        const dmg = crumb.getData("dmg") as number;
        if (typeof enemy.takeDamage === "function") {
          enemy.takeDamage(dmg);
          hitList.add(enemy);
          if (typeof DamageNumber !== "undefined")
            DamageNumber.create(this.scene, enemy.x, enemy.y, dmg, "damage", {
              fontSize: 16,
            });
        }

        let pierce = crumb.getData("pierce") as number;
        if (pierce > 0) {
          crumb.setData("pierce", pierce - 1);
        } else {
          crumb.destroy();
        }
      },
    );

    // Cutlery Collision
    scene.physics.add.overlap(
      this.cutleryGroup,
      scene.enemies,
      (c: any, e: any) => {
        const knife = c as Phaser.Physics.Arcade.Sprite;
        const enemy = e as BaseEnemy;
        if (!knife.active || !enemy.active) return;

        const hitList = knife.getData("hitList") as Set<BaseEnemy>;
        if (hitList.has(enemy)) return;

        const dmg = knife.getData("dmg") as number;
        if (typeof enemy.takeDamage === "function") {
          enemy.takeDamage(dmg);
          hitList.add(enemy);
          if (typeof DamageNumber !== "undefined")
            DamageNumber.create(this.scene, enemy.x, enemy.y, dmg, "damage", {
              color: "#94a3b8",
              fontSize: 20,
            });
        }

        let pierce = knife.getData("pierce") as number;
        if (pierce > 0) {
          knife.setData("pierce", pierce - 1);
        } else {
          knife.destroy();
        }
      },
    );

    // Butter Collision (Overlap for slowing down)
    scene.physics.add.overlap(
      this.butterGroup,
      scene.enemies,
      (b: any, e: any) => {
        const butter = b as Phaser.Physics.Arcade.Sprite;
        const enemy = e as BaseEnemy;
        if (!butter.active || !enemy.active) return;

        // Slow down the enemy
        enemy.speedModifier = 0.4; // 60% slow

        // Max level deals damage over time
        if (this.levels.butter === 4) {
          let lastTick = enemy.getData("butterTick") || 0;
          if (this.scene.time.now - lastTick > 500) {
            // dmg every 0.5s
            enemy.setData("butterTick", this.scene.time.now);
            enemy.takeDamage(10);
            if (typeof DamageNumber !== "undefined")
              DamageNumber.create(this.scene, enemy.x, enemy.y, 10, "damage", {
                color: "#facc15",
                fontSize: 16,
              });
          }
        }
      },
    );
  }

  public update(delta: number) {
    const dt = delta / 1000;
    this.updateAura(delta);
    this.updateLightning(delta);
    this.updateButter(delta);
    this.updateCutlery(delta);
    this.updateDebuffs(delta);

    // Cleanup projectiles
    [this.crumbsGroup, this.cutleryGroup].forEach((group) => {
      group.getChildren().forEach((c: any) => {
        if (c.active) {
          const life = c.getData("life") - dt;
          c.setData("life", life);
          if (life <= 0) c.destroy();
        }
      });
    });

    // Cleanup and move Butter
    this.butterGroup.getChildren().forEach((b: any) => {
      if (b.active) {
        const life = b.getData("life") - dt;
        b.setData("life", life);
        if (life <= 0) {
          this.scene.tweens.add({
            targets: b,
            alpha: 0,
            duration: 300,
            onComplete: () => b.destroy(),
          });
        } else if (this.levels.butter === 4) {
          // Max Level: Move butter towards player (La Borra style)
          this.scene.physics.moveToObject(b, this.scene.player, 40);
        }
      }
    });
  }

  // ==========================================
  // 1. HEAT AURA
  // ==========================================
  private updateAura(delta: number) {
    // ... (Giữ nguyên như cũ) ...
    if (this.levels.aura === 0) return;
    const player = this.scene.player;
    let radius = 60;
    let dmg = 10;
    let color = 0xef4444;
    if (this.levels.aura >= 2) {
      radius = 90;
      dmg = 15;
      color = 0xf97316;
    }
    if (this.levels.aura >= 3) {
      radius = 120;
      dmg = 20;
    }
    if (this.levels.aura >= 4) {
      color = 0xffffff;
    }

    this.auraGraphics.clear();
    this.auraGraphics.setPosition(player.x, player.y);
    const pulse = 1 + Math.sin(this.scene.time.now * 0.005) * 0.05;
    this.auraGraphics.fillStyle(color, 0.15);
    this.auraGraphics.fillCircle(0, 0, radius * pulse);
    this.auraGraphics.lineStyle(2, color, 0.4);
    this.auraGraphics.strokeCircle(0, 0, radius * pulse);

    this.auraTickTimer -= delta;
    if (this.auraTickTimer <= 0) {
      this.auraTickTimer = 500;
      this.scene.enemies.getChildren().forEach((e: any) => {
        const enemy = e as BaseEnemy;
        if (!enemy.active) return;
        const dist = Phaser.Math.Distance.Between(
          player.x,
          player.y,
          enemy.x,
          enemy.y,
        );
        if (dist <= radius) {
          if (typeof enemy.takeDamage === "function") enemy.takeDamage(dmg);
          if (typeof DamageNumber !== "undefined")
            DamageNumber.create(this.scene, enemy.x, enemy.y, dmg, "damage", {
              color: "#f97316",
              fontSize: 20,
            });
          if (this.levels.aura === 4) {
            this.burnedEnemies.set(enemy, 2000);
            if (enemy.visual && !enemy.isBoss) enemy.visual.setAlpha(0.7);
          }
        }
      });
    }
  }

  // ==========================================
  // 2. SHRAPNEL (Cải thiện Hình ảnh)
  // ==========================================
  public triggerShrapnel(x: number, y: number, baseDmg: number) {
    if (this.levels.shrapnel === 0) return;

    let crumbCount = 2;
    if (this.levels.shrapnel === 2) crumbCount = 4;
    if (this.levels.shrapnel >= 3) crumbCount = 6;

    // Bonus from Duplicator passive
    crumbCount += this.scene.projectileCount;

    const isPiercing = this.levels.shrapnel === 4;
    const crumbDmg = Math.max(1, Math.floor(baseDmg * 0.3));

    for (let i = 0; i < crumbCount; i++) {
      const angle = ((Math.PI * 2) / crumbCount) * i + Math.random() * 0.5;
      const speed = Phaser.Math.Between(300, 400) * this.scene.projectileSpeed;

      // [FIX] Use new 'crumb' texture
      const crumb = this.crumbsGroup.create(
        x,
        y,
        "crumb",
      ) as Phaser.Physics.Arcade.Sprite;
      crumb.setScale(Phaser.Math.FloatBetween(1.2, 1.8)); // Random sizes for realism
      crumb.rotation = Math.random() * Math.PI;

      crumb.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      // Spin animation
      this.scene.tweens.add({
        targets: crumb,
        angle: 360,
        duration: 1000,
        repeat: -1,
      });

      crumb.setData("dmg", crumbDmg);
      crumb.setData("pierce", isPiercing ? 1 : 0);
      crumb.setData("life", 1.5);
      crumb.setData("hitList", new Set());
    }
  }

  // ==========================================
  // 3. SHORT CIRCUIT (Lightning)
  // ==========================================
  private updateLightning(delta: number) {
    if (this.levels.lightning === 0) return;

    this.lightningTimer -= delta;
    if (this.lightningTimer <= 0) {
      let cd = 3000;
      if (this.levels.lightning >= 3) cd = 2000;
      this.lightningTimer = cd;

      let strikeCount = 2;
      if (this.levels.lightning === 2) strikeCount = 3;
      if (this.levels.lightning === 3) strikeCount = 4;
      if (this.levels.lightning === 4) strikeCount = 5;

      // Duplicator bonus
      strikeCount += this.scene.projectileCount;

      const lightningDmg = 40 + this.levels.lightning * 10;
      const isMax = this.levels.lightning === 4;

      // Pick random enemies
      const allEnemies = [...this.scene.enemies.getChildren()].filter(
        (e) => e.active,
      ) as BaseEnemy[];
      if (allEnemies.length === 0) return;

      // Shuffle and pick
      Phaser.Utils.Array.Shuffle(allEnemies);
      const targets = allEnemies.slice(0, strikeCount);

      this.scene.playSoundEffect("hit", 0.6); // Lightning sound

      targets.forEach((target) => {
        // Draw ZigZag Lightning
        const topY = this.scene.cameras.main.scrollY - 50;
        const gfx = this.scene.add.graphics();
        gfx.lineStyle(4, 0xfde047); // Yellow lightning

        gfx.beginPath();
        gfx.moveTo(target.x, topY);
        // Draw a few zigzags down to the enemy
        gfx.lineTo(
          target.x + Phaser.Math.Between(-30, 30),
          (topY + target.y) / 2,
        );
        gfx.lineTo(target.x, target.y);
        gfx.strokePath();

        // Flash & Fade
        this.scene.tweens.add({
          targets: gfx,
          alpha: 0,
          duration: 250,
          onComplete: () => gfx.destroy(),
        });

        // Apply Damage
        if (typeof target.takeDamage === "function") {
          target.takeDamage(lightningDmg);
          if (typeof DamageNumber !== "undefined")
            DamageNumber.create(
              this.scene,
              target.x,
              target.y,
              lightningDmg,
              "damage",
              { color: "#fde047", fontSize: 26 },
            );
        }

        // Max Level: AoE Explosion and Stun
        if (isMax) {
          this.scene.createExplosionVFX(target.x, target.y, 0.8);

          this.scene.enemies.getChildren().forEach((e: any) => {
            const neighbor = e as BaseEnemy;
            if (
              neighbor.active &&
              Phaser.Math.Distance.Between(
                target.x,
                target.y,
                neighbor.x,
                neighbor.y,
              ) < 80
            ) {
              if (typeof neighbor.takeDamage === "function")
                neighbor.takeDamage(lightningDmg / 2);
              if (!neighbor.isBoss) {
                this.stunnedEnemies.set(neighbor, 500); // 0.5s stun
                if (neighbor.visual) neighbor.visual.setAlpha(0.6);
              }
            }
          });
        }
      });
    }
  }

  // ==========================================
  // 4. BUTTER PUDDLE (Slow Zone)
  // ==========================================
  private updateButter(delta: number) {
    if (this.levels.butter === 0) return;

    this.butterTimer -= delta;
    if (this.butterTimer <= 0) {
      this.butterTimer = 5000; // Drops every 5s

      let puddleCount = 1;
      if (this.levels.butter >= 2) puddleCount = 2;
      puddleCount += this.scene.projectileCount; // Duplicator bonus

      let duration = 3;
      if (this.levels.butter >= 3) duration = 5;

      const isMax = this.levels.butter === 4;

      for (let i = 0; i < puddleCount; i++) {
        // Drop randomly around player
        const offsetX = Phaser.Math.Between(-20, 20); // Tight grouping
        const offsetY = Phaser.Math.Between(0, 20); // Slightly behind/under
        const px = this.scene.player.x + offsetX;
        const py = this.scene.player.y + offsetY;

        // Create puddle sprite (using graphics generated texture)
        const butter = this.butterGroup.create(
          px,
          py,
          "sprite_butter",
        ) as Phaser.Physics.Arcade.Sprite;
        butter.setDepth(5); // Under enemies
        butter.setAlpha(0.8);

        // Scale up based on level
        const scale = this.levels.butter >= 3 ? 1.5 : 1;
        butter.setScale(scale);

        // Set circular physics body for overlap
        butter.setCircle(15);

        butter.setData("life", duration);

        // Pop-in animation
        butter.setScale(0);
        this.scene.tweens.add({
          targets: butter,
          scale: scale,
          duration: 300,
          ease: "Back.out",
        });

        if (isMax) {
          butter.setTint(0xffaa00); // Darker butter for max level (Black Hole)
        }
      }
    }
  }

  // ==========================================
  // 5. FLYING CUTLERY (Knife)
  // ==========================================
  private updateCutlery(delta: number) {
    if (this.levels.cutlery === 0) return;

    this.cutleryTimer -= delta;
    if (this.cutleryTimer <= 0) {
      let cd = 2000;
      if (this.levels.cutlery >= 3) cd = 1200;
      this.cutleryTimer = cd;

      let knifeCount = 2;
      if (this.levels.cutlery >= 2) knifeCount = 4;
      knifeCount += this.scene.projectileCount;

      const isMax = this.levels.cutlery === 4;
      const dmg = 25 + this.levels.cutlery * 5;

      // Find moving direction. If idle, default to right.
      const body = this.scene.player.body as Phaser.Physics.Arcade.Body;
      let dirX = body.velocity.x;
      let dirY = body.velocity.y;

      if (dirX === 0 && dirY === 0) {
        // If standing still, shoot towards the last facing direction
        dirX = this.scene.player.scaleX < 0 ? -1 : 1;
        dirY = 0;
      }

      const baseAngle = Math.atan2(dirY, dirX);
      const speed = 600 * this.scene.projectileSpeed;
      const spread = 0.4; // Angle spread for fan shape

      this.scene.playSoundEffect("shoot", 0.5);

      for (let i = 0; i < knifeCount; i++) {
        // Calculate fan angle
        const offsetAngle = (i - (knifeCount - 1) / 2) * (spread / knifeCount);
        const finalAngle = baseAngle + offsetAngle;

        const knife = this.cutleryGroup.create(
          this.scene.player.x,
          this.scene.player.y,
          "sprite_cutlery",
        ) as Phaser.Physics.Arcade.Sprite;
        knife.setScale(1.2);
        knife.rotation = finalAngle + Math.PI / 2; // Orient texture

        knife.setVelocity(
          Math.cos(finalAngle) * speed,
          Math.sin(finalAngle) * speed,
        );

        knife.setData("dmg", dmg);
        // Max level: 99 pierces (infinite)
        knife.setData("pierce", isMax ? 99 : 0);
        knife.setData("life", 2.0);
        knife.setData("hitList", new Set());
      }
    }
  }

  // ==========================================
  // HANDLE STATUS EFFECTS
  // ==========================================
  private updateDebuffs(delta: number) {
    // --- 1. BURN ---
    for (let [enemy, time] of this.burnedEnemies.entries()) {
      if (!enemy.active) {
        this.burnedEnemies.delete(enemy);
        continue;
      }
      const newTime = time - delta;
      if (newTime <= 0) {
        this.burnedEnemies.delete(enemy);
        if (
          enemy.visual &&
          !enemy.isBoss &&
          !this.stunnedEnemies.has(enemy) &&
          !this.scene.isFrozen
        )
          enemy.visual.setAlpha(1);
      } else {
        this.burnedEnemies.set(enemy, newTime);
        if (Math.random() < 0.1) {
          enemy.takeDamage(1);
          this.scene.createSparkVFX(enemy.x, enemy.y, 0xf97316);
        }
      }
    }

    // --- 2. STUN ---
    for (let [enemy, time] of this.stunnedEnemies.entries()) {
      if (!enemy.active) {
        this.stunnedEnemies.delete(enemy);
        continue;
      }
      enemy.setVelocity(0, 0); // Force stop
      const newTime = time - delta;
      if (newTime <= 0) {
        this.stunnedEnemies.delete(enemy);
        if (
          enemy.visual &&
          !enemy.isBoss &&
          !this.burnedEnemies.has(enemy) &&
          !this.scene.isFrozen
        )
          enemy.visual.setAlpha(1);
      } else {
        this.stunnedEnemies.set(enemy, newTime);
      }
    }
  }
}
