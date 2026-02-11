// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged  // Added
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import { getFirestore, doc, setDoc,getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyA8Yol3_pDhfmAxk1mg56HiHo1tQi43MII",
    authDomain: "healthmate-884bb.firebaseapp.com",
    projectId: "healthmate-884bb",
    storageBucket: "healthmate-884bb.firebasestorage.app",
    messagingSenderId: "942594876555",
    appId: "1:942594876555:web:ad7004d2dfaa821a10a08e",
    measurementId: "G-XCLFFRD1Z3"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
const auth = getAuth(app)
const db = getFirestore(app)

  // 3. Exported Functions (The only things the UI will see)
export const firebaseSignup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const firebaseLogin = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const firebaseLogout = () => {
    return signOut(auth);
};

// New function to save user details
export const saveUserDetails = async (uid, name, email) => {
    return await setDoc(doc(db, "users", uid), {
        fullName: name,
        email: email,
        createdAt: new Date().toISOString(),
        role: "user" // Useful for your quiz app later
    });
};
// --- 1. NAVIGATION PROTECTOR ---
export const monitorAuthState = (type) => {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user && type === 'auth')
                window.location.href = '../dashboard/dashboard.html';

            if (!user && type === 'private')
                window.location.href = '../index.html';

            resolve(user);
        });
    });
};
// Fetch User Profile Name
export const getUserData = async (uid) => {
    const docSnap = await getDoc(doc(db, "users", uid));
    console.log(docSnap)
    return docSnap.exists() ? docSnap.data() : null;
};