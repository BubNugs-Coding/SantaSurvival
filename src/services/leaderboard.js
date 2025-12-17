import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.js';

// Lazy-load Firebase from CDN (no npm install).
// Version pin is intentional for stability.
const FIREBASE_VERSION = '10.12.5';

let _firebase = null;
let _app = null;
let _db = null;

async function loadFirebase() {
    if (_firebase) return _firebase;
    const appMod = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const fsMod = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
    _firebase = { appMod, fsMod };
    return _firebase;
}

export async function initLeaderboard() {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase is not configured (missing projectId).');
    }
    if (_db) return _db;

    const { appMod, fsMod } = await loadFirebase();
    _app = _app || appMod.initializeApp(firebaseConfig);
    _db = _db || fsMod.getFirestore(_app);
    return _db;
}

export function getPlayerName() {
    try {
        const v = localStorage.getItem('ss_player_name');
        return (v && v.trim()) ? v.trim().slice(0, 24) : '';
    } catch (e) {
        return '';
    }
}

export function setPlayerName(name) {
    const clean = (name || '').toString().trim().slice(0, 24);
    try {
        localStorage.setItem('ss_player_name', clean);
    } catch (e) {
        // ignore
    }
    return clean;
}

export async function fetchTopScores({ limit = 10 } = {}) {
    const { fsMod } = await loadFirebase();
    const db = await initLeaderboard();

    const scoresRef = fsMod.collection(db, 'scores');
    const q = fsMod.query(scoresRef, fsMod.orderBy('score', 'desc'), fsMod.limit(Math.max(1, Math.min(50, limit))));
    const snap = await fsMod.getDocs(q);
    const out = [];
    snap.forEach((doc) => {
        const d = doc.data() || {};
        out.push({
            name: typeof d.name === 'string' ? d.name : '???',
            score: typeof d.score === 'number' ? d.score : 0,
            mode: typeof d.mode === 'string' ? d.mode : '',
            createdAt: d.createdAt || null
        });
    });
    return out;
}

export async function submitScoreOnce({ name, score, mode } = {}) {
    const { fsMod } = await loadFirebase();
    const db = await initLeaderboard();

    const cleanName = (name || '').toString().trim().slice(0, 24) || 'Anonymous';
    const cleanScore = Math.max(0, Math.min(999999, Math.floor(Number(score) || 0)));
    const cleanMode = (mode === 'kin') ? 'kin' : 'world1';

    const docRef = await fsMod.addDoc(fsMod.collection(db, 'scores'), {
        name: cleanName,
        score: cleanScore,
        mode: cleanMode,
        createdAt: fsMod.serverTimestamp()
    });
    return docRef.id;
}


