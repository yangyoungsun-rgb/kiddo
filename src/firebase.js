// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 환경변수(.env)로 관리하는 것을 권장하지만, 초기 테스트 시에는 직접 입력해도 됩니다.
const firebaseConfig = {
  apiKey: "AIzaSyCUnSBNnrbeuuPn-qKgS2X4yqcV1DptV_8",
  authDomain: "yacksu-kiddo-diet.firebaseapp.com",
  projectId: "yacksu-kiddo-diet",
  storageBucket: "yacksu-kiddo-diet.firebasestorage.app",
  messagingSenderId: "644924497737",
  appId: "1:644924497737:web:8739fdd72fb10c09e98498"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 및 Storage 인스턴스 내보내기 (다른 컴포넌트에서 사용)
export const db = getFirestore(app);
export const storage = getStorage(app);