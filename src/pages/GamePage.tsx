import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Layout, Header } from '../shared/ui/Layout';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { RewardBurst } from '../shared/ui/RewardBurst';
import { staggerContainer, staggerItem } from '../lib/animations';
import { useAuthStore } from '../stores/authStore';
import { Trophy, Play, RotateCcw } from 'lucide-react';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Pad {
  x: number;
  y: number;
  width: number;
}

export function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { wallet } = useAuthStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState(0);
  const [touches, setTouches] = useState(0);

  const ballRef = useRef<Ball>({
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 25,
  });

  const padRef = useRef<Pad>({
    x: 100,
    y: 400,
    width: 80,
  });

  const gameStateRef = useRef({
    isPlaying: false,
    score: 0,
    touches: 0,
    gameOver: false,
  });

  const GRAVITY = 0.3;
  const BOUNCE = -0.7;
  const PAD_BOOST = -12;

  const startGame = () => {
    ballRef.current = {
      x: 200,
      y: 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 0,
      radius: 25,
    };

    gameStateRef.current = {
      isPlaying: true,
      score: 0,
      touches: 0,
      gameOver: false,
    };

    setIsPlaying(true);
    setScore(0);
    setTouches(0);
    setGameOver(false);
  };

  const handleTap = (clientX: number) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;

    padRef.current.x = Math.max(
      0,
      Math.min(x - padRef.current.width / 2, rect.width - padRef.current.width)
    );

    if (gameStateRef.current.isPlaying) {
      const ball = ballRef.current;
      const pad = padRef.current;

      if (
        ball.y + ball.radius >= pad.y &&
        ball.y - ball.radius <= pad.y + 15 &&
        ball.x >= pad.x &&
        ball.x <= pad.x + pad.width &&
        ball.vy > 0
      ) {
        ball.vy = PAD_BOOST;
        ball.vx += (Math.random() - 0.5) * 3;

        gameStateRef.current.score += 10;
        gameStateRef.current.touches += 1;

        setScore(gameStateRef.current.score);
        setTouches(gameStateRef.current.touches);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const gameLoop = () => {
      if (!gameStateRef.current.isPlaying) return;

      const ball = ballRef.current;

      ball.vy += GRAVITY;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * 0.8;
      }

      if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -ball.vx * 0.8;
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * 0.8;
      }

      if (ball.y + ball.radius > canvas.height) {
        gameStateRef.current.isPlaying = false;
        gameStateRef.current.gameOver = true;

        setIsPlaying(false);
        setGameOver(true);

        if (gameStateRef.current.score > highScore) {
          setHighScore(gameStateRef.current.score);
        }

        if (gameStateRef.current.score > 0) {
          const rewardAmount = Math.floor(gameStateRef.current.score / 10);
          setReward(rewardAmount);
          setShowReward(true);
        }
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(
        padRef.current.x,
        padRef.current.y,
        padRef.current.width,
        15
      );

      const gradient = ctx.createRadialGradient(
        ball.x,
        ball.y,
        0,
        ball.x,
        ball.y,
        ball.radius
      );
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(1, '#2563eb');

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${score}`, ball.x, ball.y + 5);

      animationId = requestAnimationFrame(gameLoop);
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, score, highScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(padRef.current.x, padRef.current.y, padRef.current.width, 15);

    const gradient = ctx.createRadialGradient(
      ballRef.current.x,
      ballRef.current.y,
      0,
      ballRef.current.x,
      ballRef.current.y,
      ballRef.current.radius
    );
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(1, '#2563eb');

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.arc(
      ballRef.current.x,
      ballRef.current.y,
      ballRef.current.radius,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
  }, []);

  return (
    <Layout>
      <Header title="Keepy-Uppy" subtitle="Keep the ball in the air!" />

      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem}>
          <Card className="p-4 bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Score</p>
                <motion.p
                  className="text-4xl font-bold text-green-400"
                  key={score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {score}
                </motion.p>
              </div>

              <div className="text-right">
                <p className="text-gray-400 text-sm">High Score</p>
                <p className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {highScore}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-0 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={500}
              className="w-full rounded-2xl cursor-pointer"
              onClick={(e) => handleTap(e.clientX)}
              onTouchStart={(e) => {
                e.preventDefault();
                handleTap(e.touches[0].clientX);
              }}
            />
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          {!isPlaying ? (
            <Button
              onClick={startGame}
              className="w-full gap-2"
              size="lg"
            >
              {gameOver ? (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Game
                </>
              )}
            </Button>
          ) : (
            <Card className="p-4 text-center">
              <p className="text-sm text-gray-400">Tap to move the pad</p>
              <p className="text-lg font-bold text-white mt-2">
                Touches: {touches}
              </p>
            </Card>
          )}
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="p-4 bg-gray-800/50 border border-gray-700">
            <h3 className="font-semibold mb-2">How to Play</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>Tap the screen to move the pad</li>
              <li>Keep the ball from touching the ground</li>
              <li>Each bounce scores 10 points</li>
              <li>Convert your score to PHON rewards!</li>
            </ul>
          </Card>
        </motion.div>
      </motion.div>

      {showReward && (
        <RewardBurst
          amount={reward}
          onComplete={() => setShowReward(false)}
        />
      )}
    </Layout>
  );
}
