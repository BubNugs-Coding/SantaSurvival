import Missile from './Missile.js';

export default class Washington {
    constructor(scene, x, y, santaTarget, missilesList) {
        this.scene = scene;
        this.santaTarget = santaTarget;
        this.missilesList = missilesList;
        this.scrollSpeed = 120; // pixels per second (slower than houses)
        this.shootTimer = 0;
        this.shootInterval = 2500; // Shoot every 2.5 seconds
        
        // Create Washington sprite
        this.sprite = scene.add.rectangle(x, y, 50, 80, 0x0000ff);
        scene.physics.add.existing(this.sprite);
        
        // Visual details
        this.sprite.setStrokeStyle(2, 0x000000);
        
        // Add a hat (tricorn style)
        this.hat = scene.add.rectangle(x, y - 45, 60, 20, 0x000080);
        this.hat.setStrokeStyle(2, 0x000000);
        
        // Add a face
        this.face = scene.add.circle(x, y - 10, 15, 0xffdbac);
        this.face.setStrokeStyle(2, 0x000000);
    }

    update() {
        if (!this.sprite || !this.sprite.active) {
            return;
        }
        
        const delta = this.scene.game.loop.delta / 1000; // Convert to seconds
        
        // Scroll left
        this.sprite.x -= this.scrollSpeed * delta;
        if (this.hat) {
            this.hat.x -= this.scrollSpeed * delta;
        }
        if (this.face) {
            this.face.x -= this.scrollSpeed * delta;
        }
        
        // Shoot missiles
        this.shootTimer += delta * 1000; // Convert to milliseconds
        if (this.shootTimer >= this.shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        if (this.santaTarget && this.santaTarget.sprite && this.santaTarget.sprite.active && this.sprite && this.sprite.active) {
            const missile = new Missile(
                this.scene,
                this.sprite.x,
                this.sprite.y,
                this.santaTarget.sprite.x,
                this.santaTarget.sprite.y
            );
            // Store our wrapper missile object in a plain array (not a Phaser Group)
            if (Array.isArray(this.missilesList)) {
                this.missilesList.push(missile);
            }
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
        if (this.hat) {
            this.hat.destroy();
        }
        if (this.face) {
            this.face.destroy();
        }
    }
}

