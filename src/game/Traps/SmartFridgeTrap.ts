import Phaser from "phaser";
import GameScene from "../GameScene";

/**
 * Quiz Question Data Structure
 */
export interface QuizQuestion {
  question: string;
  answerA: string;
  answerB: string;
  correctAnswer: "A" | "B";
}

/**
 * Smart Fridge Trap - Interactive quiz entity
 * Displays pixel art fridge with animated screen
 * Player can interact with E key to answer trivia
 */
export class SmartFridgeTrap extends Phaser.GameObjects.Container {
  private sceneRef: GameScene;
  private interactionRadius = 150;
  private canInteract = true;
  private cooldownMs = 30000; // 30 seconds between uses
  private cooldownTimer = 0;

  // Quiz state
  private isQuizActive = false;
  private currentQuestion: QuizQuestion | null = null;
  private questionIndex = 0;
  private selectedAnswer: "A" | "B" | null = null;

  // Questions database
  private static readonly QUESTIONS: QuizQuestion[] = [
    {
      question: "What is the largest ocean in the world?",
      answerA: "Atlantic",
      answerB: "Pacific",
      correctAnswer: "B",
    },
    {
      question: "How many continents are there?",
      answerA: "5",
      answerB: "7",
      correctAnswer: "B",
    },
  ];

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);
    this.sceneRef = scene;

    // Create pixel art graphics
    const graphics = scene.add.graphics();
    this.drawSmartFridge(graphics);
    this.add(graphics);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup physics body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setSize(70, 90);
    body.setOffset(-35, -45);

    this.setDepth(5);

    // Update cooldown timer
    scene.events.on("update", (_time: number, delta: number) => {
      if (this.cooldownTimer > 0) {
        this.cooldownTimer -= delta;
      }
      if (this.isQuizActive) {
        this.updateQuiz(delta);
      }
    });
  }

  /**
   * Draw pixel art smart fridge
   */
  private drawSmartFridge(graphics: Phaser.GameObjects.Graphics) {
    const rect = (
      x: number,
      y: number,
      w: number,
      h: number,
      c: string
    ) => {
      graphics.fillStyle(Phaser.Display.Color.HexStringToColor(c).color);
      graphics.fillRect(x - 35, y - 45, w, h);
    };

    // Palette
    const OUTLINE = "#181d24";
    const BASE = "#7a8c9e";
    const HIGHLIGHT = "#a4b5c4";
    const SHADOW = "#4c5c6d";
    const SCREEN = "#0d1b16";
    const LED = "#fbbf24";

    // Outer frame
    rect(-35, -45, 70, 90, OUTLINE);

    // Main body
    rect(-30, -40, 60, 38, HIGHLIGHT); // Top half
    rect(-30, -2, 60, 35, BASE); // Middle
    rect(-30, 33, 60, 2, SHADOW); // Divider

    // Screen area
    rect(-20, -15, 40, 20, SCREEN);

    // LED light
    graphics.fillStyle(
      Phaser.Display.Color.HexStringToColor(LED).color
    );
    graphics.fillRect(-5, -22, 8, 8);

    // Handle (filled only, no outline rectangle)
    rect(20, 0, 6, 25, SHADOW);

    // Bottom feet
    rect(-15, 38, 8, 3, SHADOW);
    rect(7, 38, 8, 3, SHADOW);
  }

  /**
   * Check if player is in interaction range
   */
  public getInteractionRadius(): number {
    return this.interactionRadius;
  }

  /**
   * Attempt to start quiz
   */
  public attemptInteraction(): boolean {
    if (!this.canInteract || this.cooldownTimer > 0) {
      return false;
    }

    if (!this.isQuizActive) {
      this.startQuiz();
      return true;
    }
    return false;
  }

  /**
   * Start a new quiz
   */
  private startQuiz() {
    this.isQuizActive = true;
    this.selectedAnswer = null;

    // Pick a random question
    this.questionIndex = Phaser.Math.Between(
      0,
      SmartFridgeTrap.QUESTIONS.length - 1
    );
    this.currentQuestion = SmartFridgeTrap.QUESTIONS[this.questionIndex];

    // Pause game during quiz
    this.sceneRef.paused = true;

    // Immediately draw the UI since update loop won't run when paused
    this.sceneRef.showQuizUI(this);
  }

  /**
   * Update quiz state
   */
  private updateQuiz(delta: number) {
    if (!this.isQuizActive) return;

    // Check for user input - A and B keys
    if (this.sceneRef.input.keyboard) {
      const keys = this.sceneRef.input.keyboard.addKeys({
        A: Phaser.Input.Keyboard.KeyCodes.A,
        B: Phaser.Input.Keyboard.KeyCodes.B,
      }) as Record<string, Phaser.Input.Keyboard.Key>;

      if (keys.A.isDown && this.selectedAnswer === null) {
        this.selectedAnswer = "A";
      } else if (keys.B.isDown && this.selectedAnswer === null) {
        this.selectedAnswer = "B";
      }
    }

    // Finish quiz when answer selected
    if (this.selectedAnswer !== null) {
      this.finishQuiz();
    }
  }

  /**
   * Finish quiz and apply results
   */
  private finishQuiz() {
    if (!this.currentQuestion) return;

    const isCorrect =
      this.selectedAnswer === this.currentQuestion.correctAnswer;

    console.log(isCorrect ? "Correct answer!" : "Wrong answer!");

    // Resume game
    this.sceneRef.paused = false;

    if (isCorrect) {
      this.onCorrectAnswer();
    } else {
      this.onWrongAnswer();
    }

    // Set cooldown and clean up
    this.cooldownTimer = this.cooldownMs;
    this.isQuizActive = false;
    this.currentQuestion = null;

    // Destroy trap after answering
    this.destroy();
  }

  /**
   * Handle correct answer - spawn reward
   */
  private onCorrectAnswer() {
    const isHpReward = Math.random() > 0.5;

    if (isHpReward) {
      // Spawn HP pickup
      this.sceneRef.spawnBuffItem(this.x, this.y - 50);
    } else {
      // Spawn XP orb
      this.sceneRef.spawnXpOrb(this.x, this.y - 50);
      this.sceneRef.spawnXpOrb(this.x + 20, this.y - 50);
      this.sceneRef.spawnXpOrb(this.x - 20, this.y - 50);
    }

    // Visual feedback
    this.sceneRef.createExplosionVFX(this.x, this.y, 0.8);
    this.sceneRef.playSoundEffect("pickup", 0.7);
  }

  /**
   * Handle wrong answer - apply freeze status
   */
  private onWrongAnswer() {
    this.sceneRef.freezePlayerFor(2000);

    // Visual feedback
    this.sceneRef.createSparkVFX(this.sceneRef.player.x, this.sceneRef.player.y, 0x87ceeb);
    this.sceneRef.playSoundEffect("hit", 0.5);
  }

  /**
   * Get current quiz state
   */
  public getQuizState() {
    return {
      isActive: this.isQuizActive,
      question: this.currentQuestion,
      selectedAnswer: this.selectedAnswer,
    };
  }

  public isInRange(playerX: number, playerY: number): boolean {
    const dist = Phaser.Math.Distance.Between(
      playerX,
      playerY,
      this.x,
      this.y
    );
    return dist < this.interactionRadius;
  }


  public canBeUsed(): boolean {
    return this.canInteract && this.cooldownTimer <= 0;
  }

  public activateTrap(): void {
  }
}
