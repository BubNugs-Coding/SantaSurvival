import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class ShieldPickup {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 500;

        // No dedicated sprite provided yet; use a visible bubble icon for pickup
        this.sprite = scene.add.circle(x, y, 20, 0x66e0ff, 0.65);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(8);

        // A subtle inner ring
        this.inner = scene.add.circle(x, y, 14, 0xffffff, 0.10);
        this.inner.setOrigin(0.5, 0.5);
        this.inner.setDepth(8);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
            // Approximate hitbox to circle
            this.sprite.body.setSize(40, 40, false);
            this.sprite.body.setOffset(-20, -20);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
        this.sprite.x -= this.scrollSpeed * dt;
        if (this.inner?.active) {
            this.inner.x = this.sprite.x;
            this.inner.y = this.sprite.y;
        }
    }

    isOffLeft() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x < -80;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.inner) this.inner.destroy();
    }
}


