import { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameScene from "@/game/GameScene";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      backgroundColor: "#1a1a2e",
      physics: {
        default: "arcade",
        arcade: { debug: false },
      },
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="mb-4 text-2xl font-bold text-foreground font-mono tracking-wide">
        🍞 TOASTER SURVIVORS: Breakfast Protocol 🍞
      </h1>
      <p className="mb-2 text-sm text-muted-foreground font-mono">
        WASD/Arrows to move · Auto-attack · Collect screws for XP · R to restart
      </p>
      <div ref={containerRef} className="rounded-lg overflow-hidden border border-border shadow-lg" />
    </div>
  );
};

export default Index;
