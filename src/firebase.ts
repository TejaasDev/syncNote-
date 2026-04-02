import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error('Firebase Auth Error:', error);
    
    // Notify the user about the error to help with debugging
    if (error.code === 'auth/popup-blocked') {
      alert('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      console.warn('Popup blocked, retrying with redirect...');
      const { signInWithRedirect } = await import('firebase/auth');
      return await signInWithRedirect(auth, googleProvider);
    } else if (error.code === 'auth/operation-not-allowed') {
      alert('Google Sign-In is not enabled in your Firebase Console. Please go to Authentication > Sign-in method and enable Google.');
    } else if (error.code === 'auth/unauthorized-domain') {
      alert('This domain is not authorized for authentication. Please add it (e.g. localhost) in the Firebase Console under Authentication > Settings > Authorized domains.');
    } else {
      alert(`Firebase Auth Error (${error.code}): ${error.message}`);
    }
    
    throw error;
  }
};
export const logout = () => signOut(auth);

// Firestore Error Handling Spec
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  theme: 'light' | 'dark' | 'blue' | 'green' | 'purple';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  collaborators: string[];
  isPublic: boolean;
  lastEditedBy: string;
  lastEditedAt: any;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface TodoList {
  id: string;
  title: string;
  ownerId: string;
  collaborators: string[];
  isPublic: boolean;
  lastEditedBy: string;
  lastEditedAt: any;
  items: TodoItem[];
}
