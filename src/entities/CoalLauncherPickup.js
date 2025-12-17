import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class CoalLauncherPickup {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 500;

        this.sprite = scene.add.image(x, y, 'coallauncher').setOrigin(0.5, 0.5);
        this.sprite.setDepth(8);
        // Match mounted coal cannon scale
        this.sprite.setScale(0.095);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
            const b = getOpaqueTextureBounds(scene, 'coallauncher', 10);
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
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


