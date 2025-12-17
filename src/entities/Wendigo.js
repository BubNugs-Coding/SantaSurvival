import DirtBall from './DirtBall.js';

export default class Wendigo {
    constructor(scene, x, groundY) {
        this.scene = scene;
        this.scrollSpeed = 500; // match houses

        this.sprite = scene.add.image(x, groundY, 'wendigo').setOrigin(0.5, 1);
        this.sprite.setDepth(8);
        this.sprite.setScale(0.10);
        this.sprite.setFlipX(false); // facing left (toward Santa)

        // Throw once per spawn
        this.hasThrown = false;
        this.throwWhenFullyInView = true;

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    update(deltaMs, santaSprite) {
        if (!this.sprite || !this.sprite.active) return null;
        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        // Move with world scroll
        this.sprite.x -= this.scrollSpeed * dt;

        // Throw once when reasonably in view
        const w = this.scene.cameras.main.width;
        if (!this.hasThrown && this.throwWhenFullyInView && this.sprite.x < w - 80) {
            this.hasThrown = true;
            return this.throwDirtBall(santaSprite);
        }

        return null;
    }

    throwDirtBall(santaSprite) {
        if (!this.sprite?.active) return null;

        // Aim at Santa's current position with a ballistic arc
        const fromX = this.sprite.x - 30;
        const fromY = this.sprite.y - this.sprite.displayHeight * 0.55;

        let targetX = 120;
        let targetY = this.scene.cameras.main.height / 2;
        if (santaSprite?.active) {
            targetX = santaSprite.x;
            targetY = santaSprite.y;
        }

        const g = 900;
        const t = 1.05; // time-of-flight for the arc
        const vx = (targetX - fromX) / t;
        const vy = (targetY - fromY) / t - 0.5 * g * t;

        const b = new DirtBall(this.scene, fromX, fromY, vx, vy);
        b.g = g; // ensure the same gravity used for the aiming calc
        return b;
    }

    isOffLeft() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x < -this.sprite.displayWidth - 100;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


