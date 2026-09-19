// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyACzC08unGG21vit37CNKSacyAR9_wOPu8",
    authDomain: "mage-awakening-tracker.firebaseapp.com",
    projectId: "mage-awakening-tracker",
    storageBucket: "mage-awakening-tracker.firebasestorage.app",
    messagingSenderId: "281471792577",
    appId: "1:281471792577:web:060be101294d3924456b40",
    measurementId: "G-L1YM4J2HSQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);