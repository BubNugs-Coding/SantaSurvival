// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
    apiKey: "AIzaSyDcBFp29_1cg3Qkj2xtttpNRzvKYc_4PXY",
    authDomain: "santasurvival-5e617.firebaseapp.com",
    projectId: "santasurvival-5e617",
    storageBucket: "santasurvival-5e617.firebasestorage.app",
    messagingSenderId: "317252000254",
    appId: "1:317252000254:web:94beeb4beb1a25e2d488af",
    measurementId: "G-7EG5HD8TH5"
  };
 
  export function isFirebaseConfigured() {
    return !!firebaseConfig && typeof firebaseConfig.projectId === "string" && firebaseConfig.projectId.length > 0;
  }