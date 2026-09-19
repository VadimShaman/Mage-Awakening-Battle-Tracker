// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, where, doc,
    updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "ВАШ_API_KEY",
    authDomain: "ВАШ_PROJECT.firebaseapp.com",
    projectId: "mage-tracker",
    storageBucket: "mage-tracker.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxx"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

signInAnonymously(auth).catch((err) => console.warn("Ошибка авторизации:", err));

export {
    db, auth,
    collection, addDoc, onSnapshot, query, where, doc,
    updateDoc, deleteDoc, serverTimestamp, getDoc, arrayUnion, arrayRemove
};