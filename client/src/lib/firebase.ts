import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJv9ftlQe7aSfeHeDsyScSVkMd0SYzAE0",
  authDomain: "pasumaicholai-auth.firebaseapp.com",
  projectId: "pasumaicholai-auth",
  storageBucket: "pasumaicholai-auth.firebasestorage.app",
  messagingSenderId: "243558780160",
  appId: "1:243558780160:web:442172adc355320673b7e5",
  measurementId: "G-F9776H6Z0K"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const analytics = getAnalytics(app);

export { RecaptchaVerifier, signInWithPhoneNumber };