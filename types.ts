export enum GameState {
  START = 'START',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entity extends Point, Size {
  dx: number;
  dy: number;
  color: string;
  active: boolean;
}

export interface Player extends Entity {
  cooldown: number;
}

export interface Enemy extends Entity {
  row: number;
  col: number;
}

export interface Bullet extends Entity {
  isPlayerBullet: boolean;
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
}