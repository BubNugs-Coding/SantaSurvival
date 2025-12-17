export default class CoalSmokeCloud {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 500; // drift left like world objects

        // More visible smoke
        this.sprite = scene.add.circle(x, y, 36, 0x2b2b2b, 0.55);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(11);

        // give it a soft outline / extra puff
        this.puff = scene.add.circle(x + 18, y - 8, 28, 0x242424, 0.45);
        this.puff.setOrigin(0.5, 0.5);
        this.puff.setDepth(11);

        // fade out slowly
        this.lifeMs = 2600;
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        this.lifeMs -= dtMs;

        this.sprite.x -= this.scrollSpeed * dt;
        this.puff.x -= this.scrollSpeed * dt;

        // gentle expand + fade
        const t = Phaser.Math.Clamp(1 - this.lifeMs / 2600, 0, 1);
        this.sprite.setScale(1 + t * 0.25);
        this.puff.setScale(1 + t * 0.18);

        const alpha = Phaser.Math.Clamp(0.55 * (1 - t), 0, 0.55);
        this.sprite.setAlpha(alpha);
        this.puff.setAlpha(alpha * 0.8);
    }

    isDeadOrOffLeft() {
        if (!this.sprite || !this.sprite.active) return true;
        if (this.lifeMs <= 0) return true;
        return this.sprite.x < -80;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.puff) this.puff.destroy();
    }
}


