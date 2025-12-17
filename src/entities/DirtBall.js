export default class DirtBall {
    constructor(scene, x, y, vx, vy) {
        this.scene = scene;
        this.vx = vx; // px/s
        this.vy = vy; // px/s
        this.g = 900; // px/s^2 downward

        // Simple projectile (can be replaced with a sprite later)
        this.sprite = scene.add.circle(x, y, 10, 0x5b3a1e, 0.95);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(12);
        // Red outline for visibility
        this.sprite.setStrokeStyle(2, 0xff0000, 0.85);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        this.vy += this.g * dt;
        this.sprite.x += this.vx * dt;
        this.sprite.y += this.vy * dt;
    }

    isOffscreen() {
        if (!this.sprite || !this.sprite.active) return true;
        const w = this.scene.cameras.main.width;
        const h = this.scene.cameras.main.height;
        return (
            this.sprite.x < -40 ||
            this.sprite.x > w + 40 ||
            this.sprite.y < -60 ||
            this.sprite.y > h + 80
        );
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


