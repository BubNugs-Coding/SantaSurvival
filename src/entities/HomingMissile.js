import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class HomingMissile {
    constructor(scene, x, y, santaSprite) {
        this.scene = scene;
        this.santaSprite = santaSprite;

        this.trackingMs = 1000; // tracks for 1 second
        this.speed = 520; // px/s
        this.hp = 1; // takes 1 reindeer hit

        // Simple missile shape for now (sprite later)
        this.sprite = scene.add.rectangle(x, y, 26, 10, 0xff5533);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(10);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }

        // Initial direction: left
        this.vx = -this.speed;
        this.vy = 0;
    }

    takeHit() {
        this.hp -= 1;
        // flash
        this.sprite.setFillStyle(0xffff00);
        this.scene.time.delayedCall(80, () => {
            if (this.sprite?.active) this.sprite.setFillStyle(0xff5533);
        });
        if (this.hp <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        if (this.trackingMs > 0 && this.santaSprite?.active) {
            this.trackingMs -= dtMs;

            const tx = this.santaSprite.x;
            const ty = this.santaSprite.y;
            const dx = tx - this.sprite.x;
            const dy = ty - this.sprite.y;
            const len = Math.hypot(dx, dy) || 1;
            this.vx = (dx / len) * this.speed;
            this.vy = (dy / len) * this.speed;

            // face direction
            this.sprite.rotation = Math.atan2(this.vy, this.vx);
        }

        this.sprite.x += this.vx * dt;
        this.sprite.y += this.vy * dt;
    }

    isOffscreen() {
        if (!this.sprite || !this.sprite.active) return true;
        const w = this.scene.cameras.main.width;
        const h = this.scene.cameras.main.height;
        return (
            this.sprite.x < -60 ||
            this.sprite.x > w + 60 ||
            this.sprite.y < -60 ||
            this.sprite.y > h + 60
        );
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


