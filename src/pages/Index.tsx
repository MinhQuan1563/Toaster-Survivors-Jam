import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameScene from "@/game/GameScene";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  // Handle any key press to start the game
  useEffect(() => {
    const handleKeyPress = () => {
      setGameStarted(true);
    };

    const handleClick = () => {
      setGameStarted(true);
    };

    if (!gameStarted) {
      window.addEventListener("keydown", handleKeyPress);
      window.addEventListener("click", handleClick);
      return () => {
        window.removeEventListener("keydown", handleKeyPress);
        window.removeEventListener("click", handleClick);
      };
    }
  }, [gameStarted]);

  // Initialize Phaser game when gameStarted becomes true
  useEffect(() => {
    if (!gameStarted || !containerRef.current || gameRef.current) return;

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
  }, [gameStarted]);

  if (!gameStarted) {
    return (
      <div 
        className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 bg-orange-500 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-20 w-48 h-48 bg-amber-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-6xl font-black mb-2 font-mono tracking-wider" style={{ color: "#f97316" }}>
              🍞
            </h1>
            <h2 className="text-5xl font-black mb-4 font-mono" style={{ color: "#e2e8f0", textShadow: "0 0 20px rgba(249, 115, 22, 0.5)" }}>
              TOASTER SURVIVORS
            </h2>
            <p className="text-xl font-mono mb-2" style={{ color: "#fbbf24" }}>
              Breakfast Protocol
            </p>
          </div>

          {/* Start prompt */}
          <div className="animate-bounce">
            <p 
              className="text-2xl font-black font-mono tracking-wider mb-2"
              style={{ color: "#fbbf24" }}
            >
              PRESS ANY KEY TO START
            </p>
            <p className="text-xs font-mono" style={{ color: "#94a3b8" }}>
              or click anywhere
            </p>
          </div>
        </div>

        {/* Decorative bottom element */}
        <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20" style={{ background: "linear-gradient(to top, #f97316, transparent)" }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <h1 className="mb-4 text-2xl font-bold text-foreground font-mono tracking-wide">
        🍞 TOASTER SURVIVORS: Breakfast Protocol 🍞
      </h1>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-3 text-xs font-mono">
        <span className="text-muted-foreground whitespace-nowrap">Move:</span>
        <div className="flex gap-0.5">
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm" title="Move Up">W</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm" title="Move Left">A</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm" title="Move Down">S</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm" title="Move Right">D</kbd>
        </div>

        <span className="text-muted-foreground">/</span>
        <div className="flex gap-0.5">
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm">↑</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm">←</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm">↓</kbd>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm">→</kbd>
        </div>

        <span className="text-muted-foreground">·</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground whitespace-nowrap">Restart:</span>
          <kbd className="inline-flex items-center justify-center w-6 h-6 rounded border border-border bg-slate-700 text-orange-400 font-bold text-[10px] shadow-sm">R</kbd>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden border border-border shadow-lg" />
    </div>
  );
};

export default Index;
