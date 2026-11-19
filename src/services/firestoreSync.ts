import {
  firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot
} from './firebase';
import { AppDatabase, Employee, Product, Shop, Route, Category, Order, Visit, Holiday, AuditLog } from '../types';

let isSyncInitialized = false;

export const FirestoreSync = {
  // Sync individual document to Firestore
  async saveDocument(collectionName: string, id: string, data: any) {
    try {
      if (!id) return;
      const docRef = doc(firestore, collectionName, id);
      // Strip undefined values before saving to Firestore
      const cleanData = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, cleanData, { merge: true });
    } catch (err) {
      console.warn(`[FirestoreSync] Failed to save ${collectionName}/${id}:`, err);
    }
  },

  // Seed Firestore if collections are empty
  async seedInitialFirestore(db: AppDatabase) {
    try {
      const empSnapshot = await getDocs(collection(firestore, 'employees'));
      if (empSnapshot.empty) {
        console.log('[FirestoreSync] Seeding initial data to Cloud Firestore...');
        // Seed default super admin
        for (const emp of db.employees) {
          await this.saveDocument('employees', emp.id, emp);
        }
        // Seed settings
        await this.saveDocument('settings', 'business_settings', db.settings);
        // Seed any initial categories, products, shops, routes
        for (const cat of db.categories) await this.saveDocument('categories', cat.id, cat);
        for (const prod of db.products) await this.saveDocument('products', prod.id, prod);
        for (const shop of db.shops) await this.saveDocument('shops', shop.id, shop);
        for (const route of db.routes) await this.saveDocument('routes', route.id, route);
        for (const hol of db.holidays) await this.saveDocument('holidays', hol.id, hol);
        console.log('[FirestoreSync] Firestore seeding complete!');
      }
    } catch (err) {
      console.warn('[FirestoreSync] Error checking/seeding Firestore:', err);
    }
  },

  // Initialize real-time listeners for all collections
  initRealtimeSync(onUpdate: (updater: (prev: AppDatabase) => AppDatabase) => void) {
    if (isSyncInitialized) return;
    isSyncInitialized = true;

    console.log('[FirestoreSync] Starting real-time Firestore synchronization...');

    // 1. Employees Listener
    onSnapshot(collection(firestore, 'employees'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteEmployees = snapshot.docs.map(d => d.data() as Employee);
        onUpdate(prev => {
          const merged = [...prev.employees];
          remoteEmployees.forEach(rem => {
            const idx = merged.findIndex(e => e.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, employees: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Employees listener warning:', err));

    // 2. Products Listener
    onSnapshot(collection(firestore, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteProducts = snapshot.docs.map(d => d.data() as Product);
        onUpdate(prev => {
          const merged = [...prev.products];
          remoteProducts.forEach(rem => {
            const idx = merged.findIndex(p => p.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, products: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Products listener warning:', err));

    // 3. Categories Listener
    onSnapshot(collection(firestore, 'categories'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteCategories = snapshot.docs.map(d => d.data() as Category);
        onUpdate(prev => {
          const merged = [...prev.categories];
          remoteCategories.forEach(rem => {
            const idx = merged.findIndex(c => c.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, categories: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Categories listener warning:', err));

    // 4. Shops Listener
    onSnapshot(collection(firestore, 'shops'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteShops = snapshot.docs.map(d => d.data() as Shop);
        onUpdate(prev => {
          const merged = [...prev.shops];
          remoteShops.forEach(rem => {
            const idx = merged.findIndex(s => s.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, shops: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Shops listener warning:', err));

    // 5. Routes Listener
    onSnapshot(collection(firestore, 'routes'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteRoutes = snapshot.docs.map(d => d.data() as Route);
        onUpdate(prev => {
          const merged = [...prev.routes];
          remoteRoutes.forEach(rem => {
            const idx = merged.findIndex(r => r.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, routes: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Routes listener warning:', err));

    // 6. Orders Listener
    onSnapshot(collection(firestore, 'orders'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteOrders = snapshot.docs.map(d => d.data() as Order);
        onUpdate(prev => {
          const merged = [...prev.orders];
          remoteOrders.forEach(rem => {
            const idx = merged.findIndex(o => o.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          return { ...prev, orders: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Orders listener warning:', err));

    // 7. Visits Listener
    onSnapshot(collection(firestore, 'visits'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteVisits = snapshot.docs.map(d => d.data() as Visit);
        onUpdate(prev => {
          const merged = [...prev.visits];
          remoteVisits.forEach(rem => {
            const idx = merged.findIndex(v => v.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, visits: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Visits listener warning:', err));

    // 8. Holidays Listener
    onSnapshot(collection(firestore, 'holidays'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteHolidays = snapshot.docs.map(d => d.data() as Holiday);
        onUpdate(prev => {
          const merged = [...prev.holidays];
          remoteHolidays.forEach(rem => {
            const idx = merged.findIndex(h => h.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, holidays: merged };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Holidays listener warning:', err));

    // 9. Settings Listener
    onSnapshot(collection(firestore, 'settings'), (snapshot) => {
      const settingsDoc = snapshot.docs.find(d => d.id === 'business_settings');
      if (settingsDoc) {
        const remoteSettings = settingsDoc.data();
        onUpdate(prev => ({ ...prev, settings: { ...prev.settings, ...remoteSettings } }));
      }
    }, (err) => console.warn('[FirestoreSync] Settings listener warning:', err));

    // 10. Audit Logs Listener
    onSnapshot(collection(firestore, 'audit_logs'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteLogs = snapshot.docs.map(d => d.data() as AuditLog);
        onUpdate(prev => {
          const merged = [...prev.auditLogs];
          remoteLogs.forEach(rem => {
            const idx = merged.findIndex(l => l.id === rem.id);
            if (idx >= 0) merged[idx] = rem;
            else merged.push(rem);
          });
          return { ...prev, auditLogs: merged.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) };
        });
      }
    }, (err) => console.warn('[FirestoreSync] Audit logs listener warning:', err));
  }
};
