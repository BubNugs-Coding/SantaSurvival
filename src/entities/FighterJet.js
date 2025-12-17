import Bullet from './Bullet.js';

export default class FighterJet {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {object} opts
     * @param {boolean} opts.flipX - true to mirror image
     * @param {number} opts.scale
     * @param {number} opts.depth
     * @param {Bullet[]} opts.bulletsList - array to push new bullets into
     */
    constructor(scene, x, y, opts = {}) {
        this.scene = scene;
        this.bulletsList = opts.bulletsList || null;

        this.sprite = scene.add.image(x, y, 'basicjet');
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(opts.depth ?? 9);
        this.sprite.setScale(opts.scale ?? 0.18);
        this.sprite.setFlipX(!!opts.flipX);

        // Phase machine
        this.phase = 'hover'; // approach -> hover -> firing -> exit
        this.hoverMs = 0;
        this.fireMs = 0;
        this.fireEveryMs = 120;
        this.fireCooldownMs = 0;

        this.approachMs = 0;
        this.approachTotalMs = 0;
        this.approachTargetX = x;
        this.approachTargetY = y;
        this.nextHoverMs = 0;

        this.vx = 0;
        this.vy = 0;
    }

    startApproach(targetX, targetY, ms, nextHoverMs) {
        this.phase = 'approach';
        this.approachMs = ms;
        this.approachTotalMs = ms;
        this.approachTargetX = targetX;
        this.approachTargetY = targetY;
        this.nextHoverMs = nextHoverMs;
        this.vx = 0;
        this.vy = 0;
    }

    startHover(ms) {
        this.phase = 'hover';
        this.hoverMs = ms;
        this.vx = 0;
        this.vy = 0;
    }

    startFiring(ms, fireEveryMs = 120) {
        this.phase = 'firing';
        this.fireMs = ms;
        this.fireEveryMs = fireEveryMs;
        this.fireCooldownMs = 0;
        this.vx = 0;
        this.vy = 0;
    }

    startExit(vx, vy) {
        this.phase = 'exit';
        this.vx = vx;
        this.vy = vy;
    }

    fireOnce() {
        if (!this.bulletsList || !Array.isArray(this.bulletsList)) return;
        if (!this.sprite || !this.sprite.active) return;

        const startX = this.sprite.x - this.sprite.displayWidth * 0.45;
        const startY = this.sprite.y;
        const bullet = new Bullet(this.scene, startX, startY);
        this.bulletsList.push(bullet);
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;

        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        if (this.phase === 'approach') {
            this.approachMs -= dtMs;

            // Smoothly move toward target
            this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.approachTargetX, 0.08);
            this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.approachTargetY, 0.08);

            if (this.approachMs <= 0) {
                // Snap to final hover position and begin hover
                this.sprite.x = this.approachTargetX;
                this.sprite.y = this.approachTargetY;
                this.startHover(this.nextHoverMs || 2000);
            }
        } else if (this.phase === 'hover') {
            this.hoverMs -= dtMs;
            // small bob
            this.sprite.y += Math.sin(this.scene.time.now / 180) * 0.12;
            if (this.hoverMs <= 0) {
                this.startFiring(900, 110);
            }
        } else if (this.phase === 'firing') {
            this.fireMs -= dtMs;
            this.fireCooldownMs -= dtMs;

            if (this.fireCooldownMs <= 0) {
                this.fireOnce();
                this.fireCooldownMs = this.fireEveryMs;
            }

            if (this.fireMs <= 0) {
                // Accelerate past Santa off to the side
                const vy = Phaser.Math.Between(-120, 120);
                this.startExit(-1200, vy);
            }
        } else if (this.phase === 'exit') {
            this.sprite.x += this.vx * dt;
            this.sprite.y += this.vy * dt;
        }
    }

    isOffscreen() {
        if (!this.sprite || !this.sprite.active) return true;
        const w = this.scene.cameras.main.width;
        const h = this.scene.cameras.main.height;
        return (
            this.sprite.x < -this.sprite.displayWidth - 50 ||
            this.sprite.x > w + this.sprite.displayWidth + 50 ||
            this.sprite.y < -this.sprite.displayHeight - 50 ||
            this.sprite.y > h + this.sprite.displayHeight + 50
        );
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


