import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { BarScene } from './scenes/BarScene';
import { HUDScene } from './scenes/HUDScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  scene: [PreloadScene, BarScene, HUDScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

// Hot module replacement support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    game.destroy(true);
  });
}

console.log('[RobotRunnerCC] Game initialized');
