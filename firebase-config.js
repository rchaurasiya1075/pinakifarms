// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);
export { app };
