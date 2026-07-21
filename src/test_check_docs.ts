import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

try {
  const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  console.log("=== DB DIAGNOSTIC START ===");

  const checkDocs = async () => {
    try {
      const snap = await getDocs(collection(db, 'friend_requests'));
      console.log(`\n--- FRIEND_REQUESTS (${snap.size} docs) ---`);
      snap.forEach(d => {
        console.log(`Doc [${d.id}]:`, JSON.stringify(d.data()));
      });
    } catch (err: any) {
      console.error("Failed fetching friend_requests:", err.message);
    }
    process.exit(0);
  };

  checkDocs();
} catch (error) {
  console.error("Initialization Error:", error);
  process.exit(1);
}
