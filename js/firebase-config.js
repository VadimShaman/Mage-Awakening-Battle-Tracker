// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getDoc,
    arrayUnion,
    arrayRemove,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyACzC08unGG21vit37CNKSacyAR9_wOPu8",
    authDomain: "mage-awakening-tracker.firebaseapp.com",
    projectId: "mage-awakening-tracker",
    storageBucket: "mage-awakening-tracker.firebasestorage.app",
    messagingSenderId: "281471792577",
    appId: "1:281471792577:web:060be101294d3924456b40",
    measurementId: "G-L1YM4J2HSQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

signInAnonymously(auth).catch((err) => console.warn("Ошибка авторизации:", err));

export {
    db,
    auth,
    collection,
    addDoc,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    getDoc,
    arrayUnion,
    arrayRemove,
    deleteField
};