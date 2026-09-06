import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA5RvJaZDIKESPHKd2RYmPRkCBuQTexMQo",
  authDomain: "mensajes-8af47.firebaseapp.com",
  projectId: "mensajes-8af47",
  storageBucket: "mensajes-8af47.firebasestorage.app",
  messagingSenderId: "440657552890",
  appId: "1:440657552890:web:57d6f4217aabc48326f043"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, query, orderBy};