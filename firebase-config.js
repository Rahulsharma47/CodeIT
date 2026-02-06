// firebase-config.js
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut 
} = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc,
  serverTimestamp 
} = require('firebase/firestore');

// Your Firebase configuration
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "AIzaSyD3Z4yEBTm7VUfnnNb7-V3KezI-dc2xY7E",
    authDomain: "ai-code-debugger-cd684.firebaseapp.com",
    projectId: "ai-code-debugger-cd684",
    storageBucket: "ai-code-debugger-cd684.firebasestorage.app",
    messagingSenderId: "906397335820",
    appId: "1:906397335820:web:3e44a03ac3768bd7258929",
    measurementId: "G-MK6VS0N0CB"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export everything
module.exports = {
  app,
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  serverTimestamp
};

console.log('✅ Firebase initialized successfully!');