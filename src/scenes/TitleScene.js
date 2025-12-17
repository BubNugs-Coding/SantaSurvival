export default class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    preload() {
        // Preload music so we can start it on the World 1 click (user gesture) to satisfy autoplay rules.
        this.load.audio('music_santa', './music/SantaSurvival.mp3');
        this.load.audio('music_forest', './music/WendigoForest.mp3');
        this.load.audio('music_jet', './music/Jet Encounter.mp3');
        this.load.audio('music_elite', './music/Elite Jet Encounter.mp3');
        this.load.audio('music_krampus', './music/Krampus.mp3');
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        try {
            // Menu should be silent (stop any lingering music from gameplay)
            try {
                this.sound?.stopAll();
            } catch (e) {
                // ignore
            }

            // Lazy import leaderboard (won't crash the menu if firebase isn't configured)
            this.leaderboardLoaded = false;
            this.leaderboardError = '';
            this.leaderboardRows = [];

            // Background (sky + snow ground)
            const skyH = Math.floor(h * 0.66);
            const groundH = h - skyH;

            // Sky base + subtle vertical gradient
            this.add.rectangle(0, 0, w, skyH, 0x0b2a57).setOrigin(0);
            this.add.rectangle(0, 0, w, skyH * 0.72, 0x1f63b5, 0.18).setOrigin(0);
            this.add.rectangle(0, 0, w, skyH * 0.42, 0x5aa7ff, 0.10).setOrigin(0);

            // Snow ground (brighter + slightly tinted horizon)
            this.add.rectangle(0, skyH, w, groundH, 0xf5fbff).setOrigin(0);
            this.add.rectangle(0, skyH, w, Math.max(18, groundH * 0.22), 0xd9ecff, 0.65).setOrigin(0);

            // Decorative boundary + ground speckles should never be able to break the menu
            try {
                // Soft boundary drift between sky and snow
                const boundary = this.add.graphics();
                boundary.fillStyle(0xffffff, 0.08);
                boundary.beginPath();
                boundary.moveTo(0, skyH);
                const waveAmp = 10;
                const waveLen = 120;
                for (let x = 0; x <= w + waveLen; x += waveLen) {
                    boundary.quadraticCurveTo(x + waveLen * 0.25, skyH - waveAmp, x + waveLen * 0.5, skyH);
                    boundary.quadraticCurveTo(x + waveLen * 0.75, skyH + waveAmp, x + waveLen, skyH);
                }
                boundary.lineTo(w, skyH + 22);
                boundary.lineTo(0, skyH + 22);
                boundary.closePath();
                boundary.fillPath();

                // Light snow texture on the ground (tiny speckles)
                const groundSpeck = this.add.graphics();
                groundSpeck.fillStyle(0xffffff, 0.08);
                for (let i = 0; i < Math.floor(w * 0.08); i++) {
                    const x = Math.random() * w;
                    const y = skyH + Math.random() * groundH;
                    const r = 1 + Math.random() * 2;
                    groundSpeck.fillCircle(x, y, r);
                }
            } catch (e) {
                // ignore
            }

            // Title
            this.add.text(w / 2, h * 0.22, 'SANTA SURVIVAL', {
                fontSize: '72px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 10
            }).setOrigin(0.5).setDepth(100);

            this.add.text(w / 2, h * 0.31, 'Deliver presents. Dodge the night.', {
                fontSize: '24px',
                fill: '#d6e6ff',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5).setAlpha(0.95).setDepth(100);

            // Leaderboard panel (bottom-right) + name label above it
            const panelW = 420;
            const panelH = 220;
            const pad = 26;
            const panelRight = w - pad;
            const panelBottom = h - pad;

            this.nameText = this.add.text(panelRight, panelBottom - panelH - 18, 'Name: (click to set)', {
                fontSize: '20px',
                fill: '#ffffff',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(1, 0.5).setAlpha(0.95).setDepth(100);
            this.nameText.setInteractive({ useHandCursor: true });
            this.nameText.on('pointerdown', async () => {
                const { getPlayerName, setPlayerName } = await import('../services/leaderboard.js');
                const current = getPlayerName() || '';
                const next = prompt('Enter display name (max 24 chars):', current) || '';
                const clean = setPlayerName(next);
                this.nameText.setText(`Name: ${clean || '(click to set)'}`);
                // Refresh leaderboard after name change (optional)
                this.refreshLeaderboard();
            });

            const panelX = panelRight;
            const panelY = panelBottom;
            this.leaderboardPanel = this.add
                .rectangle(panelX, panelY, panelW, panelH, 0x000000, 0.25)
                .setOrigin(1, 1)
                .setStrokeStyle(2, 0xffffff, 0.12)
                .setDepth(100);

            this.leaderboardTitle = this.add.text(panelX - panelW / 2, panelY - panelH + 20, 'LEADERBOARD (Top 10)', {
                fontSize: '20px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5, 0.5).setAlpha(0.95).setDepth(100);

            this.leaderboardText = this.add.text(panelX - panelW / 2, panelY - panelH + 44, 'Loading...', {
                fontSize: '18px',
                fill: '#d6e6ff',
                stroke: '#000',
                strokeThickness: 4,
                lineSpacing: 6
            }).setOrigin(0.5, 0).setAlpha(0.95).setDepth(100);

            const makeButton = ({ y, label, enabled, onClick }) => {
                const bw = 420;
                const bh = 70;
                const bg = enabled ? 0x1f6feb : 0x3a3a3a;
                const alpha = enabled ? 0.95 : 0.35;

                const r = this.add.rectangle(w / 2, y, bw, bh, bg, alpha).setOrigin(0.5).setDepth(100);
                r.setStrokeStyle(3, 0xffffff, enabled ? 0.35 : 0.12);

                const fontSize = label.length > 16 ? '22px' : '32px';
                const t = this.add.text(w / 2, y, label, {
                    fontSize,
                    fill: '#ffffff',
                    fontStyle: 'bold',
                    stroke: '#000',
                    strokeThickness: 6,
                    align: 'center',
                    wordWrap: { width: bw - 30, useAdvancedWrap: true }
                }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.5).setDepth(100);

                if (enabled) {
                    r.setInteractive({ useHandCursor: true });
                    r.on('pointerdown', () => onClick?.());
                }

                return { r, t };
            };

            makeButton({
                y: h * 0.52,
                label: 'WORLD 1',
                enabled: true,
                onClick: () => {
                    // Explicitly unlock audio on this user gesture so GameScene can start music immediately.
                    try {
                        if (this.sound?.locked) this.sound.unlock();
                    } catch (e) {
                        // ignore
                    }
                    // Start base music now (will be paused by the initial tooltip and resumed after).
                    try {
                        const existing = this.sound.get?.('music_santa');
                        const s = existing || this.sound.add('music_santa', { loop: true, volume: 0.65 });
                        if (!s.isPlaying) s.play({ loop: true, volume: 0.65 });
                        else s.setVolume?.(0.65);
                    } catch (e) {
                        // ignore
                    }
                    // Ensure player has a name (optional but recommended)
                    import('../services/leaderboard.js').then(({ getPlayerName, setPlayerName }) => {
                        const n = getPlayerName();
                        if (!n) {
                            const next = prompt('Enter display name (max 24 chars):', '') || '';
                            const clean = setPlayerName(next);
                            this.nameText.setText(`Name: ${clean || '(click to set)'}`);
                        }
                    }).catch(() => {});

                    this.scene.start('GameScene', { startMusic: true });
                }
            });

            const kinUnlocked = this.registry?.get?.('ss_unlock_kin') === true;

            makeButton({
                y: h * 0.64,
                label: kinUnlocked ? "KRAMPUS' INFINITE NIGHT" : "KRAMPUS' INFINITE NIGHT (LOCKED - BEAT WORLD 1)",
                enabled: kinUnlocked,
                onClick: () => {
                    if (!kinUnlocked) return;
                    try {
                        if (this.sound?.locked) this.sound.unlock();
                    } catch (e) {}
                    // Ensure base music is running (KIN uses SantaSurvival)
                    try {
                        const existing = this.sound.get?.('music_santa');
                        const s = existing || this.sound.add('music_santa', { loop: true, volume: 0.65 });
                        if (!s.isPlaying) s.play({ loop: true, volume: 0.65 });
                        else s.setVolume?.(0.65);
                    } catch (e) {}
                    this.scene.start('GameScene', { startMusic: true, mode: 'kin' });
                }
            });

            // Keep the tip away from the bottom-right leaderboard panel
            this.add.text(24, h - 22, 'Tip: Press Space to pause.', {
                fontSize: '18px',
                fill: '#cbd5e1',
                stroke: '#000',
                strokeThickness: 5
            }).setOrigin(0, 0.5).setAlpha(0.85).setDepth(100);

            // Snowfall (particles) behind UI - fail-safe so the menu never breaks
            try {
                if (!this.textures.exists('snowflake')) {
                    const g = this.make.graphics({ x: 0, y: 0, add: false });
                    g.fillStyle(0xffffff, 1);
                    g.fillCircle(4, 4, 3);
                    g.generateTexture('snowflake', 8, 8);
                    g.destroy();
                }

                const particles = this.add.particles(0, 0, 'snowflake', {
                    x: { min: -30, max: w + 30 },
                    y: { min: -20, max: -5 },
                    lifespan: { min: 3500, max: 6500 },
                    quantity: 3,
                    frequency: 24,
                    speedY: { min: 90, max: 240 },
                    speedX: { min: -50, max: 50 },
                    scale: { min: 0.35, max: 1.0 },
                    alpha: { min: 0.35, max: 0.9 },
                    rotate: { min: 0, max: 180 }
                });
                particles.setDepth(50);
            } catch (e) {
                // ignore (menu should still render)
            }

            // Initialize name display + fetch leaderboard
            this.refreshNameLabel();
            this.refreshLeaderboard();
        } catch (e) {
            // If anything goes wrong, show it on-screen (and in console) so we never "lose" the menu silently.
            // eslint-disable-next-line no-console
            console.error('TitleScene.create failed:', e);
            const msg = (e && typeof e.message === 'string') ? e.message : String(e);
            this.add.rectangle(0, 0, w, h, 0x000000, 0.65).setOrigin(0).setDepth(1000);
            this.add.text(20, 20, `Title menu error:\n${msg}`, {
                fontSize: '18px',
                fill: '#ffffff',
                stroke: '#000',
                strokeThickness: 4,
                wordWrap: { width: w - 40 }
            }).setDepth(1001);
        }
    }

    async refreshNameLabel() {
        try {
            const { getPlayerName } = await import('../services/leaderboard.js');
            const n = getPlayerName();
            this.nameText?.setText(`Name: ${n || '(click to set)'}`);
        } catch (e) {
            this.nameText?.setText('Name: (leaderboard disabled)');
        }
    }

    async refreshLeaderboard() {
        try {
            const { fetchTopScores } = await import('../services/leaderboard.js');
            const rows = await fetchTopScores({ limit: 10, excludeModes: ['kin'] });
            const lines = rows.map((r, i) => `${String(i + 1).padStart(2, ' ')}. ${String(r.name).slice(0, 24)} — ${r.score}`);
            this.leaderboardText?.setText(lines.length ? lines.join('\n') : 'No scores yet.');
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : String(e);
            this.leaderboardText?.setText(`Leaderboard unavailable.\n${msg}`);
        }
    }
}


