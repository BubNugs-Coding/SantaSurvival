import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class ReindeerPickup {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 450; // px/s to the left

        this.sprite = scene.add.image(x, y, 'reindeer').setOrigin(0.5, 0.5);
        this.sprite.setDepth(8);
        // Match attached reindeer size (tuned in GameScene.attachReindeer)
        this.sprite.setScale(0.10);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
            // Trim to opaque pixels so hitboxes match visuals
            const b = getOpaqueTextureBounds(scene, 'reindeer', 10);
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
    }

    update() {
        if (!this.sprite || !this.sprite.active) return;
        const dt = this.scene.game.loop.delta / 1000;
        this.sprite.x -= this.scrollSpeed * dt;
    }

    isOffLeft() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x < -this.sprite.displayWidth - 50;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


