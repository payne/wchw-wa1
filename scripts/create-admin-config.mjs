#!/usr/bin/env node
/**
 * Create the admin config document in Firestore
 * Usage: node scripts/create-admin-config.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCJPHnFHDLOSoiwy8xqvZvVhFSwyF2Jato",
  authDomain: "wchw1-f9f49.firebaseapp.com",
  projectId: "wchw1-f9f49",
  storageBucket: "wchw1-f9f49.firebasestorage.app",
  messagingSenderId: "547498275498",
  appId: "1:547498275498:web:5eb52ff17518f74fc1f769"
};

const ADMIN_EMAILS = ['matt.n3pay@gmail.com', 'jim.kx0u@gmail.com'];

console.log('========================================');
console.log('  CREATE ADMIN CONFIG');
console.log('========================================');
console.log('');
console.log(`Project: ${firebaseConfig.projectId}`);
console.log(`Admin emails: ${ADMIN_EMAILS.join(', ')}`);
console.log('');

// Note: This requires authentication to write to Firestore
// For initial setup, we need to temporarily allow unauthenticated writes
// or use the Firebase Console

console.log('To create this document, please use the Firebase Console:');
console.log('');
console.log('1. Go to: https://console.firebase.google.com/project/wchw1-f9f49/firestore');
console.log('2. Click "Start collection" or "+ Add collection"');
console.log('3. Collection ID: config');
console.log('4. Document ID: admin');
console.log('5. Add field:');
console.log('   - Field name: adminEmails');
console.log('   - Type: array');
console.log('   - Values:');
ADMIN_EMAILS.forEach(email => console.log(`     - ${email}`));
console.log('');
console.log('Or temporarily update firestore.rules to allow the write,');
console.log('then run this script again after signing in through the web app.');
