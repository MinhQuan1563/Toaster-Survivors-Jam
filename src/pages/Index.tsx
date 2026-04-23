import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameScene from "@/game/GameScene";
import { GAME_CONFIG } from "@/game/Constants";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const handleStart = () => setGameStarted(true);
    if (!gameStarted) {
      window.addEventListener("keydown", handleStart);
      window.addEventListener("click", handleStart);
      return () => {
        window.removeEventListener("keydown", handleStart);
        window.removeEventListener("click", handleStart);
      };
    }
  }, [gameStarted]);

  useEffect(() => {
    if (!gameStarted || !containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: GAME_CONFIG.CANVAS_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      parent: containerRef.current,
      backgroundColor: "#1a1a2e",
      physics: {
        default: "arcade",
        arcade: { debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [GameScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [gameStarted]);

  if (!gameStarted) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0f172a] text-white">
        <div className="z-10 text-center">
          <h2 className="mb-4 text-5xl font-black font-mono tracking-tighter" style={{ color: "#e2e8f0", textShadow: "0 0 20px rgba(249, 115, 22, 0.5)" }}>
            TOASTER SURVIVORS
          </h2>
          <p className="text-xl font-mono text-orange-500 animate-pulse">PRESS ANY KEY TO START</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20" style={{ background: "linear-gradient(to top, #f97316, transparent)" }} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-screen w-screen bg-black overflow-hidden">
      <div className="absolute top-1 left-4 z-10 pointer-events-none opacity-40">
        <h1 className="text-xs font-bold text-slate-300 font-mono tracking-widest">
          🍞 TOASTER SURVIVORS
        </h1>
      </div>

      <div 
        ref={containerRef} 
        id="game-container"
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
};

export default Index;