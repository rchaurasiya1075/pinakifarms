// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYy7OfmGGfnRllOcRvgjtClr0T845kqAA",
  authDomain: "pinaki-1fe56.firebaseapp.com",
  databaseURL: "https://pinaki-1fe56-default-rtdb.firebaseio.com",
  projectId: "pinaki-1fe56",
  storageBucket: "pinaki-1fe56.firebasestorage.app",
  messagingSenderId: "779330744487",
  appId: "1:779330744487:web:39f316a974b3f48b692b82",
  measurementId: "G-LW63K3V555"
};

const app = initializeApp(firebaseConfig);

// Auth Exports
export const auth = getAuth(app);
export { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
};

// Firestore Exports
export const db = getFirestore(app);
export { 
    collection,
    addDoc,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    getDoc
};

// Database Exports
export const database = getDatabase(app);
export { app };
