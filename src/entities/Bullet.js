export default class Bullet {
    constructor(scene, x, y) {
        this.scene = scene;
        this.speed = 900; // px/s to the left

        // Simple bullet for now (sprite later)
        this.sprite = scene.add.rectangle(x, y, 14, 4, 0x111111);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(9);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
        this.sprite.x -= this.speed * dt;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


