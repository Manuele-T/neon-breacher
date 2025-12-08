import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { GameState, Difficulty } from '../types';

const NeonInvaders: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.HARD);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('neon_breacher_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Game Engine
    engineRef.current = new GameEngine(
      canvasRef.current,
      (newScore) => setScore(newScore),
      (newState) => setGameState(newState)
    );

    // Initial resize
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        // Make canvas responsive but keep a reasonable game area
        const maxWidth = Math.min(window.innerWidth - 32, 800);
        const maxHeight = Math.min(window.innerHeight - 32, 600);
        engineRef.current.resize(maxWidth, maxHeight);
        
        // If not playing or countdown, draw the initial screen or paused state
        if (engineRef.current.state !== GameState.PLAYING && engineRef.current.state !== GameState.COUNTDOWN) {
            engineRef.current.draw();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      engineRef.current?.cleanup();
    };
  }, []);

  // Handle High Score persistence
  useEffect(() => {
    if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('neon_breacher_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.start(selectedDifficulty);
    }
  };

  const goToMenu = () => {
    setGameState(GameState.START);
    if (engineRef.current) {
      engineRef.current.resetToMenu();
    }
  };

  return (
    <div className="relative group">
      {/* Game Header / Score */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center pointer-events-none z-10">
        <h1 className="text-2xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] tracking-widest hidden sm:block">
          NEON BREACHER
        </h1>
        <div className="flex gap-8 text-2xl font-bold">
            <div className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]">
                SCORE: {score.toString().padStart(5, '0')}
            </div>
            <div className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                HIGH: {highScore.toString().padStart(5, '0')}
            </div>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="border-2 border-cyan-900 bg-black shadow-[0_0_50px_rgba(0,255,255,0.1)] rounded-sm block cursor-none"
        style={{ touchAction: 'none' }} // Prevent scrolling on mobile
      />

      {/* Start / Game Over Overlay */}
      {gameState !== GameState.PLAYING && gameState !== GameState.COUNTDOWN && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 transition-all duration-300">
          <div className="text-center p-8 border border-cyan-500/30 bg-black/90 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            
            {gameState === GameState.START && (
              <>
                <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-6 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  READY?
                </h2>
                <div className="text-gray-400 mb-8 font-mono text-sm space-y-2">
                  <p>ARROWS / WASD to Move</p>
                  <p>SPACE to Shoot</p>
                </div>
                
                {/* Difficulty Selector */}
                <div className="flex gap-4 justify-center mb-8">
                  {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`px-4 py-2 font-bold rounded border transition-all duration-200 
                        ${selectedDifficulty === diff 
                          ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)]' 
                          : 'bg-transparent border-gray-700 text-gray-500 hover:border-cyan-800 hover:text-cyan-400'
                        }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </>
            )}

            {gameState === GameState.GAME_OVER && (
              <>
                <h2 className="text-6xl font-black text-red-500 mb-2 drop-shadow-[0_0_25px_rgba(239,68,68,0.6)]">
                  GAME OVER
                </h2>
                <p className="text-xl text-gray-300 mb-8">FINAL SCORE: {score}</p>
              </>
            )}

            {gameState === GameState.VICTORY && (
              <>
                <h2 className="text-6xl font-black text-yellow-400 mb-2 drop-shadow-[0_0_25px_rgba(250,204,21,0.6)]">
                  VICTORY!
                </h2>
                <p className="text-xl text-gray-300 mb-8">ALL INVADERS CLEARED</p>
              </>
            )}

            <button
              onClick={gameState === GameState.START ? startGame : goToMenu}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xl rounded transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] active:scale-95"
            >
              {gameState === GameState.START ? 'INSERT COIN' : 'MAIN MENU'}
            </button>
          </div>
        </div>
      )}
      
      {/* Decorative corners */}
      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-cyan-500 pointer-events-none opacity-50" />
      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-cyan-500 pointer-events-none opacity-50" />
      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-cyan-500 pointer-events-none opacity-50" />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-cyan-500 pointer-events-none opacity-50" />
    </div>
  );
};

export default NeonInvaders;