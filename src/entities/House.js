import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class House {
    constructor(scene, x, y, textureKey = 'house') {
        this.scene = scene;
        this.delivered = false;
        this.scrollSpeed = 500; // pixels per second (faster base world scroll)
        this.textureKey = textureKey;
        
        // Create house sprite from loaded image key
        // Use origin bottom so it "sits" on the snow. `y` is treated as ground/bottom Y.
        this.sprite = scene.add.image(x, y, this.textureKey).setOrigin(0.5, 1);
        this.sprite.setDepth(5);

        // Scale: Special biome houses
        // - Vegas houses: half size
        // - Wasteland caves: half size
        // - Cabins: slightly smaller
        const scale = this.textureKey === 'vegashouse'
            ? 0.10
            : (this.textureKey === 'cave'
                ? 0.10
                : (this.textureKey === 'cabin' ? 0.18 : 0.20));
        this.sprite.setScale(scale);

        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setImmovable(true);
            this.sprite.body.setAllowGravity(false);

            // Auto-trim hitbox to opaque pixels of the texture (matches visible house)
            const b = getOpaqueTextureBounds(scene, this.textureKey, 10);
            // Arcade Physics body sizes / offsets are specified in the *unscaled texture pixel space*.
            // Phaser will scale them along with the GameObject.
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
        
        // Delivery indicator (present icon)
        this.presentIndicator = scene.add.circle(x, y - this.sprite.displayHeight - 10, 8, 0x00ff00);
        this.presentIndicator.setVisible(false);
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) {
            return;
        }
        
        // Scroll left
        const dt = ((deltaMs ?? this.scene.game.loop.delta) / 1000); // seconds
        this.sprite.x -= this.scrollSpeed * dt;
        if (this.presentIndicator) {
            this.presentIndicator.x -= this.scrollSpeed * dt;
        }
    }

    checkDelivery(santaSprite) {
        if (!this.sprite || !this.sprite.active || !santaSprite) return false;

        // Use physics body bounds when available (matches our shrunk hitbox)
        let houseBounds;
        if (this.sprite.body) {
            houseBounds = new Phaser.Geom.Rectangle(
                this.sprite.body.x,
                this.sprite.body.y,
                this.sprite.body.width,
                this.sprite.body.height
            );
        } else {
            houseBounds = this.sprite.getBounds();
        }

        let santaBounds;
        if (santaSprite.body) {
            santaBounds = new Phaser.Geom.Rectangle(
                santaSprite.body.x,
                santaSprite.body.y,
                santaSprite.body.width,
                santaSprite.body.height
            );
        } else if (santaSprite.getBounds) {
            santaBounds = santaSprite.getBounds();
        }
        if (!santaBounds) return false;

        // Check if Santa overlaps vertically with the house bounds
        const verticalOverlap = !(santaBounds.bottom < houseBounds.top || santaBounds.top > houseBounds.bottom);
        
        // Check if house has passed Santa's position (house is to the left of Santa)
        // Add a small buffer to make delivery feel more natural
        const hasPassedOver = this.sprite.x < santaSprite.x + 20;
        
        return verticalOverlap && hasPassedOver && !this.delivered;
    }

    markDelivered() {
        this.delivered = true;
        // Tint slightly green to indicate delivery
        if (this.sprite && this.sprite.setTint) {
            this.sprite.setTint(0x88ff88);
        }
        this.presentIndicator.setVisible(true);
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
        if (this.presentIndicator) {
            this.presentIndicator.destroy();
        }
    }
}

