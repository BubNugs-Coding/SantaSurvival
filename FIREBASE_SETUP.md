# Firebase Leaderboard Setup (no accounts)

This project uses a **name-only leaderboard** with Firebase **Cloud Firestore**.

## 1) Create Firebase project + Web App
- Firebase Console → **Add project**
- Project settings → **Your apps** → **Web app** → register
- Copy the Web App config and paste it into:
  - `src/services/firebaseConfig.js`

## 2) Enable Firestore
- Build → **Firestore Database** → **Create database**

## 3) Firestore Rules (paste)
Firebase Console → Firestore → Rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{docId} {
      allow read: if true;

      // Allow create-only leaderboard entries with basic validation.
      allow create: if
        request.resource.data.keys().hasOnly(['name', 'score', 'mode', 'createdAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 1 &&
        request.resource.data.name.size() <= 24 &&
        request.resource.data.score is int &&
        request.resource.data.score >= 0 &&
        request.resource.data.score <= 999999 &&
        request.resource.data.mode in ['world1', 'kin'];

      allow update, delete: if false;
    }
  }
}
```

## 4) Notes
- This is intentionally **not secure against cheating** (anyone can submit any score).
- If you later want “real accounts” or anti-cheat, we can add Firebase Auth + server-side verification.


