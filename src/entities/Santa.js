import { getOpaqueTextureBounds } from '../utils/textureTrim.js';

export default class Santa {
    constructor(scene, x, y) {
        this.scene = scene;
        this.fixedX = x; // Fixed X position with padding from left edge

        // Create Santa sprite from loaded image key `santa` (loaded in GameScene.preload)
        this.sprite = scene.add.image(this.fixedX, y, 'santa');
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(10);

        // Scale down the (likely large) generated image to a reasonable size
        // Tweak as needed when more sprites arrive.
        this.sprite.setScale(0.12);

        // Enable physics
        scene.physics.add.existing(this.sprite);
        if (this.sprite.body) {
            this.sprite.body.setCollideWorldBounds(true);
            // Auto-trim hitbox to the opaque pixels of the texture (matches visible Santa)
            const b = getOpaqueTextureBounds(scene, 'santa', 10);
            // Arcade Physics body sizes / offsets are specified in the *unscaled texture pixel space*.
            // Phaser will scale them along with the GameObject.
            this.sprite.body.setSize(b.w, b.h, false);
            this.sprite.body.setOffset(b.x, b.y);
        }
        
        // Invincibility flash effect
        this.invincible = false;
        this.flashTimer = 0;
        this.devInvincible = false; // toggled by dev mode (persistent, no flashing)

        // Presents inventory
        this.maxPresents = 15;
        this.presents = this.maxPresents;
    }

    update() {
        if (!this.sprite) return;

        // Keep fixed X (space from left edge)
        this.sprite.x = this.fixedX;

        // Follow cursor Y position (screen-space; no camera scrolling in this game yet)
        const pointer = this.scene.input?.activePointer;
        const rawY = pointer ? pointer.y : this.sprite.y;
        const h = this.scene.cameras.main.height;
        const targetY = Phaser.Math.Clamp(rawY, 60, h - 60);

        // Smooth movement (can be slowed by Krampus wind debuff)
        const follow = (typeof this.scene.santaYFollowFactor === 'number') ? this.scene.santaYFollowFactor : 0.25;
        this.sprite.y = Phaser.Math.Linear(this.sprite.y, targetY, Phaser.Math.Clamp(follow, 0.02, 0.35));
        
        // Handle invincibility flash (skip when dev invincible is enabled)
        if (this.invincible && !this.devInvincible) {
            this.flashTimer += this.scene.game.loop.delta;
            const alpha = Math.sin(this.flashTimer / 50) * 0.5 + 0.5;
            this.sprite.setAlpha(alpha);
            
            if (this.flashTimer >= 1000) {
                this.invincible = false;
                this.flashTimer = 0;
                this.sprite.setAlpha(1);
            }
        } else if (this.devInvincible) {
            // Keep stable visuals
            this.sprite.setAlpha(1);
        }
    }

    flash() {
        if (this.devInvincible) return;
        this.invincible = true;
        this.flashTimer = 0;
    }

    setDevInvincible(on) {
        this.devInvincible = !!on;
        this.invincible = !!on;
        this.flashTimer = 0;
        if (this.sprite?.active) this.sprite.setAlpha(1);
    }

    restock() {
        this.presents = this.maxPresents;
    }

    consumePresent() {
        if (this.presents <= 0) return false;
        this.presents--;
        return true;
    }
}

