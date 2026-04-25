import { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameScene from "@/game/GameScene";
import { GAME_CONFIG } from "@/game/Constants";
import { MainMenuScene } from "@/game/MainMenuScene";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      parent: containerRef.current,
      backgroundColor: "#0f172a", // Chuyển màu nền React cũ vào thẳng Phaser
      physics: {
        default: "arcade",
        arcade: { debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [MainMenuScene, GameScene], // MainMenuScene chạy đầu tiên
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-black overflow-hidden">
      <div 
        ref={containerRef} 
        id="game-container"
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
};

export default Index;