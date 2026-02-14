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

import { getFirestore, doc, setDoc, getDoc,getDocs,addDoc,deleteDoc,updateDoc, collection,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

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

export const saveFamilyMember = async (uid, memberData) => {
    try {
        // Path: users -> [uid] -> family (Sub-collection)
        const familyRef = collection(db, "users", uid, "family");
        const docRef = await addDoc(familyRef, {
            ...memberData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error saving member:", error);
        return { success: false, error };
    }
};

// --- GET ALL FAMILY MEMBERS ---
export const getFamilyMembers = async (uid) => {
    try {
        const familyRef = collection(db, "users", uid, "family");
        const querySnapshot = await getDocs(familyRef);
        // Map the docs into a clean array
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching members:", error);
        return [];
    }
};

// --- DELETE FAMILY MEMBER ---
export const deleteFamilyMember = async (uid, memberId) => {
    try {
        const memberRef = doc(db, "users", uid, "family", memberId);
        await deleteDoc(memberRef);
        return { success: true };
    } catch (error) {
        console.error("Error deleting member:", error);
        return { success: false, error };
    }
};

export const getSingleMember = async (uid, memberId) => {
    try {
        // ERROR was here: If memberId is undefined, path is users/uid/family (3 segments)
        // Correct path must be users/uid/family/memberId (4 segments)
        if (!memberId) throw new Error("Member ID is missing!");

        const memberRef = doc(db, "users", uid, "family", memberId);
        const docSnap = await getDoc(memberRef);

        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
        console.error("Error fetching member:", error);
        return null;
    }
};

// --- UPDATE MEMBER DATA ---
export const updateMemberData = async (uid, memberId, updatedData) => {
    try {
        const memberRef = doc(db, "users", uid, "family", memberId);
        await updateDoc(memberRef, updatedData);
        return { success: true };
    } catch (error) {
        console.error("Error updating member:", error);
        return { success: false, error };
    }
};

// --- ADD NEW MEDICAL REPORT ---
export const uploadReportData = async (uid, memberId, reportData) => {
    try {
        const reportsRef = collection(db, "users", uid, "family", memberId, "reports");
        await addDoc(reportsRef, {
            ...reportData,
            createdAt: serverTimestamp() // Important for sorting by date
        });
        return { success: true };
    } catch (error) {
        console.error("Error saving report:", error);
        return { success: false };
    }
};