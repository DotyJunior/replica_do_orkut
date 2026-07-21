import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

try {
  const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  console.log("=== WRITING TEST DOCUMENT TO FRIEND_REQUESTS ===");

  const runTest = async () => {
    try {
      const docRef = await addDoc(collection(db, 'friend_requests'), {
        senderId: 'lucas',
        receiverId: 'me',
        status: 'pending',
        createdAt: Date.now()
      });
      console.log("Successfully wrote document to friend_requests with ID:", docRef.id);

      // Now query doc back
      const snap = await getDocs(collection(db, 'friend_requests'));
      console.log(`\n--- Query results for friend_requests (${snap.size} docs) ---`);
      snap.forEach(d => {
        console.log(`Doc [${d.id}]:`, JSON.stringify(d.data()));
      });
      
    } catch (err: any) {
      console.error("Firebase Operation Failed:", err.message);
    }
    process.exit(0);
  };

  runTest();
} catch (error) {
  console.error("Initialization Error:", error);
  process.exit(1);
}
