export default class Area51Building {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 500; // match house scroll speed

        this.sprite = scene.add.image(x, y, 'area51');
        this.sprite.setOrigin(0.5, 1); // bottom anchored
        this.sprite.setDepth(4);
        this.sprite.setScale(0.22);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setImmovable(true);
            this.sprite.body.setAllowGravity(false);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
        this.sprite.x -= this.scrollSpeed * dt;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


