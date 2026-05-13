import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "ghostrunner-demo.firebaseapp.com",
  projectId: "ghostrunner-demo",
  storageBucket: "ghostrunner-demo.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

if (__DEV__) {
  connectFirestoreEmulator(db, "localhost", 8080);
}
