
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
const auth = getAuth(app);

async function run() {
  // Wait for auth to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // const user = auth.currentUser;
  // if (!user) {
  //   console.log("No user logged in.");
  //   return;
  // }
  
  const profileId = 'me'; // Trying 'me'
  const profileRef = doc(db, 'profiles', profileId);
  let data: any;
  try {
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      console.log("No profile found.");
      return;
    }
    data = profileSnap.data();
    console.log("Data fetched successfully");
  } catch (e) {
    console.error("Error fetching profile:", e);
    return;
  }
  
  console.log("--- Music Data Inspection ---");
  
  const uploadedTracks = data.uploadedTracks || [];
  console.log("uploadedTracks[].url:", uploadedTracks.map((t: any) => t.url));
  
  const selectedTrack = data.selectedTrack;
  console.log("selectedTrack.url:", selectedTrack?.url);
  
  const listeningNow = data.listeningNow;
  console.log("listeningNow.url:", listeningNow?.url);
  
  console.log("-----------------------------");
}

run().catch(console.error);
