import HomingMissile from './HomingMissile.js';

export default class EliteJet {
    constructor(scene, x, y, opts = {}) {
        this.scene = scene;
        this.missiles = opts.missilesList;
        this.santaSprite = opts.santaSprite;

        this.sprite = scene.add.image(x, y, 'elitejet').setOrigin(0.5, 0.5);
        this.sprite.setDepth(9);
        this.sprite.setScale(0.20);
        this.sprite.setFlipX(false); // facing left by default

        // Ensure it starts fully off-screen to the right (default), then slides in while cloaked.
        // Some spawners (e.g., Krampus chain) can override this to spawn at an explicit position.
        const w = scene.cameras.main.width;
        this.hoverX = typeof opts.hoverX === 'number' ? opts.hoverX : (w - 160);
        const forceOffscreen = opts.forceOffscreen !== false;
        if (forceOffscreen) {
            this.sprite.x = w + this.sprite.displayWidth / 2 + 40;
        }

        this.phase = 'cloakIn'; // cloakIn -> decloakFire -> visible -> cloakExit -> exiting -> done
        this.timerMs = Phaser.Math.Between(1000, 2000); // initial cloak time

        this.vx = 0;
        this.vy = 0;
        this.setCloaked(true);
    }

    setCloaked(cloaked) {
        this.cloaked = cloaked;
        if (!this.sprite) return;
        if (cloaked) {
            this.sprite.setAlpha(0.18);
            this.sprite.setTint(0xaaffff);
        } else {
            this.sprite.setAlpha(1);
            this.sprite.clearTint();
        }
    }

    fireMissile() {
        if (!Array.isArray(this.missiles) || !this.sprite?.active) return;
        const m = new HomingMissile(this.scene, this.sprite.x - 30, this.sprite.y, this.santaSprite);
        this.missiles.push(m);
    }

    update(deltaMs) {
        if (!this.sprite || !this.sprite.active) return;
        const dtMs = (deltaMs ?? this.scene.game.loop.delta);
        const dt = dtMs / 1000;

        // Shimmer while cloaked
        if (this.cloaked) {
            const a = 0.10 + (Math.sin(this.scene.time.now / 120) * 0.08 + 0.08);
            this.sprite.setAlpha(Phaser.Math.Clamp(a, 0.08, 0.25));
        }

        if (this.phase === 'cloakIn') {
            // slide into view while cloaked
            this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.hoverX, 0.06);

            this.timerMs -= dtMs;
            if (this.timerMs <= 0) {
                this.phase = 'decloakFire';
                this.setCloaked(false);
                // Fire immediately on decloak
                this.fireMissile();
                // Stay visible for 5s
                this.timerMs = 5000;
                this.phase = 'visible';
            }
        } else if (this.phase === 'visible') {
            // hold roughly near hoverX while visible
            this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.hoverX, 0.08);

            this.timerMs -= dtMs;
            if (this.timerMs <= 0) {
                // cloak again then exit left
                this.setCloaked(true);
                this.phase = 'exiting';
                this.vx = -900;
                this.vy = Phaser.Math.Between(-120, 120);
            }
        } else if (this.phase === 'exiting') {
            this.sprite.x += this.vx * dt;
            this.sprite.y += this.vy * dt;
        }
    }

    isOffLeft() {
        if (!this.sprite || !this.sprite.active) return true;
        return this.sprite.x < -this.sprite.displayWidth - 80;
    }

    destroy() {
        if (this.sprite) this.sprite.destroy();
    }
}


