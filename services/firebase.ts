import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDiaskSXCR9RObX03rzJU0EH89YN1EKsCU",
  authDomain: "quanlykhoanoi.firebaseapp.com",
  projectId: "quanlykhoanoi",
  storageBucket: "quanlykhoanoi.firebasestorage.app",
  messagingSenderId: "822805188708",
  appId: "1:822805188708:web:0dedcb90e3aaab79d08f71",
  measurementId: "G-E8L4TFQN2K"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Kích hoạt Offline Persistence (Bộ nhớ đệm)
// Giúp app hoạt động offline và GIẢM chi phí đọc (read) khi reload trang
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

export { db, auth, app };