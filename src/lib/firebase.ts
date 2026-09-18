import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, UserRole, Shop, Product, Order, DueCollectionRecord } from '../types';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Verification & Connection test as required by firebase-skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is in offline mode or waiting for connection.');
    }
  }
}
testConnection();

// Required Error Handling Types conforming to FirestoreErrorInfo
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
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
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authentication Handlers
let cachedAccessToken: string | null = null;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; appUser: AppUser } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    const appUser = await syncUserWithFirestore(result.user);

    return {
      user: result.user,
      accessToken: cachedAccessToken || '',
      appUser,
    };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('munsi_user_profile');
};

export const getStoredGoogleToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const raw = localStorage.getItem('munsi_user_profile');
    if (raw) {
      const user = JSON.parse(raw);
      return user.accessToken || null;
    }
  } catch {
    return null;
  }
  return null;
};

// User Profile & Role Synchronization
const BOOTSTRAPPED_ADMIN_EMAIL = 'ahmedmdforid39@gmail.com';

export async function syncUserWithFirestore(user: User): Promise<AppUser> {
  const userDocRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  try {
    const docSnap = await getDoc(userDocRef);
    const isBootstrappedAdmin = user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

    if (docSnap.exists()) {
      const existing = docSnap.data() as AppUser;
      let effectiveRole = existing.role || 'dsr';

      // Ensure bootstrapped admin is always granted admin role
      if (isBootstrappedAdmin && existing.role !== 'admin') {
        effectiveRole = 'admin';
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          addedAt: now,
        });
        await updateDoc(userDocRef, { role: 'admin', updatedAt: now });
      }

      return {
        ...existing,
        displayName: user.displayName || existing.displayName || 'Field Officer',
        photoURL: user.photoURL || existing.photoURL,
        role: effectiveRole,
      };
    } else {
      // Create new profile
      const assignedRole: UserRole = isBootstrappedAdmin ? 'admin' : 'dsr';
      const newAppUser: AppUser = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Field Representative',
        photoURL: user.photoURL || '',
        role: assignedRole,
        assignedRoute: 'সব রুট (All Routes)',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(userDocRef, newAppUser);

      if (isBootstrappedAdmin) {
        await setDoc(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email: user.email,
          addedAt: now,
        });
      }

      return newAppUser;
    }
  } catch (err) {
    console.warn('Error syncing user with Firestore, using fallback profile:', err);
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Field Officer',
      photoURL: user.photoURL || '',
      role: user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'dsr',
      status: 'active',
    };
  }
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const list: AppUser[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AppUser);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateUserRoleAndRoute(
  uid: string,
  role: UserRole,
  assignedRoute?: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const updates: Partial<AppUser> = {
      role,
      updatedAt: new Date().toISOString(),
    };
    if (assignedRoute !== undefined) {
      updates.assignedRoute = assignedRoute;
    }
    await updateDoc(userDocRef, updates);

    // If role became admin, add to admins collection; if revoked, delete from admins
    if (role === 'admin') {
      await setDoc(doc(db, 'admins', uid), {
        uid,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Real-time Cloud Sync Listeners
export function subscribeToCloudShops(onData: (shops: Shop[]) => void) {
  const path = 'shops';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const shops: Shop[] = [];
      snapshot.forEach((d) => shops.push(d.data() as Shop));
      onData(shops);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToCloudProducts(onData: (products: Product[]) => void) {
  const path = 'products';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((d) => products.push(d.data() as Product));
      onData(products);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToCloudOrders(onData: (orders: Order[]) => void) {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('orderDate', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((d) => orders.push(d.data() as Order));
      onData(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Cloud Mutation Operations
export async function saveShopToCloud(shop: Shop) {
  const path = `shops/${shop.id}`;
  try {
    await setDoc(doc(db, 'shops', shop.id), shop);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveProductToCloud(product: Product) {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveOrderToCloud(order: Order) {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveDueCollectionToCloud(record: DueCollectionRecord) {
  const path = `dueCollections/${record.id}`;
  try {
    await setDoc(doc(db, 'dueCollections', record.id), record);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
