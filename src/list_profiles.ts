import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'profiles'));
  snap.forEach(d => {
    console.log(`ID: ${d.id}, Handle: ${d.data().handle}, Name: ${d.data().displayName}`);
  });
}

run().catch(console.error);
