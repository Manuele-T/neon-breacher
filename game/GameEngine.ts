import { GameState, Player, Enemy, Bullet, Particle, Difficulty } from '../types';
import { SoundManager } from './SoundManager';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: GameState = GameState.START;
  
  player: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  
  score: number = 0;
  keys: { [key: string]: boolean } = {};
  
  // Game constants
  PLAYER_SPEED = 5;
  BULLET_SPEED = 7;
  ENEMY_SPEED_BASE = 1;
  ENEMY_DROP = 20;
  PARTICLE_LIFE = 45; // Longer life for fireball effect
  
  enemyDirection = 1; // 1 for right, -1 for left
  enemySpeed = 1;
  difficulty: Difficulty = Difficulty.HARD;
  
  // Countdown Logic
  countdownValue: number = 3;
  lastFrameTime: number = 0;
  countdownTimer: number = 0;

  onScoreUpdate: (score: number) => void;
  onStateUpdate: (state: GameState) => void;
  
  soundManager: SoundManager;

  constructor(
    canvas: HTMLCanvasElement, 
    onScoreUpdate: (score: number) => void,
    onStateUpdate: (state: GameState) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!; // Optimize for no transparency
    this.width = canvas.width;
    this.height = canvas.height;
    this.onScoreUpdate = onScoreUpdate;
    this.onStateUpdate = onStateUpdate;
    this.soundManager = new SoundManager();

    // Initialize player
    this.player = {
      x: this.width / 2 - 20,
      y: this.height - 60,
      width: 40,
      height: 30, // Taller for detailed ship
      dx: 0,
      dy: 0,
      color: '#00ffff', // Cyan
      active: true,
      cooldown: 0
    };

    this.bindEvents();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Reposition player if out of bounds
    if (this.player.x > this.width) this.player.x = this.width - this.player.width;
    this.player.y = this.height - 60;
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => this.keys[e.code] = true);
    window.addEventListener('keyup', (e) => this.keys[e.code] = false);
  }

  cleanup() {
    window.removeEventListener('keydown', (e) => this.keys[e.code] = true);
    window.removeEventListener('keyup', (e) => this.keys[e.code] = false);
  }

  resetToMenu() {
    this.state = GameState.START;
    // Clear entities so the background is clean for the menu
    this.bullets = [];
    this.particles = [];
    this.enemies = [];
    this.draw();
  }

  start(difficulty: Difficulty) {
    // Resume AudioContext on user interaction
    this.soundManager.resume();

    this.difficulty = difficulty;
    this.state = GameState.COUNTDOWN;
    this.onStateUpdate(this.state);
    
    this.score = 0;
    this.onScoreUpdate(this.score);
    this.resetEntities();
    
    // Init countdown
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.lastFrameTime = performance.now();
    
    this.loop();
  }

  resetEntities() {
    this.bullets = [];
    this.particles = [];
    this.enemies = [];
    this.player.x = this.width / 2 - 20;
    this.player.active = true;
    this.enemySpeed = this.ENEMY_SPEED_BASE;
    this.enemyDirection = 1;

    // Create enemies grid
    const rows = 4;
    const cols = 8;
    const padding = 20;
    const enemyWidth = 30;
    const enemyHeight = 20;
    const startX = (this.width - (cols * (enemyWidth + padding))) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.enemies.push({
          x: startX + c * (enemyWidth + padding),
          y: 60 + r * (enemyHeight + padding),
          width: enemyWidth,
          height: enemyHeight,
          dx: 0,
          dy: 0,
          color: '#39ff14', // Neon Green
          active: true,
          row: r,
          col: c
        });
      }
    }
  }

  spawnParticles(x: number, y: number, baseColor: string, count: number = 25) {
    // Fire colors palette
    const fireColors = ['#ffffff', '#ffff00', '#ffaa00', '#ff4400'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1; 
      
      // Randomize color to simulate fire/explosion texture
      // If it's the player (blue), mix in cyan/white. If enemy, mix fire colors.
      let color = baseColor;
      if (Math.random() > 0.3) {
         color = fireColors[Math.floor(Math.random() * fireColors.length)];
      }

      this.particles.push({
        x,
        y,
        width: Math.random() * 5 + 2, // Radius
        height: 0, // Unused for circles
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: color,
        life: this.PARTICLE_LIFE,
        maxLife: this.PARTICLE_LIFE,
        active: true
      });
    }
  }

  getDifficultyMultipliers() {
    switch (this.difficulty) {
      case Difficulty.EASY:
        return { speed: 1/3, freq: 1/3 };
      case Difficulty.MEDIUM:
        return { speed: 2/3, freq: 2/3 };
      case Difficulty.HARD:
      default:
        return { speed: 1, freq: 1 };
    }
  }

  update(dt: number) {
    if (this.state === GameState.COUNTDOWN) {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 1000) {
        this.countdownValue--;
        this.countdownTimer = 0;
        if (this.countdownValue <= 0) {
          this.state = GameState.PLAYING;
          this.onStateUpdate(this.state);
        }
      }
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    const multipliers = this.getDifficultyMultipliers();

    // Player Movement
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.player.x -= this.PLAYER_SPEED;
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.player.x += this.PLAYER_SPEED;
    }
    
    // Clamp Player
    this.player.x = Math.max(0, Math.min(this.width - this.player.width, this.player.x));

    // Player Shooting
    if (this.player.cooldown > 0) this.player.cooldown--;
    if ((this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW']) && this.player.cooldown <= 0) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2,
        y: this.player.y,
        width: 3,
        height: 10,
        dx: 0,
        dy: -this.BULLET_SPEED,
        color: '#ff00ff', // Neon Pink
        active: true,
        isPlayerBullet: true
      });
      this.soundManager.playShoot();
      this.player.cooldown = 15; // Frames between shots
    }

    // Update Bullets
    this.bullets.forEach(b => {
      b.y += b.dy;
      // Remove if out of screen
      if (b.y < 0 || b.y > this.height) b.active = false;
    });

    // Enemy Logic
    let hitWall = false;
    const livingEnemies = this.enemies.filter(e => e.active);
    
    if (livingEnemies.length === 0) {
      this.state = GameState.VICTORY;
      this.onStateUpdate(this.state);
      return;
    }

    livingEnemies.forEach(e => {
      e.x += this.enemySpeed * this.enemyDirection;
      
      // Check wall collision
      if ((e.x <= 0 && this.enemyDirection === -1) || 
          (e.x + e.width >= this.width && this.enemyDirection === 1)) {
        hitWall = true;
      }

      // Check collision with player or bottom
      if (e.y + e.height >= this.player.y) {
         this.soundManager.playExplosion();
         this.state = GameState.GAME_OVER;
         this.onStateUpdate(this.state);
      }
      
      // Random shooting affected by difficulty
      const baseFreq = 0.001 * (1 + this.score / 500);
      if (Math.random() < baseFreq * multipliers.freq) {
         this.bullets.push({
           x: e.x + e.width / 2,
           y: e.y + e.height,
           width: 3,
           height: 10,
           dx: 0,
           dy: (this.BULLET_SPEED / 1.5) * multipliers.speed, // Speed affected by difficulty
           color: '#ff3333', // Red
           active: true,
           isPlayerBullet: false
         });
      }
    });

    if (hitWall) {
      this.enemyDirection *= -1;
      livingEnemies.forEach(e => {
        e.y += this.ENEMY_DROP;
      });
      // Increase speed slightly
      this.enemySpeed += 0.2;
    }

    // Collision Detection: Bullets vs Enemies/Player
    this.bullets.forEach(b => {
      if (!b.active) return;

      if (b.isPlayerBullet) {
        // Check vs Enemies
        this.enemies.forEach(e => {
          if (!e.active) return;
          if (b.x < e.x + e.width &&
              b.x + b.width > e.x &&
              b.y < e.y + e.height &&
              b.y + b.height > e.y) {
            
            e.active = false;
            b.active = false;
            this.soundManager.playExplosion();
            this.spawnParticles(e.x + e.width/2, e.y + e.height/2, e.color);
            this.score += 100;
            this.onScoreUpdate(this.score);
          }
        });
      } else {
        // Check vs Player
        if (b.x < this.player.x + this.player.width &&
            b.x + b.width > this.player.x &&
            b.y < this.player.y + this.player.height &&
            b.y + b.height > this.player.y) {
          
          b.active = false;
          this.soundManager.playExplosion();
          this.spawnParticles(this.player.x + this.player.width/2, this.player.y + this.player.height/2, this.player.color, 40);
          this.state = GameState.GAME_OVER;
          this.onStateUpdate(this.state);
        }
      }
    });

    // Update Particles
    this.particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      p.life--;
      
      // Drag/Friction for physics feel
      p.dx *= 0.95;
      p.dy *= 0.95;

      // Shrink over time
      p.width *= 0.96;

      if (p.life <= 0 || p.width < 0.2) p.active = false;
    });

    // Cleanup arrays
    this.bullets = this.bullets.filter(b => b.active);
    this.particles = this.particles.filter(p => p.active);
  }

  draw() {
    // Clear screen
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Common Glow Effect
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 10;
    
    // Draw Player (Detailed Spaceship)
    if (this.state === GameState.PLAYING || this.state === GameState.COUNTDOWN) {
      this.ctx.shadowColor = this.player.color;
      this.ctx.strokeStyle = this.player.color;
      this.ctx.fillStyle = '#000000'; // Fill black to hide stars behind
      
      const px = this.player.x;
      const py = this.player.y;
      const pw = this.player.width;
      const ph = this.player.height;
      const cx = px + pw / 2;

      this.ctx.beginPath();
      // Nose cone
      this.ctx.moveTo(cx, py);
      // Right wing outer
      this.ctx.lineTo(px + pw, py + ph * 0.8);
      // Right wing tip back
      this.ctx.lineTo(px + pw, py + ph);
      // Right engine inset
      this.ctx.lineTo(cx + pw * 0.2, py + ph * 0.9);
      // Center thrust nozzle
      this.ctx.lineTo(cx, py + ph);
      // Left engine inset
      this.ctx.lineTo(cx - pw * 0.2, py + ph * 0.9);
      // Left wing tip back
      this.ctx.lineTo(px, py + ph);
      // Left wing outer
      this.ctx.lineTo(px, py + ph * 0.8);
      this.ctx.closePath();
      
      this.ctx.fill();
      this.ctx.stroke();

      // Cockpit detail
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(cx, py + ph * 0.4, 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Engine Thruster Flame
      if (Math.random() > 0.2) { // Flicker effect
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 3, py + ph);
        this.ctx.lineTo(cx, py + ph + Math.random() * 12 + 4);
        this.ctx.lineTo(cx + 3, py + ph);
        this.ctx.stroke();
      }
    }

    // Draw Enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      this.ctx.shadowColor = e.color;
      this.ctx.strokeStyle = e.color;
      
      // Invader Shape (Crab-like)
      const ex = e.x;
      const ey = e.y;
      const ew = e.width;
      const eh = e.height;
      
      this.ctx.beginPath();
      // Top curve
      this.ctx.moveTo(ex + ew * 0.2, ey + eh * 0.3);
      this.ctx.lineTo(ex + ew * 0.8, ey + eh * 0.3);
      // Sides
      this.ctx.lineTo(ex + ew, ey + eh * 0.6);
      this.ctx.lineTo(ex + ew * 0.8, ey + eh);
      this.ctx.lineTo(ex + ew * 0.6, ey + eh * 0.8);
      this.ctx.lineTo(ex + ew * 0.4, ey + eh * 0.8);
      this.ctx.lineTo(ex + ew * 0.2, ey + eh);
      this.ctx.lineTo(ex, ey + eh * 0.6);
      this.ctx.closePath();
      this.ctx.stroke();

      // Eyes
      this.ctx.fillStyle = e.color;
      this.ctx.beginPath();
      this.ctx.arc(ex + ew * 0.35, ey + eh * 0.5, 2, 0, Math.PI * 2);
      this.ctx.arc(ex + ew * 0.65, ey + eh * 0.5, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Draw Bullets
    this.bullets.forEach(b => {
      this.ctx.shadowColor = b.color;
      this.ctx.strokeStyle = b.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(b.x, b.y + b.height);
      this.ctx.stroke();
    });

    // Draw Particles (Fireballs)
    this.ctx.globalCompositeOperation = 'lighter'; // Additive blending for fire glow
    this.particles.forEach(p => {
      this.ctx.shadowColor = p.color;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife); // Fade opacity
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.width, 0, Math.PI * 2); // Circular fireball
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;
    this.ctx.globalCompositeOperation = 'source-over'; // Reset blend mode

    // Draw Countdown
    if (this.state === GameState.COUNTDOWN) {
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 30;
        this.ctx.font = '900 120px "Orbitron"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.countdownValue.toString(), this.width / 2, this.height / 2);
        this.ctx.restore();
    }

    // Scanlines effect (optional aesthetic)
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(0, 255, 255, 0.02)';
    for (let i = 0; i < this.height; i += 4) {
      this.ctx.fillRect(0, i, this.width, 1);
    }
  }

  loop = () => {
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.update(dt);
    this.draw();
    
    if (this.state === GameState.PLAYING || this.state === GameState.COUNTDOWN) {
      requestAnimationFrame(this.loop);
    } else if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      // Draw one last time to show final state
      this.draw(); 
    }
  };
}