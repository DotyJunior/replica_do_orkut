import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  // Profiles
  const profilesSnap = await getDocs(collection(db, 'profiles'));
  console.log("--- PROFILES ---");
  profilesSnap.forEach(d => {
    console.log(`ID: ${d.id}, Handle: ${d.data().handle}`);
  });

  // Friend Requests
  const frSnap = await getDocs(collection(db, 'friend_requests'));
  console.log("\n--- FRIEND REQUESTS ---");
  frSnap.forEach(d => {
    console.log(`ID: ${d.id}, From: ${d.data().fromUserId || d.data().senderId}, To: ${d.data().toUserId || d.data().receiverId}, Status: ${d.data().status}`);
  });
}

run().catch(console.error);
