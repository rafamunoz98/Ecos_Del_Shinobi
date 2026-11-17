import Phaser from 'phaser';
import { GameScene } from './presentation/GameScene';
import './ui/style.css';

// ?seed=123 permite reproducir una expedición concreta.
const params = new URLSearchParams(window.location.search);
const seed = (Number(params.get('seed') ?? Date.now()) >>> 0) || 1;

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 640,
  pixelArt: false,
  antialias: true,
  backgroundColor: '#0b0b12',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: new GameScene(seed),
});
