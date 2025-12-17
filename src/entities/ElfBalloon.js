import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class ElfBalloon {
    constructor(scene, x, y) {
        this.scene = scene;
        this.scrollSpeed = 400; // a bit slower than houses
        this.hasPresent = true;

        // Balloon sprite
        this.sprite = scene.add.image(x, y, 'balloon').setOrigin(0.5, 0.5);
        this.sprite.setDepth(6);
        this.sprite.setScale(0.34);

        // Present icon inside balloon
        // Present should sit in the basket area
        this.presentOffsetY = 24;
        this.presentIcon = scene.add.image(x, y + this.presentOffsetY, 'present').setOrigin(0.5, 0.5);
        this.presentIcon.setDepth(7);
        this.presentIcon.setScale(0.06);

        // Gentle bob
        this.bobPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setAllowGravity(false);
            // Auto-trim hitbox to opaque pixels (so dev hitboxes match visuals)
            const b = getOpaqueTextureBounds(scene, 'balloon', 10);
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;

        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000);
        this.sprite.x -= this.scrollSpeed * dt;

        // bobbing
        const bob = Math.sin(this.scene.time.now / 220 + this.bobPhase) * 0.35;
        this.sprite.y += bob;

        if (this.presentIcon && this.presentIcon.active) {
            this.presentIcon.x = this.sprite.x;
            this.presentIcon.y = this.sprite.y + this.presentOffsetY;
        }
    }

    collect() {
        if (!this.hasPresent) return false;
        this.hasPresent = false;
        if (this.presentIcon) this.presentIcon.setVisible(false);
        return true;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
        if (this.presentIcon) this.presentIcon.destroy();
    }
}


