import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';

export const firebaseConfig = {
  projectId: "varshithasales",
  appId: "1:427223674484:web:f531c906620067744b2b21",
  storageBucket: "varshithasales.firebasestorage.app",
  apiKey: "AIzaSyBSoRHXO3gyPT03T11E7hURDeP6Ounq7Pc",
  authDomain: "varshithasales.firebaseapp.com",
  messagingSenderId: "427223674484",
  projectNumber: "427223674484"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore Database
export const firestore = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  writeBatch,
  query,
  where,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  type FirebaseUser
};

