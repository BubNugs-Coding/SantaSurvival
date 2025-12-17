export default class CoalProjectile {
    constructor(scene, x, y) {
        this.scene = scene;
        this.speed = 1000; // px/s to the right

        this.sprite = scene.add.circle(x, y, 7, 0x111111);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(12);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
        this.sprite.x += this.speed * dt;
    }

    isOffRight() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x > this.scene.cameras.main.width + 60;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


