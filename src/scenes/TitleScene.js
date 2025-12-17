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

        // Background
        this.add.rectangle(0, 0, w, h, 0x0b1020).setOrigin(0);
        this.add.rectangle(0, h * 0.62, w, h * 0.38, 0x14243a).setOrigin(0);

        // Title
        this.add.text(w / 2, h * 0.22, 'SANTA SURVIVAL', {
            fontSize: '72px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(w / 2, h * 0.31, 'Deliver presents. Dodge the night.', {
            fontSize: '24px',
            fill: '#d6e6ff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0.95);

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
        }).setOrigin(1, 0.5).setAlpha(0.95);
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
            .setStrokeStyle(2, 0xffffff, 0.12);

        this.leaderboardTitle = this.add.text(panelX - panelW / 2, panelY - panelH + 20, 'LEADERBOARD (Top 10)', {
            fontSize: '20px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5, 0.5).setAlpha(0.95);

        this.leaderboardText = this.add.text(panelX - panelW / 2, panelY - panelH + 44, 'Loading...', {
            fontSize: '18px',
            fill: '#d6e6ff',
            stroke: '#000',
            strokeThickness: 4,
            lineSpacing: 6
        }).setOrigin(0.5, 0).setAlpha(0.95);

        const makeButton = ({ y, label, enabled, onClick }) => {
            const bw = 420;
            const bh = 70;
            const bg = enabled ? 0x1f6feb : 0x3a3a3a;
            const alpha = enabled ? 0.95 : 0.35;

            const r = this.add.rectangle(w / 2, y, bw, bh, bg, alpha).setOrigin(0.5);
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
            }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.5);

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
        }).setOrigin(0, 0.5).setAlpha(0.85);

        // Initialize name display + fetch leaderboard
        this.refreshNameLabel();
        this.refreshLeaderboard();
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
            const rows = await fetchTopScores({ limit: 10 });
            const lines = rows.map((r, i) => `${String(i + 1).padStart(2, ' ')}. ${String(r.name).slice(0, 24)} — ${r.score}`);
            this.leaderboardText?.setText(lines.length ? lines.join('\n') : 'No scores yet.');
        } catch (e) {
            const msg = (e && typeof e.message === 'string') ? e.message : String(e);
            this.leaderboardText?.setText(`Leaderboard unavailable.\n${msg}`);
        }
    }
}


