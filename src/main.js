import GameScene from './scenes/GameScene.js';
import TitleScene from './scenes/TitleScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    // Don't configure input - let Phaser use defaults
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [TitleScene, GameScene]
};

const game = new Phaser.Game(config);

