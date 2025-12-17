export default class WashingtonBuilding {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 500; // match house scroll speed

        // Create building sprite from loaded image key `washington`
        this.sprite = scene.add.image(x, y, 'washington');
        this.sprite.setOrigin(0.5, 1); // anchor bottom so it sits on the snow

        // Scale down large generated image to a reasonable size
        this.sprite.setScale(0.18);

        // Optional: enable physics later if needed
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
        if (this.sprite) {
            this.sprite.destroy();
        }
    }
}


