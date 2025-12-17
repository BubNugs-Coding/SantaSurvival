import Santa from '../entities/Santa.js';
import House from '../entities/House.js';
import WashingtonBuilding from '../entities/WashingtonBuilding.js';
import FighterJet from '../entities/FighterJet.js';
import ElfBalloon from '../entities/ElfBalloon.js';
import ReindeerPickup from '../entities/ReindeerPickup.js';
import ReindeerProjectile from '../entities/ReindeerProjectile.js';
import Area51Building from '../entities/Area51Building.js';
import EliteJet from '../entities/EliteJet.js';
import CoalLauncherPickup from '../entities/CoalLauncherPickup.js';
import CoalProjectile from '../entities/CoalProjectile.js';
import CoalSmokeCloud from '../entities/CoalSmokeCloud.js';
import Wendigo from '../entities/Wendigo.js';
import ShieldPickup from '../entities/ShieldPickup.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this._startMusicOnCreate = !!data?.startMusic;
        this.mode = data?.mode === 'kin' ? 'kin' : 'world1';
    }

    preload() {
        // Player sprite (user-provided)
        // Path is relative to `index.html` (project root) when served via http-server
        this.load.image('santa', './images/santa.png');
        this.load.image('cloud', './images/cloud.png');
        this.load.image('washington', './images/washington.png');
        this.load.image('basicjet', './images/basicjet.png');
        this.load.image('house', './images/house.png');
        this.load.image('vegashouse', './images/vegashouse.png');
        this.load.image('cabin', './images/cabin.png');
        this.load.image('balloon', './images/balloon.png');
        this.load.image('present', './images/present.png');
        this.load.image('reindeer', './images/reindeer.png');
        this.load.image('area51', './images/area51.png');
        this.load.image('elitejet', './images/elitejet.png');
        this.load.image('coallauncher', './images/coallauncher.png');
        this.load.image('pinetree', './images/pinetree.png');
        this.load.image('wendigo', './images/wendigo.png');
        this.load.image('cave', './images/cave.png');
        this.load.image('krampus', './images/krampus.png');

        // Music
        this.load.audio('music_santa', './music/SantaSurvival.mp3');
        this.load.audio('music_forest', './music/WendigoForest.mp3');
        this.load.audio('music_jet', './music/Jet Encounter.mp3');
        this.load.audio('music_elite', './music/Elite Jet Encounter.mp3');
        this.load.audio('music_krampus', './music/Krampus.mp3');
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);

        // Mode defaults
        if (!this.mode) this.mode = 'world1';
        this.isKIN = this.mode === 'kin';
        this.baseSpeedScale = this.isKIN ? 1.5 : 1.0;

        // Theme / background layers
        this.theme = 'snow';
        this.biome = this.isKIN ? 'wasteland' : 'snow'; // snow | vegas | forest | wasteland
        // snow | vegas | forest | wasteland
        this.bg = {
            w,
            h,
            skyH,
            sky: null,
            ground: null,
            horizon: null,
            clouds: [],
            deco: []
        };
        this.createSnowBackground();
        if (this.isKIN) {
            this.switchToWastelandBackground();
        }

        // Game state
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameWon = false;
        this.scoreSubmitted = false;
        this.gamePaused = false;
        this.manualPaused = false; // Space toggles this
        this.tooltipPaused = false; // tutorial tooltips temporarily pause this

        // Music state (starts on first user gesture due to browser autoplay rules)
        this.musicStarted = false;
        this.baseMusicKey = null; // 'music_santa' | 'music_forest'
        this.baseMusic = null;
        this.jetEncounterMusic = null;
        this.eliteEncounterMusic = null;
        this.krampusMusic = null;
        this.jetEncounterActive = false;
        this.eliteEncounterActive = false;
        this.baseTargetVol = 0.65;
        // During encounters, we fully fade out the base track (true crossfade)
        this.duckedBaseVol = 0.0;
        this.encounterVol = 0.85;
        this.eliteEncounterVol = this.encounterVol * 0.7; // 30% quieter than normal encounter
        this.krampusTargetVol = 0.36; // 60% quieter than prior (0.9 -> 0.36)
        this.musicPausedByGame = false;
        this.pendingStartMusic = false; // queued until unpaused
        this.pendingKrampusStart = false; // queued until unpaused (dev teleport)
        this.krampusLoopSeekSec = 18;
        this._krampusOnComplete = null;
        this.krampusChainExtendMs = 840; // half speed vs previous
        this.krampusChainHoldMs = 2000; // per spec
        this.krampusChainRetractMs = 1640; // half speed vs previous

        // Dev laser (hold L) - only active when dev mode (hitboxes) is enabled
        this.devLaserCooldownMs = 500;
        this.devLaserTickMs = 0;
        this.devLaserGfx = this.add.graphics().setDepth(14).setVisible(false);

        // KIN: periodic Krampus attacks (no boss)
        this.kinNextAttackAt = 0;
        this.kinAttackEveryMs = 10000;

        // Krampus boss (wasteland 225+)
        this.wastelandEnteredAt = null;
        this.krampusSpawnAt = null;
        this.krampus = null;
        this.krampusDefeated = false;
        this.krampusHp = 20;
        this.krampusMaxHp = 20;
        this.krampusNextAttackAt = 0;
        this.krampusSnowstormUntil = 0;
        this.krampusSnowstormOverlay = null;
        this.krampusChain = null; // { sprite, y, endAt, type }
        this.krampusIcicles = []; // [{top,bottom}]
        this.krampusWindGusts = []; // [{rect}]
        this.krampusSlowUntil = 0;

        // Krampus HP bar UI (right side)
        this.krampusHpBg = this.add.rectangle(w - 14, h / 2, 12, Math.floor(h * 0.62), 0x000000, 0.55).setOrigin(0.5).setDepth(250).setVisible(false);
        this.krampusHpFill = this.add.rectangle(w - 14, h / 2 + Math.floor(h * 0.62) / 2, 10, Math.floor(h * 0.62) - 4, 0xff4466, 0.95).setOrigin(0.5, 1).setDepth(251).setVisible(false);

        // Dev mode: hitbox debug overlay (toggle with Right Option / AltRight)
        this.showHitboxes = false;
        this.hitboxGfx = this.add.graphics().setDepth(2000).setVisible(false);
        this.speedScale = 1; // dev speed multiplier (only adjustable when hitboxes are on)

        // NOTE: Do NOT put our wrapper classes (House, etc) into Phaser Groups.
        // Phaser Groups expect Phaser.GameObjects (EventEmitters). Our wrappers are plain objects.
        // Using arrays avoids the `t.on is not a function` crash when the first house spawns.
        this.houses = [];
        this.washingtonBuildings = [];
        this.housesPassed = 0;
        this.washingtonSpawned = false;
        this.washingtonEnteredView = false;
        this.primaryWashingtonBuilding = null;

        // Jets / bullets
        this.jets = [];
        this.flybyJets = [];
        this.bullets = [];
        this.jetWaveActive = false;
        this.postWaveHouseStart = null;
        this.flybyShownThisCycle = false;
        // If a reindeer downs a jet, it stays down permanently.
        this.jetsRemaining = 2;

        // Elf balloons (present restock)
        this.balloons = [];
        this.nextBalloonAt = 0; // housesPassed threshold (set once Washington is in play or immediately)

        // Area 51 / elite jet event (Vegas zone)
        this.area51Spawned = false;
        this.area51EnteredView = false;
        this.area51Buildings = [];
        this.eliteJets = [null, null]; // two EliteJet instances
        this.eliteMissiles = []; // HomingMissile instances
        this.nextEliteAt = [null, null]; // housesPassed threshold for each jet's next appearance
        this.eliteJetDowned = [false, false]; // permanently removed when taken down

        // Reindeer mechanic
        this.reindeerUnlocked = 0; // max 3 (how many pickups collected)
        this.reindeerAttachedSprites = []; // available launches
        this.reindeerPickup = null;
        this.nextReindeerAt = 40; // first spawn after 40 houses passed
        this.reindeerProjectiles = [];
        this.reindeerRechargeNeeded = 0; // number of launched reindeer to restore
        this.reindeerRechargeProgress = 0; // 0..5 for current restore
        this.reindeerShotCooldownMs = 500;
        this.reindeerShotCooldownLeftMs = 0;

        // Coal launcher (single)
        this.coalLauncherMounted = false;
        this.coalLauncherPickup = null;
        this.nextCoalAt = 105; // first spawn at 105 houses
        this.nextCoalRespawnAt = null; // housesPassed threshold if missed
        this.coalCooldownMs = 8000;
        this.coalCooldownLeftMs = 0;
        this.coalProjectiles = [];
        this.coalSmokeClouds = [];

        // Wendigo forest (150–225)
        this.wendigos = [];
        this.dirtBalls = [];
        this.nextWendigoAt = null;
        this.forestTrees = [];

        // Bubble shield (pickup at 200)
        this.shieldUnlocked = false;
        this.shieldPickup = null;
        this.shieldSpawned = false;
        // Energy represents *usable shield time* (0..shieldMaxActiveMs), and recharges back to full over shieldRechargeMs.
        this.shieldEnergyMs = 0; // 0..shieldMaxActiveMs
        this.shieldRechargeMs = 15000; // time to refill from 0 -> full
        this.shieldMaxActiveMs = 3000; // max usable shield time when full
        this.shieldActive = false;
        this.shieldDepletedLockout = false; // if fully depleted, must recharge to full before reuse
        this.shieldHoldExceeded = false; // if held too long, must release before recharging/using
        this.tutorialShieldShown = false;

        // Create Santa
        this.santa = new Santa(this, 100, this.cameras.main.height / 2);

        // KIN starting loadout: 1 reindeer, coal cannon, bubble shield; no pickups
        if (this.isKIN) {
            this.reindeerUnlocked = 1;
            this.reindeerAttachedSprites = [];
            this.attachReindeer();

            this.coalLauncherMounted = true;
            this.coalCooldownLeftMs = 0;

            this.shieldUnlocked = true;
            this.shieldEnergyMs = this.shieldMaxActiveMs;
            this.shieldDepletedLockout = false;
            this.shieldHoldExceeded = false;

            // KIN: allow elf balloons, but disable other pickups/spawns
            this.nextBalloonAt = 0;
            this.nextReindeerAt = Number.POSITIVE_INFINITY;
            this.nextCoalAt = Number.POSITIVE_INFINITY;
            this.nextCoalRespawnAt = null;
            this.shieldSpawned = true;
            this.shieldPickup = null;
        }

        // Spawn timers
        this.houseSpawnTimer = 0;
        this.houseSpawnInterval = 1800; // Spawn house every 1.8 seconds

        // UI Elements with better styling (keep above backgrounds even after biome switches)
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '28px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setDepth(200);

        this.livesText = this.add.text(16, 50, 'Lives: 3', {
            fontSize: '28px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setDepth(200);
        // Jets are enabled now
        this.livesText.setVisible(true);

        this.presentsText = this.add.text(16, 84, 'Presents: 10/10', {
            fontSize: '28px',
            fill: '#fff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setDepth(200);

        // Reindeer recharge bar (only visible after a reindeer has been launched)
        this.reindeerBarBg = this.add.rectangle(0, 0, 64, 10, 0x000000, 0.45).setOrigin(0.5).setDepth(200).setVisible(false);
        this.reindeerBarFill = this.add.rectangle(0, 0, 62, 8, 0x00ff66, 0.85).setOrigin(0.5).setDepth(201).setVisible(false);

        // Game over text (initially hidden)
        this.gameOverText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'GAME OVER\nClick to return to Title', {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setVisible(false);

        // Win overlay (Krampus defeated)
        this.winBackdrop = this.add.rectangle(0, 0, w, h, 0x000000, 0.45).setOrigin(0).setDepth(1200).setVisible(false);
        this.winText = this.add.text(w / 2, h / 2, 'YOU WIN!\nClick to return to Title', {
            fontSize: '52px',
            fill: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(1201).setVisible(false);

        // Pause overlay
        this.pauseBackdrop = this.add
            .rectangle(0, 0, w, h, 0x000000, 0.35)
            .setOrigin(0)
            .setDepth(1000)
            .setVisible(false);
        this.pauseText = this.add
            .text(w / 2, h / 2, 'PAUSED\nPress Space to resume', {
                fontSize: '48px',
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                stroke: '#000',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(1001)
            .setVisible(false);

        // Tutorial tooltip overlay (auto-pauses for a few seconds)
        this.tooltipBackdrop = this.add
            .rectangle(0, 0, w, h, 0x000000, 0.45)
            .setOrigin(0)
            .setDepth(1500)
            .setVisible(false);
        this.tooltipPanel = this.add
            .rectangle(w / 2, h / 2, Math.min(760, w - 120), 190, 0x000000, 0.62)
            .setOrigin(0.5)
            .setDepth(1501)
            .setStrokeStyle(3, 0xffffff, 0.35)
            .setVisible(false);
        this.tooltipText = this.add
            .text(w / 2, h / 2, '', {
                fontSize: '30px',
                fill: '#ffffff',
                fontStyle: 'bold',
                align: 'center',
                wordWrap: { width: Math.min(700, w - 160), useAdvancedWrap: true },
                stroke: '#000',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(1502)
            .setVisible(false);

        // Tutorial flags (one-time tooltips)
        this.tutorialStartShown = false;
        this.tutorialBalloonShown = false;
        this.tutorialReindeerShown = false;
        this.tutorialCoalShown = false;

        // Dev pause menu (only shows when paused AND dev mode is enabled)
        this.devMenu = this.add.container(0, 0).setDepth(1400).setVisible(false);
        this.devMenuBackdrop = this.add.rectangle(0, 0, w, h, 0x000000, 0.20).setOrigin(0);
        this.devMenuPanel = this.add
            .rectangle(w / 2, h / 2, Math.min(920, w - 80), 360, 0x0a0a0a, 0.70)
            .setOrigin(0.5)
            .setStrokeStyle(3, 0xffffff, 0.25);
        this.devMenuTitle = this.add
            .text(w / 2, h / 2 - 150, 'DEV MENU', {
                fontSize: '28px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 6
            })
            .setOrigin(0.5);
        this.devMenuHint = this.add
            .text(w / 2, h / 2 - 118, 'Click an icon to grant a pickup or spawn an enemy.', {
                fontSize: '18px',
                fill: '#ffffff',
                stroke: '#000',
                strokeThickness: 4
            })
            .setOrigin(0.5)
            .setAlpha(0.9);

        const makeIcon = ({ x, y, key, label, onClick, scale = 0.12, tint = null }) => {
            const icon = this.add.image(x, y, key).setOrigin(0.5).setScale(scale);
            if (tint) icon.setTint(tint);
            icon.setInteractive({ useHandCursor: true });
            icon.on('pointerdown', () => {
                try {
                    onClick?.();
                } catch (e) {
                    // ignore dev menu errors
                }
            });
            const t = this.add
                .text(x, y + 44, label, {
                    fontSize: '14px',
                    fill: '#ffffff',
                    stroke: '#000',
                    strokeThickness: 4
                })
                .setOrigin(0.5);
            return { icon, t };
        };

        const makeCircleIcon = ({ x, y, radius = 18, color = 0x66e0ff, alpha = 0.65, label, onClick }) => {
            const c = this.add.circle(x, y, radius, color, alpha).setOrigin(0.5);
            const inner = this.add.circle(x, y, radius * 0.7, 0xffffff, 0.10).setOrigin(0.5);
            c.setInteractive({ useHandCursor: true });
            c.on('pointerdown', () => {
                try {
                    onClick?.();
                } catch (e) {
                    // ignore dev menu errors
                }
            });
            inner.setInteractive({ useHandCursor: true });
            inner.on('pointerdown', () => {
                try {
                    onClick?.();
                } catch (e) {
                    // ignore dev menu errors
                }
            });
            const t = this.add
                .text(x, y + 44, label, {
                    fontSize: '14px',
                    fill: '#ffffff',
                    stroke: '#000',
                    strokeThickness: 4
                })
                .setOrigin(0.5);
            return { c, inner, t };
        };

        const makeButton = ({ x, y, w: bw, h: bh, label, onClick }) => {
            const r = this.add.rectangle(x, y, bw, bh, 0x1b1b1b, 0.75).setOrigin(0.5);
            r.setStrokeStyle(2, 0xffffff, 0.20);
            r.setInteractive({ useHandCursor: true });
            r.on('pointerdown', () => {
                try {
                    onClick?.();
                } catch (e) {
                    // ignore dev menu errors
                }
            });
            const t = this.add.text(x, y, label, {
                fontSize: '14px',
                fill: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5);
            return { r, t };
        };

        const leftX = w / 2 - 360;
        const rowY = h / 2 - 40;
        const col = 120;

        // Pickups
        const pickupsLabel = this.add
            .text(leftX, h / 2 - 88, 'PICKUPS', {
                fontSize: '16px',
                fill: '#ffd27a',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            })
            .setOrigin(0.5);

        const p1 = makeIcon({
            x: leftX - col,
            y: rowY,
            key: 'balloon',
            label: 'Restock',
            scale: 0.20,
            onClick: () => this.devGrantPickup('balloon')
        });
        const p2 = makeIcon({
            x: leftX,
            y: rowY,
            key: 'reindeer',
            label: 'Reindeer',
            scale: 0.12,
            onClick: () => this.devGrantPickup('reindeer')
        });
        const p3 = makeIcon({
            x: leftX + col,
            y: rowY,
            key: 'coallauncher',
            label: 'Coal Cannon',
            scale: 0.11,
            onClick: () => this.devGrantPickup('coal')
        });
        const p4 = makeCircleIcon({
            x: leftX + col * 2,
            y: rowY,
            radius: 18,
            color: 0x66e0ff,
            alpha: 0.70,
            label: 'Shield',
            onClick: () => this.devGrantPickup('shield')
        });

        // Enemies
        const rightX = w / 2 + 240;
        const enemiesLabel = this.add
            .text(rightX, h / 2 - 88, 'ENEMIES', {
                fontSize: '16px',
                fill: '#ff6b6b',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            })
            .setOrigin(0.5);

        const e1 = makeIcon({
            x: rightX - col,
            y: rowY,
            key: 'basicjet',
            label: 'Jet',
            scale: 0.12,
            onClick: () => this.devSpawnEnemy('basicjet')
        });
        const e2 = makeIcon({
            x: rightX,
            y: rowY,
            key: 'elitejet',
            label: 'Elite Jet',
            scale: 0.14,
            onClick: () => this.devSpawnEnemy('elitejet')
        });
        const e3 = makeIcon({
            x: rightX + col,
            y: rowY,
            key: 'wendigo',
            label: 'Wendigo',
            scale: 0.14,
            onClick: () => this.devSpawnEnemy('wendigo')
        });

        // Teleport to stage
        const stageLabel = this.add
            .text(w / 2, h / 2 + 58, 'TELEPORT TO STAGE', {
                fontSize: '16px',
                fill: '#7bdcff',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
            })
            .setOrigin(0.5);

        const btnY = h / 2 + 98;
        const b1 = makeButton({ x: w / 2 - 240, y: btnY, w: 140, h: 34, label: 'Snowy Suburbs', onClick: () => this.devTeleportStage('snow') });
        const b2 = makeButton({ x: w / 2 - 60, y: btnY, w: 120, h: 34, label: 'Vegas', onClick: () => this.devTeleportStage('vegas') });
        const b3 = makeButton({ x: w / 2 + 110, y: btnY, w: 160, h: 34, label: 'Wendigo Forest', onClick: () => this.devTeleportStage('forest') });
        const b4 = makeButton({ x: w / 2 + 280, y: btnY, w: 140, h: 34, label: 'Wasteland', onClick: () => this.devTeleportStage('wasteland') });

        // Assemble container
        this.devMenu.add([
            this.devMenuBackdrop,
            this.devMenuPanel,
            this.devMenuTitle,
            this.devMenuHint,
            pickupsLabel,
            enemiesLabel,
            p1.icon, p1.t,
            p2.icon, p2.t,
            p3.icon, p3.t,
            p4.c, p4.inner, p4.t,
            e1.icon, e1.t,
            e2.icon, e2.t,
            e3.icon, e3.t,
            stageLabel,
            b1.r, b1.t,
            b2.r, b2.t,
            b3.r, b3.t
            ,
            b4.r, b4.t
        ]);

        // Space toggles pause
        if (this.input && this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', () => {
                if (this.gameOver) return;
                this.togglePause();
            });

            // Right Option (AltRight) toggles hitboxes
            this.input.keyboard.on('keydown-ALT', (event) => {
                // Prefer right-side key, but fall back to any ALT if browser doesn't expose location reliably
                const isRightAlt = event?.code === 'AltRight' || event?.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT;
                if (isRightAlt) {
                    this.toggleHitboxes();
                }
            });

            // Use a Key object for Digit1 to launch reindeer (more reliable than event codes)
            this.keyLaunchReindeer = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
            this.keyFireCoal = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
            this.keyShield = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
            this.keyDevLaser = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);

            // Dev: I toggles invincibility (only when hitboxes/dev mode is on)
            this.input.keyboard.on('keydown-I', () => {
                if (!this.showHitboxes) return;
                if (!this.santa) return;
                const next = !this.santa.devInvincible;
                this.santa.setDevInvincible?.(next);
            });

            // Dev speed controls (only when hitboxes are enabled)
            this.input.keyboard.on('keydown-RIGHT', () => {
                if (!this.showHitboxes) return;
                this.speedScale = Math.min(4, this.speedScale + 0.25);
            });
            this.input.keyboard.on('keydown-DOWN', () => {
                if (!this.showHitboxes) return;
                this.speedScale = 1;
            });
        }

        // Mounted coal launcher sprite + cooldown ring (hidden until mounted)
        // Keep the cannon *under* the sleigh (Santa is depth 10)
        this.COAL_SCALE = 0.095;
        this.COAL_OFFSET_X = -12;   // tuck back so rear aligns with sleigh
        this.COAL_OFFSET_Y = 36;  // sit under sleigh
        this.COAL_MUZZLE_X = 16;  // projectile spawn offset from cannon center
        this.COAL_MUZZLE_Y = -1;

        this.coalSprite = this.add
            .image(0, 0, 'coallauncher')
            .setOrigin(0.5, 0.5)
            .setDepth(9)
            .setScale(this.COAL_SCALE)
            .setVisible(false);
        // Ring sits just above the cannon but still under the sleigh visuals
        this.coalCooldownGfx = this.add.graphics().setDepth(9.5).setVisible(false);

        // Shield bubble + energy bar UI (hidden until unlocked)
        this.shieldGfx = this.add.graphics().setDepth(13).setVisible(false);
        this.shieldBarBg = this.add.rectangle(0, 0, 70, 10, 0x000000, 0.45).setOrigin(0.5).setDepth(200).setVisible(false);
        // Fill is left-anchored so it doesn't "creep" as it shrinks
        this.shieldBarFill = this.add.rectangle(0, 0, 68, 8, 0x66e0ff, 0.85).setOrigin(0, 0.5).setDepth(201).setVisible(false);

        // Restart on click when game over
        // Use a simple approach - check for clicks in update() instead of event listeners
        // This avoids potential issues with Phaser's event system

        // Start-of-game tutorial popup
        this.showTooltip(
            'Deliver presents by flying over houses.\nAvoid enemy fire and keep moving!',
            2000
        );
        this.tutorialStartShown = true;

        // Arm music start on first interaction
        this.input.once('pointerdown', () => this.startMusicIfNeeded());
        this.input.keyboard?.once('keydown', () => this.startMusicIfNeeded());

        // If we came from the title screen button, start immediately (audio should be unlocked already)
        if (this._startMusicOnCreate) {
            // Don't start during the initial tooltip pause; queue it and start on resume.
            this.pendingStartMusic = true;
        }
    }

    update(time, delta) {
        // Handle restart click check here instead of event listener
        // Use sys.input to avoid potential Phaser internal errors
        try {
            if ((this.gameOver || this.gameWon) && this.sys.input && this.sys.input.activePointer && this.sys.input.activePointer.isDown) {
                this.scene.start('TitleScene');
                return;
            }
        } catch (e) {
            // Ignore input errors
        }
        
        if (this.gameOver) {
            return;
        }
        if (this.gameWon) {
            return;
        }

        if (this.gamePaused) {
            // Still keep music state synced while paused (so fades/stops happen immediately)
            this.updateMusic(false);
            // Still draw hitboxes while paused, if enabled
            this.drawHitboxes();
            return;
        }

        // Apply base mode speed + dev speed multiplier
        const scaledDelta = delta * (this.baseSpeedScale || 1) * (this.speedScale || 1);

        // Music follow state (stage + encounters)
        this.updateMusic(true);

        // Update Santa
        if (this.santa) this.santa.update();

        // Keep attached reindeer(s) positioned at the front of the sleigh
        if (this.santa && this.santa.sprite && this.santa.sprite.active) {
            const baseX = this.santa.sprite.x + 70;
            const baseY = this.santa.sprite.y + 5;
            // Clean up any destroyed sprites to avoid "hovering" leftovers
            this.reindeerAttachedSprites = this.reindeerAttachedSprites.filter((r) => r && r.active);
            for (let i = 0; i < this.reindeerAttachedSprites.length; i++) {
                const r = this.reindeerAttachedSprites[i];
                r.x = baseX + i * 34;
                r.y = baseY;
            }
        }

        // Position mounted coal launcher (under sleigh)
        if (this.coalLauncherMounted && this.santa?.sprite?.active) {
            this.coalSprite.setVisible(true);
            this.coalCooldownGfx.setVisible(true);
            // Tucked under sleigh
            this.coalSprite.x = this.santa.sprite.x + this.COAL_OFFSET_X;
            this.coalSprite.y = this.santa.sprite.y + this.COAL_OFFSET_Y;
        } else {
            this.coalSprite.setVisible(false);
            this.coalCooldownGfx.setVisible(false);
        }

        // Spawn houses
        this.houseSpawnTimer += scaledDelta;
        if (this.houseSpawnTimer >= this.houseSpawnInterval) {
            this.spawnHouse();
            this.houseSpawnTimer = 0;
        }

        // Update houses
        for (let i = this.houses.length - 1; i >= 0; i--) {
            const house = this.houses[i];
            if (!house || !house.sprite || !house.sprite.active) {
                if (house) house.destroy?.();
                this.houses.splice(i, 1);
                continue;
            }
            house.update(scaledDelta);
            if (house.sprite.x < -house.sprite.width) {
                house.destroy();
                this.houses.splice(i, 1);
                this.housesPassed++;
            }
        }

        // Coal launcher pickup spawn / respawn
        if (!this.coalLauncherMounted && !this.coalLauncherPickup) {
            if (this.housesPassed >= this.nextCoalAt) {
                this.spawnCoalLauncherPickup();
                // prevent re-triggering
                this.nextCoalAt = Number.POSITIVE_INFINITY;
            } else if (this.nextCoalRespawnAt !== null && this.housesPassed >= this.nextCoalRespawnAt) {
                this.spawnCoalLauncherPickup();
                this.nextCoalRespawnAt = null;
            }
        }

        // Update coal pickup
        if (this.coalLauncherPickup) {
            this.coalLauncherPickup.update(scaledDelta);
            if (this.coalLauncherPickup.isOffLeft()) {
                this.coalLauncherPickup.destroy();
                this.coalLauncherPickup = null;
                // missed: respawn after 10 houses
                this.nextCoalRespawnAt = this.housesPassed + 10;
            }
        }

        // Biome switching:
        // - snow: default
        // - vegas: 75–150
        // - forest (wendigo): 150–225
        // - wasteland: 225+
        let desiredBiome = this.isKIN ? 'wasteland' : 'snow';
        if (this.housesPassed >= 75 && this.housesPassed < 150) desiredBiome = 'vegas';
        if (this.housesPassed >= 150 && this.housesPassed < 225) desiredBiome = 'forest';
        if (this.housesPassed >= 225) desiredBiome = 'wasteland';
        if (this.isKIN) desiredBiome = 'wasteland';

        if (desiredBiome !== this.biome) {
            this.biome = desiredBiome;
            if (this.biome === 'vegas') {
                this.switchToDesertBackground();
            } else if (this.biome === 'forest') {
                this.switchToForestBackground();
                // start spawning immediately on entry
                this.nextWendigoAt = this.housesPassed;
            } else if (this.biome === 'wasteland') {
                this.switchToWastelandBackground();
                this.nextWendigoAt = null;
                // mark wasteland entry so krampus can spawn after 8 houses in this zone
                this.wastelandEnteredAt = this.housesPassed;
                this.krampusSpawnAt = this.housesPassed + 8;
            } else {
                this.createSnowBackground();
                this.nextWendigoAt = null;
            }
        }

        // Re-evaluate music after biome switches so track changes happen immediately
        this.updateMusic(true);

        // Spawn Krampus boss 8 houses into wasteland (225+) (not in KIN)
        if (!this.isKIN && this.biome === 'wasteland' && !this.krampusDefeated && !this.krampus && this.krampusSpawnAt !== null && this.housesPassed >= this.krampusSpawnAt) {
            this.spawnKrampus();
        }

        // Shield pickup spawn at 200 (not in KIN)
        if (!this.shieldUnlocked && !this.shieldPickup && !this.shieldSpawned && this.housesPassed >= 200) {
            this.spawnShieldPickup();
            this.shieldSpawned = true;
            if (!this.tutorialShieldShown) {
                this.tutorialShieldShown = true;
                this.showTooltip('Bubble Shield!\nHold 3 to shield (5s max). Recharges when you release.', 2000);
            }
        }

        if (this.shieldPickup) {
            this.shieldPickup.update(scaledDelta);
            if (this.shieldPickup.isOffLeft()) {
                this.shieldPickup.destroy();
                this.shieldPickup = null;
            }
        }

        // Shield energy + visuals (real-time, not speed-scaled)
        this.updateShield(delta);

        // Krampus boss logic (wasteland 225+) or KIN periodic attacks
        this.updateKrampus(delta);
        if (this.isKIN) {
            this.updateKINAttacks();
        }

        // Dev laser (real-time, not speed-scaled)
        this.updateDevLaser(delta);

        // Area 51 appears after 10 houses in Vegas (75–150), i.e. at 85 total (World 1 only)
        if (!this.isKIN && !this.area51Spawned && this.housesPassed >= 85) {
            this.spawnArea51Building();
            this.area51Spawned = true;
        }

        // Update Area 51 building(s)
        for (let i = this.area51Buildings.length - 1; i >= 0; i--) {
            const b = this.area51Buildings[i];
            if (!b || !b.sprite || !b.sprite.active) {
                if (b) b.destroy?.();
                this.area51Buildings.splice(i, 1);
                continue;
            }
            b.update(scaledDelta);
            if (b.sprite.x < -b.sprite.width) {
                b.destroy();
                this.area51Buildings.splice(i, 1);
            }
        }

        // Detect when Area 51 has fully appeared from the right
        if (this.area51Spawned && !this.area51EnteredView && this.area51Buildings.length > 0) {
            const b = this.area51Buildings[0];
            if (b?.sprite?.active) {
                const w = this.cameras.main.width;
                const rightEdge = b.sprite.x + b.sprite.displayWidth / 2;
                if (rightEdge <= w - 5) {
                    this.area51EnteredView = true;
                    // Spawn both elite jets immediately (staggered hover X)
                    this.spawnEliteJet(0);
                    this.spawnEliteJet(1);
                    this.nextEliteAt[0] = null;
                    this.nextEliteAt[1] = null;
                }
            }
        }

        // Update elite jets + dodge reindeer projectiles
        for (let idx = 0; idx < this.eliteJets.length; idx++) {
            const jet = this.eliteJets[idx];
            if (!jet) continue;

            jet.update(scaledDelta);

            // Dodge reindeer (elite jet cannot be damaged by them)
            for (const p of this.reindeerProjectiles) {
                if (!p?.sprite?.active || !jet?.sprite?.active) continue;
                const dx = Math.abs(p.sprite.x - jet.sprite.x);
                const dy = Math.abs(p.sprite.y - jet.sprite.y);
                if (dx < 140 && dy < 120) {
                    const h = this.cameras.main.height;
                    jet.sprite.y += (p.sprite.y < jet.sprite.y ? 120 : -120);
                    jet.sprite.y = Phaser.Math.Clamp(jet.sprite.y, 60, h - 60);
                }
            }

            if (jet.isOffLeft()) {
                jet.destroy();
                this.eliteJets[idx] = null;
                // schedule next appearance 6-11 houses later (per jet), unless permanently downed
                if (!this.eliteJetDowned[idx]) {
                    this.nextEliteAt[idx] = this.housesPassed + Phaser.Math.Between(6, 11);
                } else {
                    this.nextEliteAt[idx] = null;
                }
            }
        }
        // If elite encounter was playing and no elite jets remain, stop immediately
        if (this.eliteEncounterMusic?.isPlaying) {
            const anyElite = (this.eliteJets || []).some((j) => j?.sprite?.active);
            if (!anyElite) this.stopEliteEncounterMusic();
        }

        // Update elite missiles
        for (let i = this.eliteMissiles.length - 1; i >= 0; i--) {
            const m = this.eliteMissiles[i];
            if (!m || !m.sprite || !m.sprite.active) {
                if (m) m.destroy?.();
                this.eliteMissiles.splice(i, 1);
                continue;
            }
            m.update(scaledDelta);
            if (m.isOffscreen()) {
                m.destroy();
                this.eliteMissiles.splice(i, 1);
            }
        }

        // Elite jet re-appearance loop (per jet)
        if (this.area51EnteredView) {
            for (let idx = 0; idx < this.eliteJets.length; idx++) {
                if (!this.eliteJetDowned[idx] && !this.eliteJets[idx] && this.nextEliteAt[idx] !== null && this.housesPassed >= this.nextEliteAt[idx]) {
                    this.spawnEliteJet(idx, true);
                    this.nextEliteAt[idx] = null;
                }
            }
        }

        // Reindeer pickup spawn logic
        if (this.reindeerUnlocked < 3 && !this.reindeerPickup && this.housesPassed >= this.nextReindeerAt) {
            this.spawnReindeerPickup();
        }

        // Update reindeer pickup
        if (this.reindeerPickup) {
            this.reindeerPickup.update(scaledDelta);
            if (this.reindeerPickup.isOffLeft()) {
                this.reindeerPickup.destroy();
                this.reindeerPickup = null;
                if (this.reindeerUnlocked < 3) {
                    this.nextReindeerAt = this.housesPassed + 10;
                }
            }
        }

        // Launch reindeer with "1"
        if (this.keyLaunchReindeer && Phaser.Input.Keyboard.JustDown(this.keyLaunchReindeer)) {
            this.launchReindeer();
        }

        // Fire coal launcher with "2"
        if (this.keyFireCoal && Phaser.Input.Keyboard.JustDown(this.keyFireCoal)) {
            this.fireCoal();
        }

        // Update reindeer projectiles + collisions with jets
        for (let i = this.reindeerProjectiles.length - 1; i >= 0; i--) {
            const p = this.reindeerProjectiles[i];
            if (!p || !p.sprite || !p.sprite.active) {
                if (p) p.destroy?.();
                this.reindeerProjectiles.splice(i, 1);
                continue;
            }
            p.update(scaledDelta);

            // Hit a jet (down max one enemy, then disappear)
            if (!p.hasDownedEnemy) {
                const pb = p.sprite.getBounds();
                for (let j = this.jets.length - 1; j >= 0; j--) {
                    const jet = this.jets[j];
                    if (!jet?.sprite?.active) continue;
                    if (Phaser.Geom.Rectangle.Overlaps(pb, jet.sprite.getBounds())) {
                        jet.destroy();
                        this.jets.splice(j, 1);
                        this.onJetDowned();
                        p.hasDownedEnemy = true;
                        p.destroy();
                        this.reindeerProjectiles.splice(i, 1);
                        break;
                    }
                }
            }

            // Reindeer can hit elite missiles (2 hits to destroy). Projectile disappears on hit.
            if (p?.sprite?.active && this.eliteMissiles.length > 0) {
                const pb2 = p.sprite.getBounds();
                for (let mi = this.eliteMissiles.length - 1; mi >= 0; mi--) {
                    const m = this.eliteMissiles[mi];
                    if (!m?.sprite?.active) continue;
                    if (Phaser.Geom.Rectangle.Overlaps(pb2, m.sprite.getBounds())) {
                        // consume projectile
                        p.destroy();
                        this.reindeerProjectiles.splice(i, 1);

                        const destroyed = m.takeHit();
                        if (destroyed) {
                            this.eliteMissiles.splice(mi, 1);
                        }
                        break;
                    }
                }
            }

            // Reindeer can hit Krampus (1 damage). Projectile disappears on hit.
            if (p?.sprite?.active && this.krampus?.active && !p.hasDownedEnemy) {
                if (Phaser.Geom.Rectangle.Overlaps(p.sprite.getBounds(), this.krampus.getBounds())) {
                    p.destroy();
                    this.reindeerProjectiles.splice(i, 1);
                    this.damageKrampus(1);
                    continue;
                }
            }

            if (p && p.sprite && p.isOffRight()) {
                p.destroy();
                this.reindeerProjectiles.splice(i, 1);
            }
        }

        // Spawn balloons every 5-10 houses (sky zone)
        if (this.nextBalloonAt === 0) {
            this.nextBalloonAt = this.housesPassed + Phaser.Math.Between(5, 10);
        }
        if (this.housesPassed >= this.nextBalloonAt) {
            this.spawnBalloon();
            this.nextBalloonAt = this.housesPassed + Phaser.Math.Between(5, 10);
        }

        // Update balloons
        for (let i = this.balloons.length - 1; i >= 0; i--) {
            const b = this.balloons[i];
            if (!b || !b.sprite || !b.sprite.active) {
                if (b) b.destroy?.();
                this.balloons.splice(i, 1);
                continue;
            }
            b.update(scaledDelta);
            if (b.sprite.x < -b.sprite.displayWidth - 50) {
                b.destroy();
                this.balloons.splice(i, 1);
            }
        }

        // Spawn Washington building once after 10 houses have passed (World 1 only)
        if (!this.isKIN && !this.washingtonSpawned && this.housesPassed >= 10) {
            this.spawnWashingtonBuilding();
            this.washingtonSpawned = true;
        }

        // Update Washington building(s)
        for (let i = this.washingtonBuildings.length - 1; i >= 0; i--) {
            const bldg = this.washingtonBuildings[i];
            if (!bldg || !bldg.sprite || !bldg.sprite.active) {
                if (bldg) bldg.destroy?.();
                this.washingtonBuildings.splice(i, 1);
                continue;
            }
            bldg.update(scaledDelta);
            if (bldg.sprite.x < -bldg.sprite.width) {
                bldg.destroy();
                this.washingtonBuildings.splice(i, 1);
            }
        }

        // Detect when the first Washington building has fully appeared on the right
        if (this.washingtonSpawned && !this.washingtonEnteredView && this.washingtonBuildings.length > 0) {
            const b = this.washingtonBuildings[0];
            if (b && b.sprite && b.sprite.active) {
                const w = this.cameras.main.width;
                const rightEdge = b.sprite.x + b.sprite.displayWidth / 2;
                if (rightEdge <= w - 5) {
                    this.washingtonEnteredView = true;
                    this.primaryWashingtonBuilding = b;
                    if (this.jetsRemaining > 0) this.startJetWave();
                }
            }
        }

        // Update jets
        for (let i = this.jets.length - 1; i >= 0; i--) {
            const jet = this.jets[i];
            if (!jet) {
                this.jets.splice(i, 1);
                continue;
            }
            jet.update(scaledDelta);
            if (jet.isOffscreen()) {
                jet.destroy();
                this.jets.splice(i, 1);
            }
        }
        // If jet encounter was playing and jets are gone, stop immediately
        if (this.jetEncounterMusic?.isPlaying && (this.jets?.length || 0) === 0) {
            this.stopJetEncounterMusic();
        }

        // If a wave was active and jets are gone, start the post-wave house counter
        if (this.jetWaveActive && this.jets.length === 0) {
            this.jetWaveActive = false;
            this.postWaveHouseStart = this.housesPassed;
            this.flybyShownThisCycle = false;
        }

        // After 8 houses: show flyby warning; after 10 houses: next wave
        if (this.washingtonEnteredView && !this.jetWaveActive && this.postWaveHouseStart !== null) {
            const since = this.housesPassed - this.postWaveHouseStart;
            if (!this.flybyShownThisCycle && since >= 8) {
                if (this.jetsRemaining > 0) this.spawnJetFlyby();
                this.flybyShownThisCycle = true;
            }
            if (since >= 10) {
                if (this.jetsRemaining > 0) this.startJetWave();
                this.postWaveHouseStart = null;
            }
        }

        // Update flyby jets (background indicator)
        for (let i = this.flybyJets.length - 1; i >= 0; i--) {
            const fj = this.flybyJets[i];
            if (!fj || !fj.sprite || !fj.sprite.active) {
                if (fj) fj.destroy?.();
                this.flybyJets.splice(i, 1);
                continue;
            }
            // Move right (mirrored jets "coming around")
            const dt = scaledDelta / 1000;
            fj.sprite.x += fj.vx * dt;
            if (fj.sprite.x > this.cameras.main.width + fj.sprite.displayWidth + 50) {
                fj.destroy();
                this.flybyJets.splice(i, 1);
            }
        }

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet || !bullet.sprite || !bullet.sprite.active) {
                if (bullet) bullet.destroy?.();
                this.bullets.splice(i, 1);
                continue;
            }
            bullet.update(scaledDelta);
            if (bullet.sprite.x < -50) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            }
        }

        // Reindeer launch cooldown timer
        if (this.reindeerShotCooldownLeftMs > 0) {
            this.reindeerShotCooldownLeftMs = Math.max(0, this.reindeerShotCooldownLeftMs - scaledDelta);
        }

        // Update coal cooldown
        if (this.coalCooldownLeftMs > 0) {
            this.coalCooldownLeftMs = Math.max(0, this.coalCooldownLeftMs - scaledDelta);
        }

        // Update coal projectiles + collisions
        for (let i = this.coalProjectiles.length - 1; i >= 0; i--) {
            const c = this.coalProjectiles[i];
            if (!c?.sprite?.active) {
                c?.destroy?.();
                this.coalProjectiles.splice(i, 1);
                continue;
            }
            c.update(scaledDelta);

            const cb = c.sprite.getBounds();
            let exploded = false;

            // Impact on a basic jet -> explode
            for (let j = this.jets.length - 1; j >= 0; j--) {
                const jet = this.jets[j];
                if (!jet?.sprite?.active) continue;
                if (Phaser.Geom.Rectangle.Overlaps(cb, jet.sprite.getBounds())) {
                    this.explodeCoalAt(c.sprite.x, c.sprite.y);
                    exploded = true;
                    break;
                }
            }

            // Impact on an elite jet -> explode (coal can hit elite jets)
            if (!exploded) {
                for (const ej of this.eliteJets || []) {
                    if (!ej?.sprite?.active) continue;
                    if (Phaser.Geom.Rectangle.Overlaps(cb, ej.sprite.getBounds())) {
                        this.explodeCoalAt(c.sprite.x, c.sprite.y);
                        exploded = true;
                        break;
                    }
                }
            }

            // Impact on Krampus -> explode
            if (!exploded && this.krampus?.active) {
                if (Phaser.Geom.Rectangle.Overlaps(cb, this.krampus.getBounds())) {
                    this.explodeCoalAt(c.sprite.x, c.sprite.y);
                    exploded = true;
                }
            }

            // Impact on an elite missile -> explode
            if (!exploded && this.eliteMissiles.length > 0) {
                for (let mi = this.eliteMissiles.length - 1; mi >= 0; mi--) {
                    const m = this.eliteMissiles[mi];
                    if (!m?.sprite?.active) continue;
                    if (Phaser.Geom.Rectangle.Overlaps(cb, m.sprite.getBounds())) {
                        this.explodeCoalAt(c.sprite.x, c.sprite.y);
                        exploded = true;
                        break;
                    }
                }
            }

            // If it hit anything, remove the projectile immediately
            if (exploded) {
                c.destroy();
                this.coalProjectiles.splice(i, 1);
                continue;
            }

            if (c && c.isOffRight()) {
                c.destroy();
                this.coalProjectiles.splice(i, 1);
            }
        }

        // Update drifting coal smoke clouds
        for (let i = this.coalSmokeClouds.length - 1; i >= 0; i--) {
            const s = this.coalSmokeClouds[i];
            if (!s) {
                this.coalSmokeClouds.splice(i, 1);
                continue;
            }
            s.update(scaledDelta);
            if (s.isDeadOrOffLeft()) {
                s.destroy();
                this.coalSmokeClouds.splice(i, 1);
            }
        }

        // Wendigo forest: auto-spawn logic (only in forest biome)
        if (this.biome === 'forest') {
            this.updateForestTrees(scaledDelta);

            if (this.nextWendigoAt === null) {
                this.nextWendigoAt = this.housesPassed;
            }
            if (this.housesPassed >= this.nextWendigoAt) {
                this.spawnWendigo();
                const interval = this.getWendigoIntervalHouses();
                this.nextWendigoAt = this.housesPassed + interval;
            }
        }

        // Always update active wendigos / dirt balls (so dev-spawned ones work in any biome)
        if ((this.wendigos?.length || 0) > 0 || (this.dirtBalls?.length || 0) > 0) {
            for (let i = this.wendigos.length - 1; i >= 0; i--) {
                const w = this.wendigos[i];
                if (!w?.sprite?.active) {
                    w?.destroy?.();
                    this.wendigos.splice(i, 1);
                    continue;
                }
                const dirt = w.update(scaledDelta, this.santa?.sprite);
                if (dirt) this.dirtBalls.push(dirt);
                if (w.isOffLeft()) {
                    w.destroy();
                    this.wendigos.splice(i, 1);
                }
            }

            for (let i = this.dirtBalls.length - 1; i >= 0; i--) {
                const d = this.dirtBalls[i];
                if (!d?.sprite?.active) {
                    d?.destroy?.();
                    this.dirtBalls.splice(i, 1);
                    continue;
                }
                d.update(scaledDelta);
                if (d.isOffscreen()) {
                    d.destroy();
                    this.dirtBalls.splice(i, 1);
                }
            }
        }

        // Draw coal cooldown ring
        this.drawCoalCooldownRing();

        // Check collisions
        this.checkCollisions();

        // Update UI
        this.updateUI();

        // Dev overlay
        this.drawHitboxes();
    }

    spawnHouse() {
        // Prefer spawning houses on the snow (bottom 2/3)
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);
        const y = Phaser.Math.Between(skyH + 140, h - 90);
        // Biome house sprites
        if (this.isKIN) {
            const house = new House(this, this.cameras.main.width + 50, y, 'cave');
            this.houses.push(house);
            return;
        }

        const inVegasZone = this.housesPassed >= 75 && this.housesPassed < 150;
        const inForestZone = this.housesPassed >= 150 && this.housesPassed < 225;
        const inWastelandZone = this.housesPassed >= 225;
        const key = inWastelandZone ? 'cave' : (inForestZone ? 'cabin' : (inVegasZone ? 'vegashouse' : 'house'));
        const house = new House(this, this.cameras.main.width + 50, y, key);
        this.houses.push(house);
    }

    switchToWastelandBackground() {
        // Night-time like forest but rocky/barren ground
        this.theme = 'wasteland';
        const { w, h, skyH } = this.bg;
        this.clearBackground();

        // Dark sky
        this.bg.sky = this.add.rectangle(0, 0, w, skyH, 0x070b16).setOrigin(0);
        // Rocky ground
        this.bg.ground = this.add.rectangle(0, skyH, w, h - skyH, 0x3a3a3a).setOrigin(0);
        this.bg.horizon = this.add.rectangle(0, skyH - 2, w, 4, 0x1a2133).setOrigin(0);

        // Some rock silhouettes
        const r1 = this.add.rectangle(w * 0.30, skyH + 140, 260, 120, 0x2c2c2c, 0.55).setOrigin(0.5, 1);
        const r2 = this.add.rectangle(w * 0.72, skyH + 160, 340, 150, 0x262626, 0.50).setOrigin(0.5, 1);
        this.bg.deco.push(r1, r2);

        // Very dim clouds
        this.spawnClouds({
            count: 2,
            minY: 18,
            maxY: Math.max(50, skyH - 40),
            minScale: 0.12,
            maxScale: 0.22,
            minAlpha: 0.10,
            maxAlpha: 0.18,
            tint: 0x9fb5c7
        });
    }

    spawnShieldPickup() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);
        const x = w + 100;
        const y = Phaser.Math.Between(skyH + 110, h - 80);
        this.shieldPickup = new ShieldPickup(this, x, y);
    }

    updateShield(deltaMs) {
        // No shield until collected
        if (!this.shieldUnlocked) {
            this.shieldActive = false;
            this.shieldDepletedLockout = false;
            this.shieldHoldExceeded = false;
            if (this.shieldGfx) this.shieldGfx.setVisible(false).clear();
            if (this.shieldBarBg) this.shieldBarBg.setVisible(false);
            if (this.shieldBarFill) this.shieldBarFill.setVisible(false);
            return;
        }

        const dtMs = (deltaMs ?? this.game.loop.delta);
        const holding = !!(this.keyShield && this.keyShield.isDown);
        const rechargeRate = this.shieldMaxActiveMs / this.shieldRechargeMs; // ms of energy gained per ms elapsed

        // Clear "must release" once key is released
        if (!holding) {
            this.shieldHoldExceeded = false;
        }

        // If fully depleted, require full recharge before reuse
        if (this.shieldDepletedLockout) {
            this.shieldActive = false;
            // IMPORTANT: Holding the key should NOT prevent recharge when we can't activate anyway.
            this.shieldEnergyMs = Math.min(this.shieldMaxActiveMs, this.shieldEnergyMs + dtMs * rechargeRate);
            if (this.shieldEnergyMs >= this.shieldMaxActiveMs) {
                this.shieldDepletedLockout = false;
            }
        } else if (holding && !this.shieldHoldExceeded && this.shieldEnergyMs > 0) {
            // Drain while holding (1:1 with time)
            this.shieldActive = true;
            this.shieldEnergyMs = Math.max(0, this.shieldEnergyMs - dtMs);

            // If fully depleted, lock out until full recharge
            if (this.shieldEnergyMs <= 1) {
                this.shieldActive = false;
                this.shieldDepletedLockout = true;
                this.shieldEnergyMs = 0;
            }
        } else {
            // Not holding or cannot activate (hold exceeded, no energy, etc.)
            this.shieldActive = false;
            // Recharge should continue even if the player is holding 3 with 0 energy (can't activate).
            if (!holding || this.shieldEnergyMs <= 0) {
                this.shieldEnergyMs = Math.min(this.shieldMaxActiveMs, this.shieldEnergyMs + dtMs * rechargeRate);
            }
        }

        // Draw bubble around Santa when active
        if (this.shieldGfx) {
            this.shieldGfx.clear();
            if (this.shieldActive && this.santa?.sprite?.active) {
                const x = this.santa.sprite.x + 4;
                const y = this.santa.sprite.y + 6;
                this.shieldGfx.setVisible(true);
                this.shieldGfx.lineStyle(4, 0x66e0ff, 0.65);
                this.shieldGfx.strokeCircle(x, y, 58);
                this.shieldGfx.fillStyle(0x66e0ff, 0.08);
                this.shieldGfx.fillCircle(x, y, 56);
            } else {
                this.shieldGfx.setVisible(false);
            }
        }

        // Energy bar (anchored over the sleigh)
        const pct = Phaser.Math.Clamp(this.shieldEnergyMs / this.shieldMaxActiveMs, 0, 1);
        this.shieldBarBg.setVisible(true);
        this.shieldBarFill.setVisible(true);
        if (this.santa?.sprite?.active) {
            const bx = this.santa.sprite.x + 10;
            const by = this.santa.sprite.y + 6;
            this.shieldBarBg.setPosition(bx, by);
            // Fill is left-anchored; keep its left edge fixed to the bar background.
            this.shieldBarFill.setPosition(bx - 34, by);
        }

        // Visual hint: greyed out while locked out
        if (this.shieldDepletedLockout) {
            this.shieldBarFill.setFillStyle(0x999999, 0.75);
        } else {
            this.shieldBarFill.setFillStyle(0x66e0ff, 0.85);
        }
        this.shieldBarFill.width = 68 * pct;
        // No x shifting needed (left edge stays fixed)
    }

    spawnKrampus() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const x = w + 120;
        const y = Phaser.Math.Between(90, h - 140);
        const sprite = this.add.image(x, y, 'krampus').setOrigin(0.5).setDepth(9).setScale(0.20);
        sprite.setFlipX(false); // facing left
        this.krampus = sprite;
        this.krampusHp = this.krampusMaxHp;
        this.krampusNextAttackAt = this.time.now + Phaser.Math.Between(1500, 2500);

        // Move into hover point
        this.tweens.add({
            targets: sprite,
            x: w - 140,
            duration: 900,
            ease: 'Sine.easeOut'
        });

        this.krampusHpBg?.setVisible(true);
        this.krampusHpFill?.setVisible(true);
        this.updateKrampusHpBar();
    }

    updateKrampus(deltaMs) {
        // In KIN, Krampus isn't present but attacks still run (chain/icicles/wind/snowstorm updates)
        if (!this.krampus?.active && !this.isKIN) return;
        const dtMs = (deltaMs ?? this.game.loop.delta);
        const dt = dtMs / 1000;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);

        // Hover/bob on right side (only if Krampus sprite exists)
        if (this.krampus?.active) {
            this.krampus.x = Phaser.Math.Linear(this.krampus.x, w - 140, 0.06);
            // When chain grab is active, float to the chain origin height
            if (this.krampusChain?.y) {
                this.krampus.y = Phaser.Math.Linear(this.krampus.y, this.krampusChain.y, 0.12);
            } else {
                this.krampus.y += Math.sin(this.time.now / 220) * 0.35;
            }
            this.krampus.y = Phaser.Math.Clamp(this.krampus.y, 70, h - 90);
        }

        // Snowstorm overlay
        if (this.krampusSnowstormUntil > this.time.now) {
            if (!this.krampusSnowstormOverlay) {
                const ow = Math.floor(w * 0.30);
                const ox = w - ow / 2;
                // Much heavier visibility reduction (near-whiteout)
                this.krampusSnowstormOverlay = this.add.rectangle(ox, h / 2, ow, h, 0xffffff, 0.90).setDepth(50);
                this.krampusSnowstormGfx = this.add.graphics().setDepth(51);
                this.krampusSnowstormLastDraw = 0;
            }
            // keep it on right 30%
            const ow = Math.floor(w * 0.30);
            this.krampusSnowstormOverlay.setPosition(w - ow / 2, h / 2);
            this.krampusSnowstormOverlay.setSize(ow, h);
            this.krampusSnowstormOverlay.setVisible(true);

            // Add animated whiteout speckles/streaks (re-drawn ~8x/sec)
            if (this.krampusSnowstormGfx) {
                const now = this.time.now;
                if (!this.krampusSnowstormLastDraw || (now - this.krampusSnowstormLastDraw) > 120) {
                    this.krampusSnowstormLastDraw = now;
                    const left = w - ow;
                    this.krampusSnowstormGfx.clear();
                    // speckles
                    for (let i = 0; i < 140; i++) {
                        const px = Phaser.Math.Between(left, w);
                        const py = Phaser.Math.Between(0, h);
                        const r = Phaser.Math.Between(1, 3);
                        const a = Phaser.Math.FloatBetween(0.10, 0.26);
                        // brighter speckle with a subtle darker outline so it reads through the whiteout
                        this.krampusSnowstormGfx.fillStyle(0xffffff, Math.min(0.9, a + 0.10));
                        this.krampusSnowstormGfx.fillCircle(px, py, r);
                        this.krampusSnowstormGfx.lineStyle(1, 0x9fb5c7, 0.25);
                        this.krampusSnowstormGfx.strokeCircle(px, py, r + 0.5);
                    }
                    // streaks
                    for (let i = 0; i < 24; i++) {
                        const x1 = Phaser.Math.Between(left, w);
                        const y1 = Phaser.Math.Between(0, h);
                        const len = Phaser.Math.Between(20, 60);
                        // outlined streak: darker thick pass, then bright thin pass
                        this.krampusSnowstormGfx.lineStyle(4, 0x9fb5c7, Phaser.Math.FloatBetween(0.10, 0.22));
                        this.krampusSnowstormGfx.beginPath();
                        this.krampusSnowstormGfx.moveTo(x1, y1);
                        this.krampusSnowstormGfx.lineTo(x1 - len, y1 + len * 0.4);
                        this.krampusSnowstormGfx.strokePath();

                        this.krampusSnowstormGfx.lineStyle(2, 0xffffff, Phaser.Math.FloatBetween(0.14, 0.30));
                        this.krampusSnowstormGfx.beginPath();
                        this.krampusSnowstormGfx.moveTo(x1, y1);
                        this.krampusSnowstormGfx.lineTo(x1 - len, y1 + len * 0.4);
                        this.krampusSnowstormGfx.strokePath();
                    }
                }
            }
        } else if (this.krampusSnowstormOverlay) {
            this.krampusSnowstormOverlay.setVisible(false);
            this.krampusSnowstormGfx?.clear();
        }

        // Update chain grab (extends to left edge, then visibly drags an enemy in)
        if (this.krampusChain?.sprite?.active) {
            const c = this.krampusChain;
            c.elapsedMs += dtMs;

            // keep the chain anchored to Krampus
            const anchorX = (this.krampus?.active ? this.krampus.x : (w - 140)) - 20;
            const maxLen = Math.max(120, anchorX + 30); // reaches ~x=0

            if (c.phase === 'extend') {
                // Extend quickly, then hold until 2s mark
                const extendT = Phaser.Math.Clamp(c.elapsedMs / (this.krampusChainExtendMs || 840), 0, 1);
                const len = Phaser.Math.Linear(40, maxLen, extendT);
                c.len = len;
                c.sprite.setOrigin(1, 0.5);
                c.sprite.width = len;
                c.sprite.x = anchorX;
                c.sprite.y = c.y;

                // Collision while chain is out (damage; shield blocks)
                if (this.santa?.sprite?.active && c.elapsedMs < 2000) {
                    if (Phaser.Geom.Rectangle.Overlaps(this.santa.sprite.getBounds(), c.sprite.getBounds())) {
                        if (!this.shieldActive) this.loseLife();
                    }
                }

                if (c.elapsedMs >= (this.krampusChainHoldMs || 2000)) {
                    c.phase = 'retract';
                    c.retractMs = (this.krampusChainRetractMs || 1640);
                    c.retractElapsed = 0;

                    // Spawn a dragged enemy sprite at the chain tip (left edge)
                    const pick = this.chooseKrampusChainEnemy(c.y, skyH);
                    c.enemyType = pick;
                    const tipX = c.sprite.x - c.sprite.width;
                    const key = pick === 'jet' ? 'basicjet' : (pick === 'elitejet' ? 'elitejet' : 'wendigo');
                    const es = this.add.image(tipX + 20, c.y, key).setOrigin(0.5).setDepth(10);
                    es.setAlpha(0.95);
                    es.setScale(pick === 'wendigo' ? 0.10 : 0.14);
                    if (pick !== 'wendigo') es.setFlipX(false);
                    c.enemySprite = es;
                }
            } else if (c.phase === 'retract') {
                c.retractElapsed += dtMs;
                const t = Phaser.Math.Clamp(c.retractElapsed / c.retractMs, 0, 1);
                const len = Phaser.Math.Linear(maxLen, 90, t);
                c.len = len;
                c.sprite.setOrigin(1, 0.5);
                c.sprite.width = len;
                c.sprite.x = anchorX;
                c.sprite.y = c.y;

                const tipX = c.sprite.x - c.sprite.width;
                if (c.enemySprite?.active) {
                    c.enemySprite.x = tipX + 20;
                    c.enemySprite.y = c.y;
                }

                if (t >= 1) {
                    const releaseX = tipX + 20;
                    const releaseY = c.y;
                    c.enemySprite?.destroy?.();
                    c.sprite.destroy();
                    this.krampusChain = null;
                    this.spawnKrampusDraggedEnemyAt(c.enemyType, releaseX, releaseY, skyH);
                }
            }

            // Safety: if anything goes wrong, never leave a chain/grabged preview stuck
            if (c.elapsedMs > 8000) {
                c.enemySprite?.destroy?.();
                c.sprite?.destroy?.();
                this.krampusChain = null;
            }
        }

        // Update icicle walls
        for (let i = this.krampusIcicles.length - 1; i >= 0; i--) {
            const ob = this.krampusIcicles[i];
            if (!ob?.top?.active || !ob?.bottom?.active) {
                ob?.top?.destroy?.();
                ob?.bottom?.destroy?.();
                this.krampusIcicles.splice(i, 1);
                continue;
            }
            ob.top.x -= 900 * dt;
            ob.bottom.x -= 900 * dt;
            if (this.santa?.sprite?.active) {
                const sb = this.santa.sprite.getBounds();
                if (Phaser.Geom.Rectangle.Overlaps(sb, ob.top.getBounds()) || Phaser.Geom.Rectangle.Overlaps(sb, ob.bottom.getBounds())) {
                    if (!this.shieldActive) this.loseLife();
                }
            }
            if (ob.top.x < -200) {
                ob.top.destroy();
                ob.bottom.destroy();
                this.krampusIcicles.splice(i, 1);
            }
        }

        // Update wind gusts
        for (let i = this.krampusWindGusts.length - 1; i >= 0; i--) {
            const g = this.krampusWindGusts[i];
            if (!g?.rect?.active) {
                this.krampusWindGusts.splice(i, 1);
                continue;
            }
            g.rect.x -= 700 * dt;
            if (this.santa?.sprite?.active && Phaser.Geom.Rectangle.Overlaps(this.santa.sprite.getBounds(), g.rect.getBounds())) {
                // Apply slow (no damage)
                if (!this.shieldActive) {
                    this.krampusSlowUntil = Math.max(this.krampusSlowUntil, this.time.now + 8000);
                }
            }
            if (g.rect.x < -w) {
                g.rect.destroy();
                this.krampusWindGusts.splice(i, 1);
            }
        }

        // Apply slow effect to Santa tracking
        this.santaYFollowFactor = (this.krampusSlowUntil > this.time.now) ? 0.06 : 0.25;

        // Attack scheduling
        if (this.time.now >= this.krampusNextAttackAt) {
            this.krampusDoAttack();
        }
    }

    krampusDoAttack() {
        if (!this.krampus?.active) return;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);

        // If snowstorm active, follow-up can be faster
        const snowstormActive = this.krampusSnowstormUntil > this.time.now;

        // Prevent overlapping chain grabs (snowstorm follow-ups can otherwise start a second chain and orphan sprites)
        const chainActive = !!(this.krampusChain?.sprite?.active);

        const roll = Phaser.Math.Between(0, 99);
        if (roll < 30 && !chainActive) {
            this.krampusAttackChainGrab();
        } else if (roll < 60) {
            this.krampusAttackIcicles();
        } else if (roll < 85) {
            this.krampusAttackFreezingWind();
        } else {
            this.krampusAttackSnowstorm();
        }

        const nextDelay = snowstormActive ? Phaser.Math.Between(1000, 4000) : Phaser.Math.Between(5000, 8000);
        this.krampusNextAttackAt = this.time.now + nextDelay;
    }

    krampusAttackChainGrab() {
        if (this.krampusChain?.sprite?.active) return;
        const h = this.cameras.main.height;
        const y = Phaser.Math.Between(70, h - 80);
        const anchorX = (this.krampus?.active ? this.krampus.x : (this.cameras.main.width - 140)) - 20;
        const chain = this.add.rectangle(anchorX, y, 40, 10, 0xb0b0b0, 0.9).setOrigin(1, 0.5).setDepth(10);
        chain.setStrokeStyle(2, 0x6e6e6e, 0.6);
        this.krampusChain = { sprite: chain, y, elapsedMs: 0, phase: 'extend', enemyType: null, enemySprite: null };
    }

    chooseKrampusChainEnemy(chainY, skyH) {
        // Choose enemy type by weights; if chain is in sky region, cannot pick wendigo
        const inSky = chainY <= skyH;
        const r = Phaser.Math.FloatBetween(0, 1);
        if (inSky) {
            // renormalize 30/20 => 60/40
            return r < 0.60 ? 'jet' : 'elitejet';
        }
        // 50% wendigo, 30% jet, 20% elitejet
        if (r < 0.50) return 'wendigo';
        if (r < 0.80) return 'jet';
        return 'elitejet';
    }

    spawnKrampusDraggedEnemyAt(kind, x, y, skyH) {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH2 = skyH ?? Math.floor(h / 3);

        if (kind === 'wendigo') {
            // Ground troop: ensure it only spawns in ground section
            if (y <= skyH2) return;
            // Spawn at the dragged height, and only start moving after the chain releases (this call happens at release).
            this.spawnWendigo(x, false, y);
            return;
        }

        if (kind === 'jet') {
            const jet = new FighterJet(this, x, Phaser.Math.Clamp(y, 60, h - 60), { bulletsList: this.bullets, scale: 0.18, depth: 9, flipX: false });
            jet.startHover(Phaser.Math.Between(700, 1100));
            this.jets.push(jet);

            // In KIN, once a jet has been introduced via chain, enable the normal flyby/return loop.
            if (this.isKIN) {
                this.washingtonSpawned = true; // prevent retro spawns
                this.washingtonEnteredView = true; // gate for wave logic
                this.jetWaveActive = true; // treat this as an active wave
                this.postWaveHouseStart = null;
                this.flybyShownThisCycle = false;
                this.jetsRemaining = 2; // no attrition in KIN (see onJetDowned)
            }
            return;
        }

        // Elite jet: use a free slot if possible, otherwise skip
        const idx = this.eliteJets?.[0] ? (this.eliteJets?.[1] ? -1 : 1) : 0;
        if (idx !== -1) {
            this.eliteJetDowned[idx] = false;
            this.nextEliteAt[idx] = null;
            const hoverX = w - 160 - idx * 70;
            // Spawn at the dragged position instead of offscreen-right
            this.eliteJets[idx] = new EliteJet(this, x, Phaser.Math.Clamp(y, 70, h - 120), {
                missilesList: this.eliteMissiles,
                santaSprite: this.santa?.sprite,
                hoverX,
                forceOffscreen: false
            });

            // In KIN, enable elite reappearance loop once an elite has been introduced via chain.
            if (this.isKIN) {
                this.area51Spawned = true;
                this.area51EnteredView = true;
            }
        }
    }

    krampusAttackIcicles() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        const spawnWall = (x) => {
            const gapH = 260; // bigger gap
            const gapY = Phaser.Math.Between(120, h - 260 - 120);
            const topH = Math.max(40, gapY);
            const bottomY = gapY + gapH;
            const bottomH = Math.max(40, h - bottomY);

            const top = this.add.rectangle(x, topH / 2, 90, topH, 0xddeeff, 0.95).setDepth(10);
            const bottom = this.add.rectangle(x, bottomY + bottomH / 2, 90, bottomH, 0xddeeff, 0.95).setDepth(10);
            // little tint
            top.setStrokeStyle(2, 0x88ccee, 0.65);
            bottom.setStrokeStyle(2, 0x88ccee, 0.65);
            this.krampusIcicles.push({ top, bottom });
        };

        spawnWall(w + 80);
        spawnWall(w + 560); // farther apart
    }

    krampusAttackFreezingWind() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const gustH = Math.floor(h * 0.40);
        const y = Phaser.Math.Between(Math.floor(gustH / 2) + 40, h - Math.floor(gustH / 2) - 40);
        const rect = this.add.rectangle(w + 120, y, Math.floor(w * 0.40), gustH, 0xaadfff, 0.22).setDepth(10);
        rect.setStrokeStyle(2, 0x66e0ff, 0.35);
        this.krampusWindGusts.push({ rect });
    }

    krampusAttackSnowstorm() {
        // Right 30% fog for 10s
        this.krampusSnowstormUntil = this.time.now + 10000;
    }

    updateKrampusHpBar() {
        if (!this.krampusHpBg || !this.krampusHpFill) return;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const barH = Math.floor(h * 0.62);
        this.krampusHpBg.setPosition(w - 14, h / 2);
        this.krampusHpBg.setSize(12, barH);
        this.krampusHpFill.setPosition(w - 14, h / 2 + barH / 2 - 2);
        this.krampusHpFill.setSize(10, Math.max(2, barH - 4));

        const pct = Phaser.Math.Clamp(this.krampusHp / this.krampusMaxHp, 0, 1);
        this.krampusHpFill.scaleY = pct;
    }

    createSnowBackground() {
        const { w, h, skyH } = this.bg;

        // Clear any existing background pieces
        this.clearBackground();

        // Sky (top 1/3)
        this.bg.sky = this.add.rectangle(0, 0, w, skyH, 0x87CEEB).setOrigin(0);

        // Snow (bottom 2/3)
        this.bg.ground = this.add.rectangle(0, skyH, w, h - skyH, 0xffffff).setOrigin(0);

        // Horizon
        this.bg.horizon = this.add.rectangle(0, skyH - 2, w, 4, 0xe6f3ff).setOrigin(0);

        // Clouds
        this.spawnClouds({
            count: 6,
            minY: 20,
            maxY: Math.max(60, skyH - 30),
            minScale: 0.12,
            maxScale: 0.22,
            minAlpha: 0.75,
            maxAlpha: 0.95,
            tint: null
        });
    }

    switchToDesertBackground() {
        this.desertSwitched = true;
        this.theme = 'desert';

        const { w, h, skyH } = this.bg;

        // Clear previous background & rebuild
        this.clearBackground();

        // Desert / Vegas dusk vibe
        // Warm sky (top 1/3)
        this.bg.sky = this.add.rectangle(0, 0, w, skyH, 0x6f93a6).setOrigin(0);
        // Sand ground (bottom 2/3)
        this.bg.ground = this.add.rectangle(0, skyH, w, h - skyH, 0xd9c18a).setOrigin(0);
        // Horizon glow line
        this.bg.horizon = this.add.rectangle(0, skyH - 2, w, 4, 0xffd27a).setOrigin(0);

        // Distant mountains silhouette
        const mtn = this.add.rectangle(0, skyH - 60, w, 90, 0x3a4a54, 0.45).setOrigin(0);
        this.bg.deco.push(mtn);

        // Simple Vegas-ish skyline blocks (silhouettes + a couple neon accents)
        const skylineBaseY = skyH - 2;
        const blocks = [
            { x: w * 0.62, w: 90, h: 110, c: 0x1c2a33 },
            { x: w * 0.70, w: 60, h: 80, c: 0x22313a },
            { x: w * 0.78, w: 120, h: 140, c: 0x17242d },
            { x: w * 0.90, w: 70, h: 95, c: 0x1f2e37 }
        ];
        for (const b of blocks) {
            const r = this.add.rectangle(b.x, skylineBaseY, b.w, b.h, b.c, 0.9).setOrigin(0.5, 1);
            this.bg.deco.push(r);
        }
        // Neon sign accents
        const neon1 = this.add.rectangle(w * 0.78, skylineBaseY - 95, 34, 10, 0xff3bbf, 0.95).setOrigin(0.5, 0.5);
        const neon2 = this.add.rectangle(w * 0.62, skylineBaseY - 70, 22, 10, 0x34d6ff, 0.95).setOrigin(0.5, 0.5);
        this.bg.deco.push(neon1, neon2);

        // Puffy clouds still exist but slightly tinted warmer
        this.spawnClouds({
            count: 5,
            minY: 18,
            maxY: Math.max(55, skyH - 35),
            minScale: 0.10,
            maxScale: 0.20,
            minAlpha: 0.55,
            maxAlpha: 0.85,
            tint: 0xffe0b3
        });
    }

    switchToForestBackground() {
        this.theme = 'forest';
        const { w, h, skyH } = this.bg;

        this.clearBackground();
        this.forestTrees = [];

        // Dark winter-night sky (top 1/3)
        this.bg.sky = this.add.rectangle(0, 0, w, skyH, 0x0c1624).setOrigin(0);
        // Dark green forest floor (bottom 2/3)
        this.bg.ground = this.add.rectangle(0, skyH, w, h - skyH, 0x0f2a1a).setOrigin(0);
        // Horizon
        this.bg.horizon = this.add.rectangle(0, skyH - 2, w, 4, 0x173827).setOrigin(0);

        // Light fog band
        const fog = this.add.rectangle(0, skyH - 28, w, 70, 0x9bb1b6, 0.08).setOrigin(0);
        this.bg.deco.push(fog);

        // Pine trees overlay (scrolls with houses; distributed across the whole ground section)
        const treeCount = 11;
        for (let i = 0; i < treeCount; i++) {
            const x = Phaser.Math.Between(0, w);
            const s = Phaser.Math.FloatBetween(0.10, 0.18);
            const a = Phaser.Math.FloatBetween(0.55, 0.85);
            const y = Phaser.Math.Between(skyH + 120, h - 6);
            const t = this.add.image(x, y, 'pinetree').setOrigin(0.5, 1).setScale(s).setAlpha(a);
            t.setDepth(4);
            // Slight tint for nighttime
            t.setTint(0x8ad6b2);
            this.forestTrees.push(t);
            this.bg.deco.push(t);
        }

        // Fewer, dimmer clouds (optional)
        this.spawnClouds({
            count: 3,
            minY: 16,
            maxY: Math.max(50, skyH - 40),
            minScale: 0.10,
            maxScale: 0.18,
            minAlpha: 0.15,
            maxAlpha: 0.25,
            tint: 0x99bbcc
        });
    }

    updateForestTrees(deltaMs) {
        if (!this.forestTrees?.length) return;
        const dt = ((deltaMs ?? this.game.loop.delta) / 1000);
        const w = this.cameras.main.width;
        const speed = 500; // scrolls with houses
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);
        for (const t of this.forestTrees) {
            if (!t?.active) continue;
            t.x -= speed * dt;
            if (t.x < -t.displayWidth) {
                t.x = w + Phaser.Math.Between(20, 140);
                t.y = Phaser.Math.Between(skyH + 120, h - 6);
                t.setScale(Phaser.Math.FloatBetween(0.10, 0.18));
                t.setAlpha(Phaser.Math.FloatBetween(0.55, 0.85));
            }
        }
    }

    getWendigoIntervalHouses() {
        // 150–190: ramp from 1 per 10 houses → 1 per 1 house (then stays at 1 beyond 190)
        const start = 150;
        const end = 190;
        const t = Phaser.Math.Clamp((this.housesPassed - start) / (end - start), 0, 1);
        const interval = Math.round(10 - (t * 9));
        return Phaser.Math.Clamp(interval, 1, 10);
    }

    // Wendigo only spawns on the landscape/ground portion.
    // `randomizeX` keeps spawns from lining up perfectly with house cadence.
    spawnWendigo(spawnX = null, randomizeX = true, spawnY = null) {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);
        const groundY = (typeof spawnY === 'number')
            ? Phaser.Math.Clamp(spawnY, skyH + 140, h - 8)
            : Phaser.Math.Between(skyH + 140, h - 8);
        const baseX = (typeof spawnX === 'number') ? spawnX : (w + 120);
        // Keep it off-screen but not perfectly aligned with other spawns
        const jitter = randomizeX ? Phaser.Math.Between(0, 220) : 0;
        const x = baseX + jitter;
        const wd = new Wendigo(this, x, groundY);
        this.wendigos.push(wd);
    }

    spawnClouds({ count, minY, maxY, minScale, maxScale, minAlpha, maxAlpha, tint }) {
        const { w } = this.bg;
        for (let i = 0; i < count; i++) {
            const cloudX = Phaser.Math.Between(0, w);
            const cloudY = Phaser.Math.Between(minY, maxY);
            const scale = Phaser.Math.FloatBetween(minScale, maxScale);
            const alpha = Phaser.Math.FloatBetween(minAlpha, maxAlpha);

            const c = this.add.image(cloudX, cloudY, 'cloud').setOrigin(0.5, 0.5).setScale(scale).setAlpha(alpha);
            if (tint) c.setTint(tint);
            this.bg.clouds.push(c);
        }
    }

    clearBackground() {
        // destroy previous layers
        if (this.bg.sky) this.bg.sky.destroy();
        if (this.bg.ground) this.bg.ground.destroy();
        if (this.bg.horizon) this.bg.horizon.destroy();
        for (const c of this.bg.clouds) c.destroy();
        for (const d of this.bg.deco) d.destroy();
        this.bg.sky = null;
        this.bg.ground = null;
        this.bg.horizon = null;
        this.bg.clouds = [];
        this.bg.deco = [];
    }

    spawnWashingtonBuilding() {
        const h = this.cameras.main.height;
        const groundY = h; // since sprite origin is bottom (0.5, 1)

        // Spawn just above the bottom edge so it "sits" on the snow.
        const bldg = new WashingtonBuilding(this, this.cameras.main.width + 80, groundY - 10);
        this.washingtonBuildings.push(bldg);
    }

    spawnBalloon() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);

        const x = w + 80;
        const y = Phaser.Math.Between(60, Math.max(80, skyH - 40));
        const balloon = new ElfBalloon(this, x, y);
        this.balloons.push(balloon);

        if (!this.tutorialBalloonShown) {
            this.tutorialBalloonShown = true;
            this.showTooltip(
                'Elf Balloon!\nFly through it to restock your presents.',
                2000
            );
        }
    }

    spawnReindeerPickup() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const x = w + 80;
        const y = Phaser.Math.Between(60, h - 60); // any height
        this.reindeerPickup = new ReindeerPickup(this, x, y);

        if (!this.tutorialReindeerShown) {
            this.tutorialReindeerShown = true;
            this.showTooltip(
                'Reindeer!\nCollect to attach to your sleigh.\nPress 1 to launch forward.',
                2000
            );
        }
    }

    spawnCoalLauncherPickup() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);
        // Keep it in the snow zone so it's easy to pick up
        const x = w + 90;
        const y = Phaser.Math.Between(skyH + 90, h - 70);
        this.coalLauncherPickup = new CoalLauncherPickup(this, x, y);

        if (!this.tutorialCoalShown) {
            this.tutorialCoalShown = true;
            this.showTooltip(
                'Coal Cannon!\nCollect it to mount under your sleigh.\nPress 2 to fire (cooldown ring).',
                2000
            );
        }
    }

    spawnArea51Building() {
        const h = this.cameras.main.height;
        const groundY = h;
        const b = new Area51Building(this, this.cameras.main.width + 90, groundY - 10);
        this.area51Buildings.push(b);
    }

    spawnEliteJet(idx = 0, isReappearance = false) {
        if (this.eliteJetDowned?.[idx]) return;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const x = w + 70;
        const y = Phaser.Math.Between(70, h - 120);
        // Stagger hover points slightly so both jets don't overlap perfectly
        const hoverX = w - 160 - idx * 70;
        this.eliteJets[idx] = new EliteJet(this, x, y, { missilesList: this.eliteMissiles, santaSprite: this.santa?.sprite, hoverX });
        // EliteJet internally stays cloaked 1-2s before firing; for reappearance we just spawn it.
        if (isReappearance) {
            // no-op; kept for readability
        }

        // Elite encounter music fades in while elite jets are active
        this.startEliteEncounterMusic();
    }

    checkCollisions() {
        // Reindeer pickup collection
        if (this.reindeerPickup && this.reindeerPickup.sprite?.active && this.santa?.sprite?.active) {
            const santaBounds = this.santa.sprite.getBounds();
            if (Phaser.Geom.Rectangle.Overlaps(santaBounds, this.reindeerPickup.sprite.getBounds())) {
                // Attach to sleigh (front), up to 3 total unlocked
                this.reindeerPickup.destroy();
                this.reindeerPickup = null;

                if (this.reindeerUnlocked < 3) {
                    this.reindeerUnlocked++;
                    this.attachReindeer();

                    if (this.reindeerUnlocked < 3) {
                        this.nextReindeerAt = this.housesPassed + 10;
                    }
                }
            }
        }

        // Coal launcher pickup collection
        if (this.coalLauncherPickup?.sprite?.active && this.santa?.sprite?.active && !this.coalLauncherMounted) {
            if (Phaser.Geom.Rectangle.Overlaps(this.santa.sprite.getBounds(), this.coalLauncherPickup.sprite.getBounds())) {
                this.coalLauncherPickup.destroy();
                this.coalLauncherPickup = null;
                this.coalLauncherMounted = true;
                this.coalCooldownLeftMs = 0;
            }
        }

        // Shield pickup collection
        if (this.shieldPickup?.sprite?.active && this.santa?.sprite?.active && !this.shieldUnlocked) {
            if (Phaser.Geom.Rectangle.Overlaps(this.santa.sprite.getBounds(), this.shieldPickup.sprite.getBounds())) {
                this.shieldPickup.destroy();
                this.shieldPickup = null;
                this.shieldUnlocked = true;
                this.shieldEnergyMs = this.shieldMaxActiveMs; // start full (3s)
                this.shieldDepletedLockout = false;
                this.shieldHoldExceeded = false;
            }
        }

        // Balloon pickup (restock)
        if (this.santa && this.santa.sprite && this.santa.sprite.active) {
            const santaBounds = this.santa.sprite.getBounds();
            for (let i = 0; i < this.balloons.length; i++) {
                const b = this.balloons[i];
                if (!b || !b.sprite || !b.sprite.active) continue;
                if (!b.hasPresent) continue;
                if (Phaser.Geom.Rectangle.Overlaps(santaBounds, b.sprite.getBounds())) {
                    if (b.collect()) {
                        this.santa.restock();
                    }
                }
            }
        }

        // Check present deliveries (Santa over houses)
        for (let i = 0; i < this.houses.length; i++) {
            const house = this.houses[i];
            if (!house || !house.sprite || !house.sprite.active) continue;
            if (!house.delivered && house.checkDelivery(this.santa.sprite)) {
                this.deliverPresent(house);
            }
        }

        // Bullet hits on Santa
        if (this.santa && this.santa.sprite && this.santa.sprite.active && !this.santa.invincible) {
            const santaBounds = this.santa.sprite.getBounds();
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                if (!bullet || !bullet.sprite || !bullet.sprite.active) continue;
                if (Phaser.Geom.Rectangle.Overlaps(santaBounds, bullet.sprite.getBounds())) {
                    bullet.destroy();
                    this.bullets.splice(i, 1);
                    if (this.shieldActive) {
                        // Shield blocks damage
                        break;
                    }
                    this.lives--;
                    this.updateUI();
                    this.santa.flash();
                    if (this.lives <= 0) {
                        this.endGame();
                    }
                    break;
                }
            }
        }

        // Elite missile hits on Santa
        if (this.santa && this.santa.sprite && this.santa.sprite.active && !this.santa.invincible) {
            const santaBounds = this.santa.sprite.getBounds();
            for (let i = this.eliteMissiles.length - 1; i >= 0; i--) {
                const m = this.eliteMissiles[i];
                if (!m || !m.sprite || !m.sprite.active) continue;
                if (Phaser.Geom.Rectangle.Overlaps(santaBounds, m.sprite.getBounds())) {
                    m.destroy();
                    this.eliteMissiles.splice(i, 1);
                    if (this.shieldActive) {
                        break;
                    }
                    this.lives--;
                    this.updateUI();
                    this.santa.flash();
                    if (this.lives <= 0) {
                        this.endGame();
                    }
                    break;
                }
            }
        }

        // Dirt balls hit Santa (wendigo forest)
        if (this.santa?.sprite?.active && this.dirtBalls?.length) {
            const sb = this.santa.sprite.getBounds();
            for (let i = this.dirtBalls.length - 1; i >= 0; i--) {
                const d = this.dirtBalls[i];
                if (!d?.sprite?.active) continue;
                if (Phaser.Geom.Rectangle.Overlaps(sb, d.sprite.getBounds())) {
                    d.destroy();
                    this.dirtBalls.splice(i, 1);
                    if (this.shieldActive) {
                        break;
                    }
                    this.loseLife();
                    break;
                }
            }
        }
    }

    loseLife() {
        if (!this.santa?.sprite?.active) return;
        if (this.santa.invincible) return;

        this.lives -= 1;
        this.updateUI();
        this.santa.flash?.();

        if (this.lives <= 0) {
            this.endGame();
        }
    }

    damageKrampus(amount = 1) {
        if (!this.krampus?.active) return;
        this.krampusHp = Math.max(0, this.krampusHp - amount);
        this.updateKrampusHpBar();

        // flash
        try {
            this.krampus.setTint(0xffffff);
            this.time.delayedCall(80, () => {
                if (this.krampus?.active) this.krampus.clearTint();
            });
        } catch (e) {}

        if (this.krampusHp <= 0) {
            // Boss defeated
            this.krampus.destroy();
            this.krampus = null;
            this.krampusHpBg?.setVisible(false);
            this.krampusHpFill?.setVisible(false);
            if (this.krampusSnowstormOverlay) this.krampusSnowstormOverlay.setVisible(false);

            // Clear any in-flight chain preview to avoid "stuck grabbed" visuals after death
            if (this.krampusChain?.enemySprite?.active) this.krampusChain.enemySprite.destroy();
            if (this.krampusChain?.sprite?.active) this.krampusChain.sprite.destroy();
            this.krampusChain = null;

            this.krampusDefeated = true;
            this.gameWon = true;
            // Unlock KIN
            try { this.registry?.set?.('ss_unlock_kin', true); } catch (e) {}
            this.winBackdrop?.setVisible(true);
            this.winText?.setVisible(true);

            this.submitScoreIfNeeded();
        }
    }

    startJetWave() {
        if (!this.washingtonEnteredView) return;
        if (this.jetWaveActive) return;
        if (this.jetsRemaining <= 0) return;
        this.jetWaveActive = true;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Spawn at Washington building (once it has entered view)
        // Then approach hover points near the right edge at ANY height.
        let spawnX = w + 40;
        let spawnY = h / 2;
        if (this.primaryWashingtonBuilding && this.primaryWashingtonBuilding.sprite && this.primaryWashingtonBuilding.sprite.active) {
            const b = this.primaryWashingtonBuilding.sprite;
            spawnX = b.x;
            // Origin is bottom, so "top-ish" is y - displayHeight * 0.7
            spawnY = Phaser.Math.Clamp(b.y - b.displayHeight * 0.7, 60, h - 60);
        }

        const hoverX = w - 140;
        const y1 = Phaser.Math.Between(60, h - 60);
        const y2 = Phaser.Math.Between(60, h - 60);

        const count = Math.min(2, this.jetsRemaining);
        if (count >= 1) {
            const jet1 = new FighterJet(this, spawnX, spawnY, { bulletsList: this.bullets, scale: 0.18, depth: 9, flipX: false });
            const hoverMs1 = Phaser.Math.Between(1800, 2600);
            jet1.startApproach(hoverX, y1, 650, hoverMs1);
            this.jets.push(jet1);
        }
        if (count >= 2) {
            const jet2 = new FighterJet(this, spawnX + 30, spawnY + 20, { bulletsList: this.bullets, scale: 0.18, depth: 9, flipX: false });
            const hoverMs2 = Phaser.Math.Between(1800, 2600);
            jet2.startApproach(hoverX + 40, y2, 650, hoverMs2);
            this.jets.push(jet2);
        }

        // Jet encounter music fades in while jets are active
        this.startJetEncounterMusic();
    }

    spawnJetFlyby() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const skyH = Math.floor(h / 3);

        // Flyby stays in the sky area (top 1/3) as a background indicator
        const y1 = Phaser.Math.Between(40, Math.max(70, skyH - 40));
        const y2 = Phaser.Math.Between(40, Math.max(70, skyH - 40));

        const makeFlyby = (y) => {
            const sprite = this.add.image(-60, y, 'basicjet');
            sprite.setOrigin(0.5, 0.5);
            sprite.setDepth(1);
            sprite.setAlpha(0.5);
            sprite.setScale(0.07);
            sprite.setFlipX(true); // mirror so it looks like it is flying the other way
            return { sprite, vx: 520, destroy: () => sprite.destroy() };
        };

        const count = Math.min(2, this.jetsRemaining);
        if (count >= 1) this.flybyJets.push(makeFlyby(y1));
        if (count >= 2) this.flybyJets.push(makeFlyby(y2));
    }

    onJetDowned() {
        // In KIN, jets always return (no permanent attrition)
        if (this.isKIN) return;
        this.jetsRemaining = Math.max(0, this.jetsRemaining - 1);

        // If both are down, stop future flybys / waves.
        if (this.jetsRemaining === 0) {
            this.jetWaveActive = false;
            this.postWaveHouseStart = null;
            this.flybyShownThisCycle = true;

            for (const fj of this.flybyJets) {
                fj?.destroy?.();
            }
            this.flybyJets = [];
        }

        // If that was the last active jet, stop encounter music immediately
        if (this.jetEncounterMusic?.isPlaying && (this.jets?.length || 0) === 0) {
            this.stopJetEncounterMusic();
        }
    }

    attachReindeer() {
        if (!this.santa?.sprite?.active) return;
        // Create an attached reindeer sprite that follows Santa
        const r = this.add.image(this.santa.sprite.x + 70, this.santa.sprite.y + 5, 'reindeer');
        r.setOrigin(0.5, 0.5);
        r.setDepth(11);
        r.setScale(0.10);
        // Face left to match sleigh direction; purely cosmetic while attached
        r.setFlipX(false);
        this.reindeerAttachedSprites.push(r);
    }

    launchReindeer() {
        // Cooldown between shots
        if (this.reindeerShotCooldownLeftMs > 0) return;

        // Launch only if we have at least one attached reindeer
        if (this.reindeerAttachedSprites.length <= 0) return;
        if (!this.santa?.sprite?.active) return;

        // Remove one attached reindeer (use last)
        const r = this.reindeerAttachedSprites.pop();
        if (r) r.destroy();

        // Spawn projectile at the front of the sleigh
        const startX = this.santa.sprite.x + 90;
        const startY = this.santa.sprite.y + 2;
        const proj = new ReindeerProjectile(this, startX, startY);
        this.reindeerProjectiles.push(proj);
        this.reindeerShotCooldownLeftMs = this.reindeerShotCooldownMs;

        // Start / extend recharge requirement: 5 delivered presents per reindeer to restore
        this.reindeerRechargeNeeded++;

        // Show recharge bar (only after a launch)
        this.reindeerBarBg.setVisible(true);
        this.reindeerBarFill.setVisible(true);
    }

    deliverPresent(house) {
        // Only deliver if Santa has presents
        if (!this.santa || !this.santa.consumePresent()) {
            return;
        }

        house.markDelivered();
        this.score++;

        // Reindeer recharge: deliver 5 presents to restore one launched reindeer
        if (this.reindeerRechargeNeeded > 0) {
            this.reindeerRechargeProgress++;
            if (this.reindeerRechargeProgress >= 5) {
                this.reindeerRechargeProgress = 0;
                this.reindeerRechargeNeeded = Math.max(0, this.reindeerRechargeNeeded - 1);
                // Restore one reindeer (if we have unlocked it but it's currently missing)
                const missing = this.reindeerUnlocked - this.reindeerAttachedSprites.length;
                if (missing > 0) {
                    this.attachReindeer();
                }
            }
        }
        
        // Visual feedback - show score popup
        const popup = this.add.text(house.sprite.x, house.sprite.y - 40, '+1', {
            fontSize: '32px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3
        });
        
        // Animate popup
        this.tweens.add({
            targets: popup,
            y: popup.y - 30,
            alpha: 0,
            duration: 500,
            onComplete: () => popup.destroy()
        });
    }

    updateUI() {
        this.scoreText.setText('Score: ' + this.score);
        this.livesText.setText('Lives: ' + this.lives);
        if (this.presentsText && this.santa) {
            this.presentsText.setText(`Presents: ${this.santa.presents}/${this.santa.maxPresents}`);
        }

        // Reindeer recharge bar positioning + fill
        if (this.reindeerBarBg && this.reindeerBarFill && this.santa?.sprite?.active) {
            const show = this.reindeerRechargeNeeded > 0;
            this.reindeerBarBg.setVisible(show);
            this.reindeerBarFill.setVisible(show);
            if (show) {
                // Position where a front reindeer would be
                const x = this.santa.sprite.x + 90;
                const y = this.santa.sprite.y - 32;
                this.reindeerBarBg.setPosition(x, y);
                this.reindeerBarFill.setPosition(x, y);

                const pct = Phaser.Math.Clamp(this.reindeerRechargeProgress / 5, 0, 1);
                this.reindeerBarFill.width = 62 * pct;
                // Keep left anchored visually by shifting
                this.reindeerBarFill.x = x - (62 - this.reindeerBarFill.width) / 2;
            }
        }
    }

    updateKINAttacks() {
        // KIN: wasteland forever, Krampus doesn't spawn. Every 10s trigger one Krampus attack.
        if (!this.isKIN) return;
        if (this.gameOver || this.gameWon) return;
        if (this.gamePaused) return;
        if (this.biome !== 'wasteland') return;

        if (!this.kinNextAttackAt) {
            this.kinNextAttackAt = this.time.now + this.kinAttackEveryMs;
        }

        if (this.time.now >= this.kinNextAttackAt) {
            // Prevent overlapping chains just like boss fight
            const chainActive = !!(this.krampusChain?.sprite?.active);
            const roll = Phaser.Math.Between(0, 99);
            if (roll < 30 && !chainActive) {
                this.krampusAttackChainGrab();
            } else if (roll < 60) {
                this.krampusAttackIcicles();
            } else if (roll < 85) {
                this.krampusAttackFreezingWind();
            } else {
                this.krampusAttackSnowstorm();
            }
            this.kinNextAttackAt = this.time.now + this.kinAttackEveryMs;
        }
    }

    updateDevLaser(deltaMs) {
        if (!this.showHitboxes) {
            this.devLaserGfx?.setVisible(false);
            this.devLaserTickMs = 0;
            return;
        }
        if (!this.keyDevLaser) return;
        if (!this.santa?.sprite?.active) return;

        const dtMs = (deltaMs ?? this.game.loop.delta);
        const holding = this.keyDevLaser.isDown;

        if (!holding) {
            this.devLaserGfx?.setVisible(false);
            this.devLaserTickMs = 0;
            return;
        }

        const w = this.cameras.main.width;
        const startX = this.santa.sprite.x + 70;
        const y = this.santa.sprite.y + 2;
        const endX = w + 10;

        // Draw beam
        if (this.devLaserGfx) {
            this.devLaserGfx.setVisible(true);
            this.devLaserGfx.clear();
            this.devLaserGfx.lineStyle(6, 0xff3355, 0.55);
            this.devLaserGfx.beginPath();
            this.devLaserGfx.moveTo(startX, y);
            this.devLaserGfx.lineTo(endX, y);
            this.devLaserGfx.strokePath();
            this.devLaserGfx.lineStyle(2, 0xffffff, 0.75);
            this.devLaserGfx.beginPath();
            this.devLaserGfx.moveTo(startX, y);
            this.devLaserGfx.lineTo(endX, y);
            this.devLaserGfx.strokePath();
        }

        // Damage tick every 0.5s while held
        this.devLaserTickMs += dtMs;
        while (this.devLaserTickMs >= this.devLaserCooldownMs) {
            this.devLaserTickMs -= this.devLaserCooldownMs;
            this.devLaserDamageTick(startX, y, endX);
        }
    }

    devLaserDamageTick(startX, y, endX) {
        const beam = new Phaser.Geom.Rectangle(startX, y - 6, endX - startX, 12);

        // Basic jets
        for (let i = this.jets.length - 1; i >= 0; i--) {
            const jet = this.jets[i];
            if (!jet?.sprite?.active) continue;
            if (Phaser.Geom.Rectangle.Overlaps(beam, jet.sprite.getBounds())) {
                jet.destroy();
                this.jets.splice(i, 1);
                this.onJetDowned();
            }
        }

        // Elite jets (treat as killable by dev laser; permanent removal)
        for (let idx = 0; idx < (this.eliteJets?.length || 0); idx++) {
            const ej = this.eliteJets[idx];
            if (!ej?.sprite?.active) continue;
            if (Phaser.Geom.Rectangle.Overlaps(beam, ej.sprite.getBounds())) {
                ej.destroy();
                this.eliteJets[idx] = null;
                this.eliteJetDowned[idx] = true;
                this.nextEliteAt[idx] = null;
            }
        }

        // Wendigos
        for (let i = this.wendigos.length - 1; i >= 0; i--) {
            const wd = this.wendigos[i];
            if (!wd?.sprite?.active) continue;
            if (Phaser.Geom.Rectangle.Overlaps(beam, wd.sprite.getBounds())) {
                wd.destroy();
                this.wendigos.splice(i, 1);
            }
        }

        // Krampus boss
        if (this.krampus?.active && Phaser.Geom.Rectangle.Overlaps(beam, this.krampus.getBounds())) {
            this.damageKrampus(1);
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameOverText.setVisible(true);

        this.submitScoreIfNeeded();
    }

    async submitScoreIfNeeded() {
        if (this.scoreSubmitted) return;
        this.scoreSubmitted = true;

        try {
            const { getPlayerName, submitScoreOnce } = await import('../services/leaderboard.js');
            const name = getPlayerName() || 'Anonymous';
            await submitScoreOnce({ name, score: this.score, mode: this.mode });
        } catch (e) {
            // Ignore leaderboard errors (offline/misconfigured)
        }
    }

    togglePause() {
        this.manualPaused = !this.manualPaused;
        this.syncPauseState();
    }

    syncPauseState() {
        this.gamePaused = !!(this.manualPaused || this.tooltipPaused);
        const paused = this.gamePaused;

        // Visual overlays
        const showDevMenu = this.manualPaused && !this.tooltipPaused && this.showHitboxes;
        const showManual = this.manualPaused && !this.tooltipPaused && !showDevMenu;
        if (this.pauseBackdrop) this.pauseBackdrop.setVisible(showManual);
        if (this.pauseText) this.pauseText.setVisible(showManual);
        if (this.tooltipBackdrop) this.tooltipBackdrop.setVisible(this.tooltipPaused);
        if (this.tooltipPanel) this.tooltipPanel.setVisible(this.tooltipPaused);
        if (this.tooltipText) this.tooltipText.setVisible(this.tooltipPaused);
        if (this.devMenu) this.devMenu.setVisible(showDevMenu);

        // Pause any active tweens (score popups etc.)
        if (this.tweens) {
            if (paused) {
                this.tweens.pauseAll();
            } else {
                this.tweens.resumeAll();
            }
        }

        // Pause/resume music with the game (Space pause or tooltip pauses)
        if (this.sound) {
            try {
                if (paused && !this.musicPausedByGame) {
                    this.sound.pauseAll();
                    this.musicPausedByGame = true;
                } else if (!paused && this.musicPausedByGame) {
                    this.sound.resumeAll();
                    this.musicPausedByGame = false;
                }
            } catch (e) {
                // ignore
            }
        }

        // If we just resumed, start any queued music and sync to current biome/encounters.
        if (!paused) {
            this.maybeStartPendingMusic();
            this.updateMusic?.(true);
        }
    }

    showTooltip(message, durationMs = 2000) {
        this.tooltipPaused = true;
        if (this.tooltipText) this.tooltipText.setText(message || '');
        this.syncPauseState();

        // Reset timer if we're already showing one
        if (this._tooltipTimer) {
            this._tooltipTimer.remove(false);
            this._tooltipTimer = null;
        }

        this._tooltipTimer = this.time.delayedCall(durationMs, () => {
            this.tooltipPaused = false;
            this.syncPauseState();
        });
    }

    // -----------------
    // Music helpers
    // -----------------
    startMusicIfNeeded() {
        if (this.musicStarted) return;
        if (!this.sound) return;

        // If still locked, wait for unlock (this happens on a user gesture)
        if (this.sound.locked) {
            try {
                this.sound.once('unlocked', () => this.startMusicIfNeeded());
                this.sound.unlock();
            } catch (e) {
                // ignore
            }
            return;
        }

        this.musicStarted = true;

        // Create/reuse sounds (TitleScene may have already started base music)
        this.baseMusic = this.sound.get?.('music_santa') || this.sound.add('music_santa', { loop: true, volume: 0 });
        this.jetEncounterMusic = this.sound.get?.('music_jet') || this.sound.add('music_jet', { loop: true, volume: 0 });
        this.eliteEncounterMusic = this.sound.get?.('music_elite') || this.sound.add('music_elite', { loop: true, volume: 0 });
        // Krampus uses custom looping (first play from 0, subsequent repeats start at 18s)
        this.krampusMusic = this.sound.get?.('music_krampus') || this.sound.add('music_krampus', { loop: false, volume: 0 });
        try { this.krampusMusic.setLoop(false); } catch (e) {}

        this.baseMusicKey = 'music_santa';
        if (!this.baseMusic.isPlaying) this.baseMusic.play();
        this.fadeSound(this.baseMusic, this.baseTargetVol, 900);
    }

    maybeStartPendingMusic() {
        // Start base music if we queued it (e.g., from TitleScene) and we're not paused.
        if (this.pendingStartMusic && !this.gamePaused) {
            this.pendingStartMusic = false;
            this.startMusicIfNeeded();
        }
        // Force-start Krampus music after a dev teleport once we resume.
        if (this.pendingKrampusStart && !this.gamePaused) {
            this.pendingKrampusStart = false;
            this.forceStartKrampusMusic?.();
        }
    }

    updateMusic(allowStart = true) {
        if (!this.musicStarted) return;
        // While paused (tooltips/dev menu), don't start/stop tracks; pause system handles audio.
        if (!allowStart || this.gamePaused) return;

        // Krampus overrides all other music in wasteland (225+)
        if (this.biome === 'wasteland') {
            // KIN uses normal background music even in wasteland
            if (this.isKIN) {
                if (this.krampusMusic?.isPlaying) {
                    this.fadeSound(this.krampusMusic, 0, 700, () => {
                        try { this.krampusMusic.stop(); } catch (e) {}
                    });
                }
            } else {
            if (this.jetEncounterActive || this.jetEncounterMusic?.isPlaying) this.stopJetEncounterMusic(true);
            if (this.eliteEncounterActive || this.eliteEncounterMusic?.isPlaying) this.stopEliteEncounterMusic(true);
            // Fade out base entirely
            if (this.baseMusic?.isPlaying) this.fadeSound(this.baseMusic, 0, 700);
            this.ensureKrampusMusicPlaying(false);
            return;
            }
        } else {
            // Not in wasteland: ensure krampus music is stopped
            if (this.krampusMusic?.isPlaying) {
                this.fadeSound(this.krampusMusic, 0, 700, () => {
                    try { this.krampusMusic.stop(); } catch (e) {}
                });
            }
        }

        // Base soundtrack:
        // - World 1: forest/wasteland are night music
        // - KIN: always SantaSurvival background music (wasteland visuals)
        const shouldForest = !this.isKIN && (this.biome === 'forest' || this.biome === 'wasteland');
        const desiredKey = shouldForest ? 'music_forest' : 'music_santa';
        if (this.baseMusicKey !== desiredKey) {
            this.switchBaseMusic(desiredKey);
        }

        // Safety: if no encounters are active, ensure base music is audible and playing.
        if (!this.isAnyEncounterPlaying()) {
            if (this.baseMusic && !this.baseMusic.isPlaying) {
                try { this.baseMusic.play(); } catch (e) {}
            }
            if (this.baseMusic?.isPlaying && this.baseMusic.volume < this.baseTargetVol - 0.05) {
                this.fadeSound(this.baseMusic, this.baseTargetVol, 600);
            }
        }

        // Jet encounter: stop once all jets are gone
        if (this.jetEncounterActive && (this.jets?.length || 0) === 0) {
            this.stopJetEncounterMusic();
        }

        // Elite encounter: stop once all elite jets are gone
        if (this.eliteEncounterActive) {
            const anyElite = (this.eliteJets || []).some((j) => j?.sprite?.active);
            if (!anyElite) this.stopEliteEncounterMusic();
        }
    }

    isAnyEncounterPlaying() {
        // Use explicit flags (Phaser audio can occasionally report isPlaying=true even after a stop during fades)
        return !!(this.jetEncounterActive || this.eliteEncounterActive);
    }

    switchBaseMusic(key) {
        if (!this.musicStarted) return;
        if (!this.sound) return;
        if (this.baseMusicKey === key) return;

        const old = this.baseMusic;
        const oldKey = this.baseMusicKey;
        this.baseMusicKey = key;

        const next = this.sound.add(key, { loop: true, volume: 0 });
        this.baseMusic = next;
        next.play();

        // Crossfade (if an encounter is active, base stays faded out)
        const target = this.isAnyEncounterPlaying() ? this.duckedBaseVol : this.baseTargetVol;
        this.fadeSound(next, target, 1200);
        if (old) {
            this.fadeSound(old, 0, 1200, () => {
                try { old.stop(); old.destroy(); } catch (e) {}
            });
        }
    }

    startJetEncounterMusic() {
        if (!this.musicStarted) return;
        if (!this.jetEncounterMusic) return;
        // Krampus overrides encounters
        if (this.biome === 'wasteland' || this.krampusMusic?.isPlaying) return;

        // If elite encounter is playing, prioritize it
        if (this.eliteEncounterMusic?.isPlaying) return;

        this.jetEncounterActive = true;
        if (!this.jetEncounterMusic.isPlaying) {
            const seek = this.randomSeek(this.jetEncounterMusic);
            this.jetEncounterMusic.play({ seek, loop: true, volume: 0 });
        }

        // True crossfade: base to 0, encounter up
        this.fadeSound(this.baseMusic, this.duckedBaseVol, 600);
        this.fadeSound(this.jetEncounterMusic, this.encounterVol, 600);
    }

    stopJetEncounterMusic(suppressBaseRestore = false) {
        if (!this.jetEncounterMusic) return;
        this.jetEncounterActive = false;
        this.fadeSound(this.jetEncounterMusic, 0, 700, () => {
            try { this.jetEncounterMusic.stop(); } catch (e) {}
        });
        // Safety: hard-stop shortly after fade to avoid rare “stuck playing at 0 volume” states
        this.time.delayedCall(900, () => {
            try { if (this.jetEncounterMusic?.isPlaying) this.jetEncounterMusic.stop(); } catch (e) {}
        });
        // Restore base if elite isn't playing
        if (!suppressBaseRestore && !this.eliteEncounterActive) {
            this.fadeSound(this.baseMusic, this.baseTargetVol, 900);
        }
    }

    startEliteEncounterMusic() {
        if (!this.musicStarted) return;
        if (!this.eliteEncounterMusic) return;
        // Krampus overrides encounters
        if (this.biome === 'wasteland' || this.krampusMusic?.isPlaying) return;

        // Elite encounter overrides jet encounter
        if (this.jetEncounterActive || this.jetEncounterMusic?.isPlaying) {
            // Don't restore base here; elite is about to take over
            this.stopJetEncounterMusic(true);
        }

        this.eliteEncounterActive = true;
        if (!this.eliteEncounterMusic.isPlaying) {
            const seek = this.randomSeek(this.eliteEncounterMusic);
            this.eliteEncounterMusic.play({ seek, loop: true, volume: 0 });
        }

        // True crossfade: base to 0, encounter up
        this.fadeSound(this.baseMusic, this.duckedBaseVol, 600);
        this.fadeSound(this.eliteEncounterMusic, this.eliteEncounterVol, 600);
    }

    stopEliteEncounterMusic(suppressResume = false) {
        if (!this.eliteEncounterMusic) return;
        this.eliteEncounterActive = false;
        this.fadeSound(this.eliteEncounterMusic, 0, 700, () => {
            try { this.eliteEncounterMusic.stop(); } catch (e) {}
        });
        // Safety hard-stop
        this.time.delayedCall(900, () => {
            try { if (this.eliteEncounterMusic?.isPlaying) this.eliteEncounterMusic.stop(); } catch (e) {}
        });
        if (suppressResume) return;
        // If regular jets are still active, resume their encounter music (elite had priority).
        if ((this.jets?.length || 0) > 0) {
            // Keep base faded out; jet encounter will fade in.
            this.fadeSound(this.baseMusic, this.duckedBaseVol, 500);
            this.time.delayedCall(720, () => this.startJetEncounterMusic());
        } else {
            this.fadeSound(this.baseMusic, this.baseTargetVol, 900);
        }
    }

    randomSeek(sound) {
        try {
            const d = sound?.duration || 0;
            if (!d || d < 8) return 0;
            return Phaser.Math.FloatBetween(0, Math.max(0, d - 6));
        } catch (e) {
            return 0;
        }
    }

    fadeSound(sound, target, ms, onComplete = null) {
        if (!sound) return;
        const start = typeof sound.volume === 'number' ? sound.volume : 0;
        const dur = Math.max(1, ms || 1);
        const steps = 20;
        const stepMs = dur / steps;
        let i = 0;

        // Cancel any existing fade timer on this sound
        if (sound._fadeTimer) {
            try { sound._fadeTimer.remove(false); } catch (e) {}
            sound._fadeTimer = null;
        }

        sound._fadeTimer = this.time.addEvent({
            delay: stepMs,
            repeat: steps - 1,
            callback: () => {
                i++;
                const t = Phaser.Math.Clamp(i / steps, 0, 1);
                const v = Phaser.Math.Linear(start, target, t);
                try { sound.setVolume(v); } catch (e) {}
                if (i >= steps) {
                    sound._fadeTimer = null;
                    if (onComplete) onComplete();
                }
            }
        });
    }

    devGrantPickup(kind) {
        if (this.gameOver) return;
        if (!this.santa?.sprite?.active) return;

        if (kind === 'balloon') {
            // Same effect as collecting a balloon present: restock to max
            this.santa.restock?.();
            return;
        }

        if (kind === 'reindeer') {
            // Prefer unlocking up to 3; otherwise just restore an attached one if missing
            if (this.reindeerUnlocked < 3) {
                this.reindeerUnlocked++;
                this.attachReindeer();
                return;
            }
            const missing = this.reindeerUnlocked - this.reindeerAttachedSprites.length;
            if (missing > 0) {
                this.attachReindeer();
            }
            return;
        }

        if (kind === 'coal') {
            this.coalLauncherMounted = true;
            this.coalCooldownLeftMs = 0;
            if (this.coalLauncherPickup) {
                this.coalLauncherPickup.destroy?.();
                this.coalLauncherPickup = null;
            }
            return;
        }

        if (kind === 'shield') {
            this.shieldUnlocked = true;
            this.shieldEnergyMs = this.shieldMaxActiveMs; // full (3s)
            this.shieldDepletedLockout = false;
            this.shieldHoldExceeded = false;
            if (this.shieldPickup) {
                this.shieldPickup.destroy?.();
                this.shieldPickup = null;
            }
        }
    }

    devSpawnEnemy(kind) {
        if (this.gameOver) return;
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        if (kind === 'basicjet') {
            const spawnX = w + 140;
            const spawnY = Phaser.Math.Between(60, h - 60);
            const hoverX = w - 160;
            const hoverY = Phaser.Math.Between(60, h - 60);
            const jet = new FighterJet(this, spawnX, spawnY, { bulletsList: this.bullets, scale: 0.18, depth: 9, flipX: false });
            const hoverMs = Phaser.Math.Between(1800, 2600);
            jet.startApproach(hoverX, hoverY, 650, hoverMs);
            this.jets.push(jet);
            this.startJetEncounterMusic();
            return;
        }

        if (kind === 'elitejet') {
            // Spawn into first free slot
            const idx = this.eliteJets?.[0] ? (this.eliteJets?.[1] ? -1 : 1) : 0;
            if (idx === -1) return;
            // Allow spawning in dev even if previously "downed"
            this.eliteJetDowned[idx] = false;
            this.nextEliteAt[idx] = null;
            this.spawnEliteJet(idx, true);
            return;
        }

        if (kind === 'wendigo') {
            // Spawn on the landscape (ground) and within view so it's obvious
            this.spawnWendigo(w - 40, false);
        }
    }

    devTeleportStage(stage) {
        if (this.gameOver) return;

        const stageStart =
            stage === 'vegas'
                ? 75
                : (stage === 'forest'
                    ? 150
                    : (stage === 'wasteland' ? 225 : 0));
        this.housesPassed = stageStart;

        // If we teleport while paused, stop any encounter overlays immediately
        this.stopJetEncounterMusic?.(true);
        this.stopEliteEncounterMusic?.(true);

        // Clear transient world entities (keep player upgrades like reindeer/coal as-is)
        for (const h of this.houses || []) h?.destroy?.();
        this.houses = [];
        for (const b of this.washingtonBuildings || []) b?.destroy?.();
        this.washingtonBuildings = [];
        for (const b of this.area51Buildings || []) b?.destroy?.();
        this.area51Buildings = [];
        for (const jet of this.jets || []) jet?.destroy?.();
        this.jets = [];
        for (const fj of this.flybyJets || []) fj?.destroy?.();
        this.flybyJets = [];
        for (const bullet of this.bullets || []) bullet?.destroy?.();
        this.bullets = [];
        for (const bal of this.balloons || []) bal?.destroy?.();
        this.balloons = [];

        if (this.reindeerPickup) {
            this.reindeerPickup.destroy?.();
            this.reindeerPickup = null;
        }
        if (this.coalLauncherPickup) {
            this.coalLauncherPickup.destroy?.();
            this.coalLauncherPickup = null;
        }

        // Elite jets/missiles
        for (const ej of this.eliteJets || []) ej?.destroy?.();
        this.eliteJets = [null, null];
        for (const m of this.eliteMissiles || []) m?.destroy?.();
        this.eliteMissiles = [];
        this.nextEliteAt = [null, null];
        this.eliteJetDowned = [false, false];

        // Wendigos / dirt balls
        for (const w of this.wendigos || []) w?.destroy?.();
        this.wendigos = [];
        for (const d of this.dirtBalls || []) d?.destroy?.();
        this.dirtBalls = [];
        this.nextWendigoAt = null;

        // Reset event flags so the stage behaves predictably after teleport
        // If we're teleporting past early milestones, mark those events as already "done" so they don't spawn retroactively.
        this.washingtonSpawned = this.housesPassed >= 10;
        this.washingtonEnteredView = false;
        this.primaryWashingtonBuilding = null;
        this.jetWaveActive = false;
        this.postWaveHouseStart = null;
        this.flybyShownThisCycle = false;
        // Disable normal jet waves when teleporting beyond them (Krampus can still spawn jets via chain grab).
        this.jetsRemaining = (this.housesPassed >= 225) ? 0 : 2;

        this.area51Spawned = this.housesPassed >= 85;
        this.area51EnteredView = false;

        // Wasteland/Krampus scheduling
        if (stage === 'wasteland') {
            this.wastelandEnteredAt = this.housesPassed;
            this.krampusSpawnAt = this.housesPassed + 8;
        } else {
            this.wastelandEnteredAt = null;
            this.krampusSpawnAt = null;
        }

        // Biome/background switch immediately
        if (stage === 'vegas') {
            this.biome = 'vegas';
            this.switchToDesertBackground();
        } else if (stage === 'forest') {
            this.biome = 'forest';
            this.switchToForestBackground();
            this.nextWendigoAt = this.housesPassed; // spawn immediately
        } else if (stage === 'wasteland') {
            this.biome = 'wasteland';
            this.switchToWastelandBackground();
            this.nextWendigoAt = null;
        } else {
            this.biome = 'snow';
            this.createSnowBackground();
        }

        // Ensure music reacts immediately to teleports (works even while paused)
        try {
            if (this.sound?.locked) this.sound.unlock();
        } catch (e) {
            // ignore
        }
        this.startMusicIfNeeded?.();

        // Force-start Krampus music immediately when teleporting to wasteland
        if (stage === 'wasteland') {
            // If we're paused (dev menu), queue it for when we resume so it doesn't play under the menu.
            if (this.gamePaused) {
                this.pendingKrampusStart = true;
            } else {
                this.forceStartKrampusMusic?.();
            }
        } else {
            this.updateMusic?.(true);
        }

        // Reset spawn timers so it doesn't feel "stuck"
        this.houseSpawnTimer = 0;
        this.nextBalloonAt = 0;
        this.nextReindeerAt = Math.max(this.nextReindeerAt ?? 40, this.housesPassed + 1);
        if (!this.coalLauncherMounted) {
            this.nextCoalAt = Math.max(this.nextCoalAt ?? 105, this.housesPassed + 1);
            this.nextCoalRespawnAt = null;
        }
    }

    forceStartKrampusMusic() {
        if (!this.sound) return;
        // If audio hasn't started yet, updateMusic() can't do anything useful.
        if (!this.musicStarted) return;
        // Don't start while paused; queue for resume.
        if (this.gamePaused) {
            this.pendingKrampusStart = true;
            return;
        }

        // Ensure the sound object exists
        if (!this.krampusMusic) {
            try {
                this.krampusMusic = this.sound.add('music_krampus', { loop: true, volume: 0 });
            } catch (e) {
                return;
            }
        }

        // Stop other tracks immediately
        try { this.jetEncounterMusic?.stop(); } catch (e) {}
        try { this.eliteEncounterMusic?.stop(); } catch (e) {}
        try { this.baseMusic?.stop(); } catch (e) {}
        this.jetEncounterActive = false;
        this.eliteEncounterActive = false;

        // Start Krampus music now (with special loop behavior)
        this.ensureKrampusMusicPlaying(true);
    }

    ensureKrampusMusicPlaying(forceImmediate) {
        if (!this.krampusMusic) return;
        try { this.krampusMusic.setLoop(false); } catch (e) {}

        // Bind loop handler once: after first full playthrough, restart at 18s
        if (!this._krampusOnComplete) {
            this._krampusOnComplete = () => {
                if (!this.krampusMusic) return;
                if (this.biome !== 'wasteland') return;
                if (this.gamePaused) {
                    // Will be resumed by pause system; don't restart while paused.
                    return;
                }
                try {
                    this.krampusMusic.play({ seek: this.krampusLoopSeekSec, loop: false, volume: this.krampusTargetVol });
                } catch (e) {
                    try {
                        this.krampusMusic.setVolume(this.krampusTargetVol);
                        this.krampusMusic.play({ seek: this.krampusLoopSeekSec, loop: false });
                    } catch (e2) {}
                }
            };
        }

        try {
            // Ensure no duplicate listeners
            this.krampusMusic.off?.('complete', this._krampusOnComplete);
            this.krampusMusic.on?.('complete', this._krampusOnComplete);
        } catch (e) {
            // ignore
        }

        // Start if needed (first time from 0, then complete handler handles subsequent loops)
        if (!this.krampusMusic.isPlaying) {
            try {
                this.krampusMusic.play({ loop: false, volume: 0 });
            } catch (e) {
                try { this.krampusMusic.play(); } catch (e2) {}
            }
        }
        this.fadeSound(this.krampusMusic, this.krampusTargetVol, forceImmediate ? 150 : 900);
    }

    toggleHitboxes() {
        this.showHitboxes = !this.showHitboxes;
        if (this.hitboxGfx) {
            this.hitboxGfx.setVisible(this.showHitboxes);
            this.hitboxGfx.clear();
        }
        // Update dev menu visibility immediately if we're paused
        this.syncPauseState?.();
    }

    drawHitboxes() {
        if (!this.showHitboxes || !this.hitboxGfx) return;

        const g = this.hitboxGfx;
        g.clear();

        // Santa
        if (this.santa?.sprite?.active) {
            this.drawBodyOrBounds(g, this.santa.sprite, 0x00ff00);
        }

        // Houses
        for (const house of this.houses || []) {
            if (house?.sprite?.active) {
                this.drawBodyOrBounds(g, house.sprite, 0xffd700);
            }
        }

        // Balloons
        for (const b of this.balloons || []) {
            if (b?.sprite?.active) {
                this.drawBodyOrBounds(g, b.sprite, 0x00ffff);
            }
        }

        // Bullets
        for (const bullet of this.bullets || []) {
            if (bullet?.sprite?.active) {
                this.drawBodyOrBounds(g, bullet.sprite, 0xff00ff);
            }
        }

        // Jets (bounds only; no physics body)
        for (const jet of this.jets || []) {
            if (jet?.sprite?.active) {
                this.drawBodyOrBounds(g, jet.sprite, 0xff4444);
            }
        }

        // Reindeer pickup / projectiles (cyan-green)
        if (this.reindeerPickup?.sprite?.active) {
            this.drawBodyOrBounds(g, this.reindeerPickup.sprite, 0x33ffcc);
        }
        for (const p of this.reindeerProjectiles || []) {
            if (p?.sprite?.active) {
                this.drawBodyOrBounds(g, p.sprite, 0x66ff66);
            }
        }

        // Area 51 / elite jet / elite missiles
        for (const b of this.area51Buildings || []) {
            if (b?.sprite?.active) this.drawBodyOrBounds(g, b.sprite, 0x9966ff);
        }
        for (const ej of this.eliteJets || []) {
            if (ej?.sprite?.active) this.drawBodyOrBounds(g, ej.sprite, 0xff66aa);
        }
        for (const m of this.eliteMissiles || []) {
            if (m?.sprite?.active) this.drawBodyOrBounds(g, m.sprite, 0xffaa00);
        }

        // Coal launcher pickup / mounted / projectiles
        if (this.coalLauncherPickup?.sprite?.active) this.drawBodyOrBounds(g, this.coalLauncherPickup.sprite, 0x8888ff);
        if (this.coalLauncherMounted && this.coalSprite?.active) this.drawBodyOrBounds(g, this.coalSprite, 0x8888ff);
        for (const c of this.coalProjectiles || []) {
            if (c?.sprite?.active) this.drawBodyOrBounds(g, c.sprite, 0x222222);
        }

        // Wendigos / dirt balls
        for (const w of this.wendigos || []) {
            if (w?.sprite?.active) this.drawBodyOrBounds(g, w.sprite, 0xff9955);
        }
        for (const d of this.dirtBalls || []) {
            if (d?.sprite?.active) this.drawBodyOrBounds(g, d.sprite, 0x8b5a2b);
        }
    }

    fireCoal() {
        if (!this.coalLauncherMounted) return;
        if (this.coalCooldownLeftMs > 0) return;
        if (!this.santa?.sprite?.active) return;

        // Spawn from the muzzle area (adjusted for new scale/position)
        const startX = this.coalSprite.x + this.COAL_MUZZLE_X;
        const startY = this.coalSprite.y + this.COAL_MUZZLE_Y;
        const proj = new CoalProjectile(this, startX, startY);
        this.coalProjectiles.push(proj);
        this.coalCooldownLeftMs = this.coalCooldownMs;
    }

    explodeCoalAt(x, y) {
        const radius = 130;
        const r2 = radius * radius;

        // Smoke cloud persists and drifts left
        this.coalSmokeClouds.push(new CoalSmokeCloud(this, x, y));

        // Area damage: basic jets
        for (let j = this.jets.length - 1; j >= 0; j--) {
            const jet = this.jets[j];
            if (!jet?.sprite?.active) continue;
            const dx = jet.sprite.x - x;
            const dy = jet.sprite.y - y;
            if ((dx * dx + dy * dy) <= r2) {
                jet.destroy();
                this.jets.splice(j, 1);
                this.onJetDowned();
            }
        }
        // If coal removed the last jet, stop encounter music right away
        if (this.jetEncounterMusic?.isPlaying && (this.jets?.length || 0) === 0) {
            this.stopJetEncounterMusic();
        }

        // Area damage: elite jets
        for (let idx = 0; idx < (this.eliteJets?.length || 0); idx++) {
            const ej = this.eliteJets[idx];
            if (!ej?.sprite?.active) continue;
            const dx = ej.sprite.x - x;
            const dy = ej.sprite.y - y;
            if ((dx * dx + dy * dy) <= r2) {
                ej.destroy();
                this.eliteJets[idx] = null;
                if (this.isKIN) {
                    // In KIN, elites return (schedule reappearance)
                    this.eliteJetDowned[idx] = false;
                    this.nextEliteAt[idx] = this.housesPassed + Phaser.Math.Between(6, 11);
                    this.area51Spawned = true;
                    this.area51EnteredView = true;
                } else {
                    // World 1: permanently remove this elite jet (no more respawns)
                    this.eliteJetDowned[idx] = true;
                    this.nextEliteAt[idx] = null;
                }
            }
        }
        // If coal removed all elite jets, stop encounter music right away
        if (this.eliteEncounterMusic?.isPlaying) {
            const anyElite = (this.eliteJets || []).some((j) => j?.sprite?.active);
            if (!anyElite) this.stopEliteEncounterMusic();
        }

        // Area damage: elite missiles (each missile takes 1 damage from the blast)
        for (let mi = this.eliteMissiles.length - 1; mi >= 0; mi--) {
            const m = this.eliteMissiles[mi];
            if (!m?.sprite?.active) continue;
            const dx = m.sprite.x - x;
            const dy = m.sprite.y - y;
            if ((dx * dx + dy * dy) <= r2) {
                const destroyed = m.takeHit();
                if (destroyed) {
                    this.eliteMissiles.splice(mi, 1);
                }
            }
        }

        // Damage Krampus if in range
        if (this.krampus?.active) {
            const dx = this.krampus.x - x;
            const dy = this.krampus.y - y;
            if ((dx * dx + dy * dy) <= r2) {
                this.damageKrampus(1);
            }
        }
    }

    drawCoalCooldownRing() {
        if (!this.coalLauncherMounted || !this.coalCooldownGfx) return;
        if (!this.coalSprite?.visible) return;

        const g = this.coalCooldownGfx;
        g.clear();

        const x = this.coalSprite.x;
        const y = this.coalSprite.y;
        const r = 18;

        // background ring
        g.lineStyle(3, 0x000000, 0.35);
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.strokePath();

        const pct = 1 - (this.coalCooldownLeftMs / this.coalCooldownMs);
        if (pct > 0) {
            g.lineStyle(3, 0x00ff66, 0.9);
            g.beginPath();
            // start at -90deg
            g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
            g.strokePath();
        }
    }

    drawBodyOrBounds(g, sprite, color) {
        g.lineStyle(2, color, 0.9);
        const body = sprite.body;
        if (body) {
            g.strokeRect(body.x, body.y, body.width, body.height);
        } else if (sprite.getBounds) {
            const r = sprite.getBounds();
            g.strokeRect(r.x, r.y, r.width, r.height);
        }
    }
}

