import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class ReindeerProjectile {
    constructor(scene, x, y) {
        this.scene = scene;
        this.speed = 1200; // px/s to the right
        this.hasDownedEnemy = false;

        this.sprite = scene.add.image(x, y, 'reindeer').setOrigin(0.5, 0.5);
        this.sprite.setDepth(12);
        // Match attached/pickup reindeer sizing
        this.sprite.setScale(0.10);

        // Face right (direction of travel)
        this.sprite.setFlipX(false);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
            const b = getOpaqueTextureBounds(scene, 'reindeer', 10);
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
    }

    update() {
        if (!this.sprite || !this.sprite.active) return;
        const dt = this.scene.game.loop.delta / 1000;
        this.sprite.x += this.speed * dt;
    }

    isOffRight() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x > this.scene.cameras.main.width + this.sprite.displayWidth + 50;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


