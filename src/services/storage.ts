import {
  Employee,
  Category,
  Subcategory,
  ProductType,
  Product,
  Route,
  Shop,
  Visit,
  Order,
  Holiday,
  RouteScheduleOverride,
  AuditLog,
  BusinessSettings,
  OrderItemSnapshot,
  AppDatabase
} from '../types';
import { FirestoreSync } from './firestoreSync';
import { FirebaseAuthService } from './firebaseAuth';

const STORAGE_KEY = 'sales_on_storage_clean_v1';
export const AUTH_SESSION_KEY = 'sales_on_auth_session_v1';
export type { AppDatabase };

// Clean production database for real operational data
const INITIAL_DATABASE: AppDatabase = {
  currentUserId: 'emp_admin',
  settings: {
    businessName: 'Varshitha Sales & Distributing Co.',
    tagline: 'Your Route. Our Growth.',
    address: 'Plot 42, Industrial Estate, Main Ring Road, Andhra Pradesh - 520001',
    phone: '7799225566',
    email: 'admin@varshithasales.com',
    gstin: '24AAAAA0000A1Z5',
    invoicePrefix: 'VS-2026-',
    nextInvoiceNumber: 101,
    currencySymbol: '₹',
    defaultTaxRate: 0,
    whatsappTemplate: 'Hello {shopName},\n\nThank you for ordering with Varshitha Sales!\nYour Order *#{orderNo}* (Invoice: *{invoiceNo}*) has been confirmed.\n\n*Amount: ₹{amount}*\nItems count: {itemCount}\nDate: {date}\n\nView Bill & Details: {link}\n\nHave a great business day!'
  },
  employees: [
    {
      id: 'emp_admin',
      employeeCode: 'ADM01',
      name: 'Varshitha Super Admin',
      email: 'admin@varshithasales.com',
      phone: '7799225566',
      password: 'id@varshitha123',
      role: 'super_admin',
      status: 'active',
      assignedRouteIds: [],
      joinedAt: '2026-01-01',
      permissions: {
        canAddShop: true,
        canEditShop: true,
        canAddCategory: true,
        canAddProduct: true,
        canChangePrice: true,
        canCancelOrder: true,
        canViewTeamOrders: true,
        canManageRoutes: true,
        canManageHolidays: true,
        canManageUsers: true,
        canViewReports: true,
        canExportData: true,
        canViewAuditLogs: true
      }
    }
  ],
  categories: [],
  subcategories: [],
  productTypes: [],
  products: [],
  routes: [],
  shops: [],
  visits: [],
  orders: [],
  holidays: [],
  scheduleOverrides: [],
  auditLogs: []
};

// Listeners for reactivity across components
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(cb => cb());
}

// Cross-tab / cross-window instant synchronization for orders & database changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      notify();
    }
  });
}

export const StorageService = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  initFirestore() {
    try {
      const current = this.getDb();
      FirestoreSync.seedInitialFirestore(current);
      FirestoreSync.initRealtimeSync((updater) => {
        const db = this.getDb();
        const updated = updater(db);
        this.saveDb(updated);
      });
    } catch (e) {
      console.warn('[StorageService] Error initializing Firestore:', e);
    }
  },

  isAuthenticated(): boolean {
    try {
      return !!(localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY));
    } catch {
      return false;
    }
  },

  login(
    identifier: string,
    password: string
  ): { success: boolean; message?: string; user?: Employee; targetView?: 'admin' | 'mobile' } {
    const cleanId = identifier.trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const cleanPass = password.trim();
    const db = this.getDb();

    // 1. Direct check for Admin Credentials (7799225566 & id@varshitha123)
    const isAdminIdentifier =
      cleanDigits === '7799225566' ||
      cleanId === '7799225566' ||
      cleanId.toLowerCase() === 'admin@varshithasales.com' ||
      cleanId.toUpperCase() === 'ADM01';

    if (isAdminIdentifier) {
      if (cleanPass === 'id@varshitha123') {
        let admin = db.employees.find((e) => e.id === 'emp_admin' || e.role === 'super_admin');
        if (!admin) {
          admin = INITIAL_DATABASE.employees[0];
          db.employees.unshift(admin);
        }
        admin.phone = '7799225566';
        admin.password = 'id@varshitha123';
        db.currentUserId = admin.id;
        this.saveDb(db);
        localStorage.setItem(
          AUTH_SESSION_KEY,
          JSON.stringify({ userId: admin.id, role: 'super_admin', loggedInAt: new Date().toISOString() })
        );
        FirestoreSync.saveDocument('employees', admin.id, admin);
        FirebaseAuthService.authenticateWithFirebase('7799225566', cleanPass, 'admin');
        notify();
        return { success: true, user: admin, targetView: 'admin' };
      } else {
        return {
          success: false,
          message: 'Incorrect Admin password. Admin login strictly requires the strong password (id@varshitha123). Last digits are not accepted for Admin.'
        };
      }
    }

    // 2. Check All Staff Accounts (created by Admin - strictly exclude Admin)
    const matched = db.employees.find((e) => {
      if (e.id === 'emp_admin' || e.role === 'super_admin' || (e.phone && e.phone.replace(/\D/g, '') === '7799225566')) {
        return false;
      }
      const empDigits = (e.phone || '').replace(/\D/g, '');
      return (
        (cleanDigits && (empDigits === cleanDigits || empDigits.endsWith(cleanDigits) || cleanDigits.endsWith(empDigits))) ||
        e.phone === cleanId ||
        (e.employeeCode && e.employeeCode.toLowerCase() === cleanId.toLowerCase()) ||
        (e.email && e.email.toLowerCase() === cleanId.toLowerCase())
      );
    });

    if (matched) {
      const empDigits = (matched.phone || '').replace(/\D/g, '');
      const last5 = empDigits.slice(-5);

      // Staff authentication succeeds if:
      // a) Password matches the custom password set/changed by Admin, OR
      // b) Password matches the last 5 digits of their phone number
      const isPasswordMatch =
        cleanPass === matched.password ||
        (last5 && cleanPass === last5);

      if (isPasswordMatch) {
        db.currentUserId = matched.id;
        this.saveDb(db);
        const isUserAdmin = matched.role === 'super_admin' || matched.role === 'admin';
        localStorage.setItem(
          AUTH_SESSION_KEY,
          JSON.stringify({ userId: matched.id, role: matched.role, loggedInAt: new Date().toISOString() })
        );
        FirebaseAuthService.authenticateWithFirebase(matched.phone, cleanPass, isUserAdmin ? 'admin' : 'staff');
        notify();
        return {
          success: true,
          user: matched,
          targetView: isUserAdmin ? 'admin' : 'mobile'
        };
      } else {
        return {
          success: false,
          message: `Incorrect password! For staff login, please enter the last 5 digits of your phone number (${last5 || 'XXXXX'}) or the password assigned by your Admin.`
        };
      }
    }

    return {
      success: false,
      message: 'Invalid Phone Number / Login ID or Password. Please verify your details.'
    };
  },

  logout() {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      FirebaseAuthService.signOut();
    } catch {}
    notify();
  },

  getDb(): AppDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATABASE));
        return INITIAL_DATABASE;
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.employees)) {
        // Remove pre-seeded sample staff members if they exist
        parsed.employees = parsed.employees.filter(
          (e: any) => e.id !== 'emp_ravi' && e.id !== 'emp_suresh' && e.id !== 'emp_ramesh'
        );

        const admin = parsed.employees.find((e: any) => e.id === 'emp_admin' || e.role === 'super_admin');
        if (admin) {
          admin.phone = '7799225566';
          admin.password = 'id@varshitha123';
        }

        // For staff with phone, ensure password exists (default to last 5 digits)
        parsed.employees.forEach((emp: any) => {
          if (emp.role !== 'super_admin' && emp.role !== 'admin' && !emp.password && emp.phone) {
            const digits = emp.phone.replace(/\D/g, '');
            if (digits.length >= 5) {
              emp.password = digits.slice(-5);
            }
          }
        });
      }
      if (parsed && Array.isArray(parsed.orders)) {
        parsed.orders.forEach((o: any) => {
          if (!o.deliveryStatus) o.deliveryStatus = 'delivered';
          if (!o.paymentStatus) o.paymentStatus = 'paid';
          if (o.amountPaid === undefined) o.amountPaid = o.paymentStatus === 'paid' ? o.grandTotal : 0;
        });
      }
      if (parsed && Array.isArray(parsed.routes)) {
        parsed.routes.forEach((r: any) => {
          if (!r.assignedEmployeeIds || r.assignedEmployeeIds.length === 0) {
            r.assignedEmployeeIds = r.assignedEmployeeId ? [r.assignedEmployeeId] : [];
          }
        });
      }
      if (parsed && Array.isArray(parsed.shops)) {
        parsed.shops.forEach((s: any, idx: number) => {
          if (!s.assignedEmployeeIds || !Array.isArray(s.assignedEmployeeIds)) {
            s.assignedEmployeeIds = s.assignedEmployeeId ? [s.assignedEmployeeId] : [];
          }
          if (!s.assignedEmployeeId) {
            const route = parsed.routes?.find((r: any) => r.id === s.routeId);
            if (route) {
              const agents = (route.assignedEmployeeIds && route.assignedEmployeeIds.length > 0)
                ? route.assignedEmployeeIds
                : (route.assignedEmployeeId ? [route.assignedEmployeeId] : []);
              if (agents.length > 0) {
                const shopIndexInRoute = route.orderedShopIds?.indexOf(s.id) ?? idx;
                const agentIdx = Math.max(0, shopIndexInRoute) % agents.length;
                s.assignedEmployeeId = agents[agentIdx];
                if (!s.assignedEmployeeIds.includes(s.assignedEmployeeId)) {
                  s.assignedEmployeeIds.push(s.assignedEmployeeId);
                }
              }
            }
          }
        });
      }
      if (parsed && Array.isArray(parsed.orders)) {
        parsed.orders.forEach((o: any) => {
          if (o.balanceDue === undefined) {
            o.balanceDue = Math.max(0, (o.grandTotal || 0) - (o.amountPaid || 0));
          }
        });
      }
      return parsed;
    } catch {
      return INITIAL_DATABASE;
    }
  },

  saveDb(db: AppDatabase) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    notify();
  },

  clearAllData() {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATABASE));
    notify();
  },

  resetToFactory() {
    this.clearAllData();
  },

  exportJson(): string {
    const db = this.getDb();
    return JSON.stringify(db, null, 2);
  },

  importJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.shops)) {
        this.saveDb(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Active User / Session
  getCurrentUser(): Employee {
    const db = this.getDb();
    const user = db.employees.find(e => e.id === db.currentUserId);
    return user || db.employees[0] || INITIAL_DATABASE.employees[0];
  },

  switchUser(userId: string) {
    const db = this.getDb();
    db.currentUserId = userId;
    this.saveDb(db);
  },

  // Audit Log helper
  logAction(
    action: AuditLog['action'],
    entityType: AuditLog['entityType'],
    entityId: string,
    summary: string,
    details?: any
  ) {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Manager' : 'Sales Executive',
      action,
      entityType,
      entityId,
      summary,
      details,
      timestamp: new Date().toISOString()
    };
    db.auditLogs.unshift(newLog);
    this.saveDb(db);
    FirestoreSync.saveDocument('audit_logs', newLog.id, newLog);
  },

  // PRODUCTS CRUD
  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const db = this.getDb();
    const newProduct: Product = {
      ...productData,
      stock: Number(productData.stock) >= 0 ? Number(productData.stock) : 0,
      expiryDate: productData.expiryDate?.trim() || undefined,
      lowStockThreshold: Number(productData.lowStockThreshold) > 0 ? Number(productData.lowStockThreshold) : 15,
      netAmount: productData.netAmount !== undefined ? Number(productData.netAmount) : undefined,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.products.unshift(newProduct);
    this.saveDb(db);
    FirestoreSync.saveDocument('products', newProduct.id, newProduct);
    this.logAction('ADD_PRODUCT', 'products', newProduct.id, `Added new product ${newProduct.name} (SKU: ${newProduct.sku}) at ₹${newProduct.sellPrice} with Initial Stock: ${newProduct.stock}`);
    return newProduct;
  },

  updateProduct(id: string, updates: Partial<Product>) {
    const db = this.getDb();
    const index = db.products.findIndex(p => p.id === id);
    if (index !== -1) {
      const old = db.products[index];
      const isPriceChanged = updates.sellPrice !== undefined && updates.sellPrice !== old.sellPrice;
      const isStockChanged = updates.stock !== undefined && updates.stock !== old.stock;
      db.products[index] = {
        ...old,
        ...updates,
        stock: updates.stock !== undefined ? Number(updates.stock) : old.stock,
        expiryDate: updates.expiryDate !== undefined ? (updates.expiryDate.trim() || undefined) : old.expiryDate,
        lowStockThreshold: updates.lowStockThreshold !== undefined ? Number(updates.lowStockThreshold) : (old.lowStockThreshold || 15),
        netAmount: updates.netAmount !== undefined ? Number(updates.netAmount) : old.netAmount,
        updatedAt: new Date().toISOString()
      };
      this.saveDb(db);
      FirestoreSync.saveDocument('products', id, db.products[index]);
      if (isPriceChanged && isStockChanged) {
        this.logAction('EDIT_PRODUCT', 'products', id, `Updated price to ₹${updates.sellPrice} and stock to ${updates.stock} for ${old.name}`);
      } else if (isPriceChanged) {
        this.logAction('UPDATE_PRICE', 'products', id, `Updated price for ${old.name} from ₹${old.sellPrice} to ₹${updates.sellPrice}`);
      } else if (isStockChanged) {
        this.logAction('UPDATE_STOCK', 'products', id, `Updated stock for ${old.name} from ${old.stock} to ${updates.stock}`);
      } else {
        this.logAction('EDIT_PRODUCT', 'products', id, `Updated product details for ${old.name}`);
      }
    }
  },

  updateProductStock(id: string, newStock: number) {
    const db = this.getDb();
    const product = db.products.find(p => p.id === id);
    if (product) {
      const oldStock = product.stock ?? 0;
      product.stock = Math.max(0, Number(newStock));
      product.updatedAt = new Date().toISOString();
      this.saveDb(db);
      FirestoreSync.saveDocument('products', id, product);
      this.logAction('UPDATE_STOCK', 'products', id, `Adjusted stock for ${product.name} from ${oldStock} to ${product.stock}`);
    }
  },

  deleteProduct(id: string) {
    const db = this.getDb();
    const prod = db.products.find(p => p.id === id);
    if (prod) {
      prod.active = false;
      prod.isDeleted = true;
      prod.updatedAt = new Date().toISOString();
      this.saveDb(db);
      FirestoreSync.saveDocument('products', id, prod);
      this.logAction('DELETE_PRODUCT', 'products', id, `Soft deleted product ${prod.name}`);
    }
  },

  restoreProduct(id: string) {
    const db = this.getDb();
    const prod = db.products.find(p => p.id === id);
    if (prod) {
      prod.active = true;
      prod.isDeleted = false;
      prod.updatedAt = new Date().toISOString();
      this.saveDb(db);
      FirestoreSync.saveDocument('products', id, prod);
      this.logAction('RESTORE_PRODUCT', 'products', id, `Restored product ${prod.name}`);
    }
  },

  // CATEGORIES CRUD
  addCategory(name: string, code: string): Category {
    const db = this.getDb();
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name,
      code,
      status: 'active',
      active: true,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };
    db.categories.push(newCat);
    this.saveDb(db);
    FirestoreSync.saveDocument('categories', newCat.id, newCat);
    return newCat;
  },

  updateCategory(id: string, updates: Partial<Category>) {
    const db = this.getDb();
    const index = db.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      db.categories[index] = { ...db.categories[index], ...updates };
      this.saveDb(db);
      FirestoreSync.saveDocument('categories', id, db.categories[index]);
    }
  },

  deleteCategory(id: string) {
    const db = this.getDb();
    const cat = db.categories.find(c => c.id === id);
    if (cat) {
      cat.status = 'inactive';
      cat.active = false;
      cat.isDeleted = true;
      this.saveDb(db);
      FirestoreSync.saveDocument('categories', id, cat);
      this.logAction('EDIT_PRODUCT', 'categories', id, `Soft deleted category ${cat.name}`);
    }
  },

  restoreCategory(id: string) {
    const db = this.getDb();
    const cat = db.categories.find(c => c.id === id);
    if (cat) {
      cat.status = 'active';
      cat.active = true;
      cat.isDeleted = false;
      this.saveDb(db);
      FirestoreSync.saveDocument('categories', id, cat);
      this.logAction('EDIT_PRODUCT', 'categories', id, `Restored category ${cat.name}`);
    }
  },

  // SHOPS CRUD
  addShop(shopData: Omit<Shop, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Shop {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const assignedIds = shopData.assignedEmployeeIds && shopData.assignedEmployeeIds.length > 0
      ? shopData.assignedEmployeeIds
      : (shopData.assignedEmployeeId ? [shopData.assignedEmployeeId] : []);
    const newShop: Shop = {
      ...shopData,
      id: `shop_${Date.now()}`,
      assignedEmployeeIds: assignedIds,
      assignedEmployeeId: assignedIds[0] || shopData.assignedEmployeeId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.shops.unshift(newShop);

    // Also attach to route if routeId is provided
    if (newShop.routeId) {
      const route = db.routes.find(r => r.id === newShop.routeId);
      if (route && !route.orderedShopIds.includes(newShop.id)) {
        route.orderedShopIds.push(newShop.id);
        FirestoreSync.saveDocument('routes', route.id, route);
      }
    }

    this.saveDb(db);
    FirestoreSync.saveDocument('shops', newShop.id, newShop);
    this.logAction('ADD_SHOP', 'shops', newShop.id, `Added new shop ${newShop.name} (${newShop.shopCode}) in ${newShop.address}`);
    return newShop;
  },

  updateShop(id: string, updates: Partial<Shop>) {
    const db = this.getDb();
    const index = db.shops.findIndex(s => s.id === id);
    if (index !== -1) {
      const oldShop = db.shops[index];
      const mergedUpdates: Partial<Shop> = { ...updates };
      if (mergedUpdates.assignedEmployeeIds && mergedUpdates.assignedEmployeeIds.length > 0 && !mergedUpdates.assignedEmployeeId) {
        mergedUpdates.assignedEmployeeId = mergedUpdates.assignedEmployeeIds[0];
      } else if (mergedUpdates.assignedEmployeeId && (!mergedUpdates.assignedEmployeeIds || mergedUpdates.assignedEmployeeIds.length === 0)) {
        mergedUpdates.assignedEmployeeIds = [mergedUpdates.assignedEmployeeId];
      }

      db.shops[index] = {
        ...oldShop,
        ...mergedUpdates,
        updatedAt: new Date().toISOString()
      };
      
      // If route changed
      if (updates.routeId && updates.routeId !== oldShop.routeId) {
        // remove from old
        const oldRoute = db.routes.find(r => r.id === oldShop.routeId);
        if (oldRoute) {
          oldRoute.orderedShopIds = oldRoute.orderedShopIds.filter(sid => sid !== id);
          FirestoreSync.saveDocument('routes', oldRoute.id, oldRoute);
        }
        // add to new
        const newRoute = db.routes.find(r => r.id === updates.routeId);
        if (newRoute && !newRoute.orderedShopIds.includes(id)) {
          newRoute.orderedShopIds.push(id);
          FirestoreSync.saveDocument('routes', newRoute.id, newRoute);
        }
      }

      this.saveDb(db);
      FirestoreSync.saveDocument('shops', id, db.shops[index]);
      this.logAction('EDIT_SHOP', 'shops', id, `Updated shop details for ${oldShop.name}`);
    }
  },

  deleteShop(id: string) {
    const db = this.getDb();
    const shop = db.shops.find(s => s.id === id);
    if (shop) {
      shop.status = 'inactive';
      shop.active = false;
      shop.isDeleted = true;
      shop.updatedAt = new Date().toISOString();
      this.saveDb(db);
      FirestoreSync.saveDocument('shops', id, shop);
      this.logAction('DELETE_SHOP', 'shops', id, `Soft deleted shop ${shop.name}`);
    }
  },

  restoreShop(id: string) {
    const db = this.getDb();
    const shop = db.shops.find(s => s.id === id);
    if (shop) {
      shop.status = 'active';
      shop.active = true;
      shop.isDeleted = false;
      shop.updatedAt = new Date().toISOString();
      this.saveDb(db);
      FirestoreSync.saveDocument('shops', id, shop);
      this.logAction('RESTORE_SHOP', 'shops', id, `Restored shop ${shop.name}`);
    }
  },

  // ROUTES CRUD
  addRoute(routeData: Omit<Route, 'id'>): Route {
    const db = this.getDb();
    const assignedIds = routeData.assignedEmployeeIds || (routeData.assignedEmployeeId ? [routeData.assignedEmployeeId] : []);
    const newRoute: Route = {
      ...routeData,
      id: `route_${Date.now()}`,
      active: true,
      isDeleted: false,
      assignedEmployeeIds: assignedIds,
      assignedEmployeeId: assignedIds[0] || routeData.assignedEmployeeId
    };
    db.routes.push(newRoute);
    this.saveDb(db);
    FirestoreSync.saveDocument('routes', newRoute.id, newRoute);
    this.logAction('CREATE_ROUTE', 'routes', newRoute.id, `Created new route ${newRoute.name} (${newRoute.code})`);
    return newRoute;
  },

  updateRoute(id: string, updates: Partial<Route>) {
    const db = this.getDb();
    const index = db.routes.findIndex(r => r.id === id);
    if (index !== -1) {
      const mergedUpdates = { ...updates };
      if (mergedUpdates.assignedEmployeeIds && mergedUpdates.assignedEmployeeIds.length > 0 && !mergedUpdates.assignedEmployeeId) {
        mergedUpdates.assignedEmployeeId = mergedUpdates.assignedEmployeeIds[0];
      }
      db.routes[index] = { ...db.routes[index], ...mergedUpdates };
      this.saveDb(db);
      FirestoreSync.saveDocument('routes', id, db.routes[index]);
      this.logAction('UPDATE_ROUTE', 'routes', id, `Updated route ${db.routes[index].name}`);
    }
  },

  deleteRoute(id: string) {
    const db = this.getDb();
    const route = db.routes.find(r => r.id === id);
    if (route) {
      route.active = false;
      route.isDeleted = true;
      this.saveDb(db);
      FirestoreSync.saveDocument('routes', id, route);
      this.logAction('DELETE_ROUTE', 'routes', id, `Soft deleted route ${route.name}`);
    }
  },

  restoreRoute(id: string) {
    const db = this.getDb();
    const route = db.routes.find(r => r.id === id);
    if (route) {
      route.active = true;
      route.isDeleted = false;
      this.saveDb(db);
      FirestoreSync.saveDocument('routes', id, route);
      this.logAction('RESTORE_ROUTE', 'routes', id, `Restored route ${route.name}`);
    }
  },

  assignShopToAgent(shopId: string, employeeId?: string) {
    const db = this.getDb();
    const shop = db.shops.find(s => s.id === shopId);
    if (shop) {
      shop.assignedEmployeeId = employeeId;
      shop.updatedAt = new Date().toISOString();
      const agent = db.employees.find(e => e.id === employeeId);
      this.saveDb(db);
      FirestoreSync.saveDocument('shops', shopId, shop);
      this.logAction('EDIT_SHOP', 'shops', shopId, `Assigned shop ${shop.name} to agent ${agent?.name || 'Unassigned'}`);
    }
  },

  rebalanceRouteShops(routeId: string, employeeIds: string[]) {
    const db = this.getDb();
    const route = db.routes.find(r => r.id === routeId);
    if (route && employeeIds.length > 0) {
      route.assignedEmployeeIds = employeeIds;
      route.assignedEmployeeId = employeeIds[0];
      const routeShops = db.shops.filter(s => route.orderedShopIds.includes(s.id));
      routeShops.forEach((shop, index) => {
        const assignedAgentId = employeeIds[index % employeeIds.length];
        shop.assignedEmployeeId = assignedAgentId;
        shop.updatedAt = new Date().toISOString();
        FirestoreSync.saveDocument('shops', shop.id, shop);
      });
      this.saveDb(db);
      FirestoreSync.saveDocument('routes', routeId, route);
      this.logAction('UPDATE_ROUTE', 'routes', routeId, `Distributed ${routeShops.length} shops across ${employeeIds.length} agents on ${route.name}`);
    }
  },

  // HOLIDAYS CRUD
  addHoliday(dateString: string, title: string, type: Holiday['type'] = 'public', reason?: string): Holiday {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const newHoliday: Holiday = {
      id: `hol_${Date.now()}`,
      dateString,
      title,
      type,
      reason,
      scope: 'all',
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };
    db.holidays.push(newHoliday);
    this.saveDb(db);
    FirestoreSync.saveDocument('holidays', newHoliday.id, newHoliday);
    this.logAction('CREATE_HOLIDAY', 'holidays', newHoliday.id, `Declared holiday on ${dateString}: ${title}`);
    return newHoliday;
  },

  deleteHoliday(id: string) {
    const db = this.getDb();
    const hol = db.holidays.find(h => h.id === id);
    if (hol) {
      hol.active = false;
      hol.isDeleted = true;
      this.saveDb(db);
      FirestoreSync.saveDocument('holidays', id, hol);
      this.logAction('DELETE_HOLIDAY', 'holidays', id, `Soft deleted holiday ${hol.title} (${hol.dateString})`);
    }
  },

  restoreHoliday(id: string) {
    const db = this.getDb();
    const hol = db.holidays.find(h => h.id === id);
    if (hol) {
      hol.active = true;
      hol.isDeleted = false;
      this.saveDb(db);
      FirestoreSync.saveDocument('holidays', id, hol);
      this.logAction('CREATE_HOLIDAY', 'holidays', id, `Restored holiday ${hol.title} (${hol.dateString})`);
    }
  },

  // EMPLOYEES CRUD
  addEmployee(empData: Omit<Employee, 'id' | 'joinedAt'>): Employee {
    const db = this.getDb();
    const cleanPhone = (empData.phone || '').replace(/\D/g, '');
    let pass = empData.password?.trim();
    if (empData.role !== 'super_admin' && empData.role !== 'admin') {
      if (!pass || pass === 'id@varshitha123') {
        pass = cleanPhone.length >= 5 ? cleanPhone.slice(-5) : '12345';
      }
    }
    const newEmp: Employee = {
      ...empData,
      password: pass,
      id: `emp_${Date.now()}`,
      active: true,
      isDeleted: false,
      joinedAt: new Date().toISOString().split('T')[0]
    };
    db.employees.push(newEmp);
    this.saveDb(db);
    FirestoreSync.saveDocument('employees', newEmp.id, newEmp);
    this.logAction('ADD_EMPLOYEE', 'employees', newEmp.id, `Added employee ${newEmp.name} (${newEmp.role})`);
    return newEmp;
  },

  updateEmployee(id: string, updates: Partial<Employee>) {
    const db = this.getDb();
    const index = db.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      const old = db.employees[index];
      const isPermChanged = updates.permissions !== undefined;
      const mergedUpdates = { ...updates };
      const targetRole = mergedUpdates.role || old.role;
      if (targetRole !== 'super_admin' && targetRole !== 'admin') {
        const activePhone = mergedUpdates.phone || old.phone;
        const cleanPhone = (activePhone || '').replace(/\D/g, '');
        if (!mergedUpdates.password && cleanPhone.length >= 5) {
          mergedUpdates.password = cleanPhone.slice(-5);
        }
      }
      db.employees[index] = { ...old, ...mergedUpdates };
      this.saveDb(db);
      FirestoreSync.saveDocument('employees', id, db.employees[index]);
      if (isPermChanged) {
        this.logAction('UPDATE_PERMISSIONS', 'employees', id, `Updated access permissions for ${old.name}`);
      } else {
        this.logAction('EDIT_EMPLOYEE', 'employees', id, `Updated employee profile for ${old.name}`);
      }
    }
  },

  deleteEmployee(id: string) {
    const db = this.getDb();
    const emp = db.employees.find(e => e.id === id);
    if (emp) {
      emp.status = 'inactive';
      emp.active = false;
      emp.isDeleted = true;
      this.saveDb(db);
      FirestoreSync.saveDocument('employees', id, emp);
      this.logAction('DELETE_EMPLOYEE', 'employees', id, `Soft deleted employee ${emp.name}`);
    }
  },

  restoreEmployee(id: string) {
    const db = this.getDb();
    const emp = db.employees.find(e => e.id === id);
    if (emp) {
      emp.status = 'active';
      emp.active = true;
      emp.isDeleted = false;
      this.saveDb(db);
      FirestoreSync.saveDocument('employees', id, emp);
      this.logAction('RESTORE_EMPLOYEE', 'employees', id, `Restored employee ${emp.name}`);
    }
  },

  // VISITS & EXECUTION
  getOrCreateVisit(dateString: string, routeId: string, shopId: string, employeeId: string): Visit {
    const db = this.getDb();
    let visit = db.visits.find(v => v.dateString === dateString && v.shopId === shopId);
    if (!visit) {
      visit = {
        id: `vis_${dateString}_${shopId}`,
        dateString,
        routeId,
        shopId,
        employeeId,
        status: 'pending'
      };
      db.visits.push(visit);
      this.saveDb(db);
      FirestoreSync.saveDocument('visits', visit.id, visit);
    }
    return visit;
  },

  updateVisitStatus(
    dateString: string,
    shopId: string,
    status: Visit['status'],
    reason?: string,
    orderId?: string
  ) {
    const db = this.getDb();
    const visit = db.visits.find(v => v.dateString === dateString && v.shopId === shopId);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (visit) {
      visit.status = status;
      if (reason) visit.outcomeReason = reason;
      if (orderId) visit.orderId = orderId;
      if (status === 'started' && !visit.startedAt) {
        visit.startedAt = nowTime;
      }
      if (status === 'completed' || status === 'order_placed' || status === 'no_order' || status === 'skipped') {
        visit.completedAt = nowTime;
      }
      this.saveDb(db);
      FirestoreSync.saveDocument('visits', visit.id, visit);
    }
  },

  // ORDERS & FINALIZATION (Idempotent, sequential invoice, snapshot)
  finalizeOrder(orderData: {
    shopId: string;
    routeId: string;
    items: { product: Product; qty: number }[];
    notes?: string;
    amountPaid?: number;
    paymentMethod?: 'cash' | 'upi' | 'credit' | 'cheque';
    nextVisitDate?: string;
    nextVisitTime?: string;
  }): Order {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const shop = db.shops.find(s => s.id === orderData.shopId)!;
    const route = db.routes.find(r => r.id === orderData.routeId);
    const dateStr = new Date().toISOString().split('T')[0];

    // Build immutable item snapshots
    let subtotal = 0;
    const snapshots: OrderItemSnapshot[] = orderData.items.map(({ product, qty }) => {
      // Re-read current authoritative price from database
      const liveProduct = db.products.find(p => p.id === product.id) || product;
      const lineTotal = liveProduct.sellPrice * qty;
      subtotal += lineTotal;
      return {
        productId: liveProduct.id,
        sku: liveProduct.sku,
        productName: liveProduct.name,
        unit: liveProduct.unit,
        qty,
        unitPrice: liveProduct.sellPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: liveProduct.taxRate,
        taxAmount: (lineTotal * liveProduct.taxRate) / 100,
        lineTotal
      };
    });

    const taxTotal = snapshots.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal + taxTotal;

    const paidNow = Math.min(grandTotal, Math.max(0, orderData.amountPaid || 0));
    const balanceDue = Math.max(0, grandTotal - paidNow);
    const paymentStatus: Order['paymentStatus'] = paidNow >= grandTotal ? 'paid' : paidNow > 0 ? 'partial' : 'unpaid';

    // Generate central sequential invoice number
    const invNum = db.settings.nextInvoiceNumber;
    const invoiceNo = `${db.settings.invoicePrefix}${String(invNum).padStart(6, '0')}`;
    const orderNo = `ORD${String(invNum).padStart(5, '0')}`;
    db.settings.nextInvoiceNumber += 1;

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNo,
      invoiceNo,
      dateString: dateStr,
      createdAt: new Date().toISOString(),
      shopId: shop.id,
      shopCodeSnapshot: shop.shopCode,
      shopNameSnapshot: shop.name,
      shopPhoneSnapshot: shop.phone,
      shopAddressSnapshot: `${shop.address}, ${shop.city}`,
      employeeId: user.id,
      employeeNameSnapshot: user.name,
      routeId: route?.id || shop.routeId,
      routeNameSnapshot: route?.name || 'Assigned Route',
      items: snapshots,
      subtotal,
      discountTotal: 0,
      taxTotal,
      grandTotal,
      status: 'completed',
      deliveryStatus: 'pending',
      paymentStatus,
      paymentMethod: orderData.paymentMethod || 'cash',
      amountPaid: paidNow,
      balanceDue,
      paidAt: paymentStatus === 'paid' ? new Date().toISOString() : undefined,
      nextVisitDate: orderData.nextVisitDate,
      nextVisitTime: orderData.nextVisitTime,
      whatsappShared: false,
      notes: orderData.notes
    };

    db.orders.unshift(newOrder);

    // Deduct stock for each ordered product
    orderData.items.forEach(({ product, qty }) => {
      const prodIndex = db.products.findIndex(p => p.id === product.id);
      if (prodIndex !== -1) {
        const currentStock = db.products[prodIndex].stock ?? 0;
        db.products[prodIndex].stock = Math.max(0, currentStock - qty);
        db.products[prodIndex].updatedAt = new Date().toISOString();
        FirestoreSync.saveDocument('products', db.products[prodIndex].id, db.products[prodIndex]);
      }
    });

    // Update shop's scheduled next visit if specified
    if (orderData.nextVisitDate || orderData.nextVisitTime) {
      if (orderData.nextVisitDate) shop.preferredVisitDate = orderData.nextVisitDate;
      if (orderData.nextVisitTime) shop.preferredVisitTime = orderData.nextVisitTime;
      shop.updatedAt = new Date().toISOString();
      FirestoreSync.saveDocument('shops', shop.id, shop);
    }

    // Mark visit completed/order_placed
    this.updateVisitStatus(dateStr, shop.id, 'order_placed', undefined, newOrder.id);

    this.saveDb(db);
    FirestoreSync.saveDocument('orders', newOrder.id, newOrder);
    FirestoreSync.saveDocument('settings', 'business_settings', db.settings);

    this.logAction(
      'FINALIZE_ORDER',
      'orders',
      newOrder.id,
      `Finalized order ${newOrder.orderNo} (${newOrder.invoiceNo}) for ${shop.name}. Total: ₹${grandTotal.toLocaleString()}, Paid: ₹${paidNow.toLocaleString()}, Due: ₹${balanceDue.toLocaleString()}`
    );

    return newOrder;
  },

  confirmDelivery(
    orderId: string,
    deliveryData?: {
      paymentStatus?: 'paid' | 'unpaid' | 'partial';
      paymentMethod?: 'cash' | 'upi' | 'credit' | 'cheque';
      amountPaid?: number;
      notes?: string;
    }
  ) {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const order = db.orders.find((o) => o.id === orderId);
    if (order) {
      order.deliveryStatus = 'delivered';
      order.deliveredAt = new Date().toISOString();
      order.deliveredBy = user.name;
      if (deliveryData?.notes) order.deliveryNotes = deliveryData.notes;

      if (deliveryData?.paymentStatus) {
        order.paymentStatus = deliveryData.paymentStatus;
        order.paymentMethod = deliveryData.paymentMethod || 'cash';
        order.amountPaid =
          deliveryData.amountPaid !== undefined
            ? deliveryData.amountPaid
            : deliveryData.paymentStatus === 'paid'
            ? order.grandTotal
            : (order.amountPaid || 0);
        order.balanceDue = Math.max(0, order.grandTotal - order.amountPaid);
        if (order.paymentStatus === 'paid') {
          order.paidAt = new Date().toISOString();
        }
      }

      // Ensure visit is marked completed
      const todayStr = new Date().toISOString().split('T')[0];
      this.updateVisitStatus(todayStr, order.shopId, 'completed', undefined, order.id);

      this.saveDb(db);
      FirestoreSync.saveDocument('orders', order.id, order);
      this.logAction(
        'CONFIRM_DELIVERY',
        'orders',
        order.id,
        `Confirmed delivery for ${order.orderNo} to ${order.shopNameSnapshot}. Payment: ${order.paymentStatus.toUpperCase()} (₹${order.amountPaid || 0}/₹${order.grandTotal})`
      );
    }
  },

  recordPayment(
    orderId: string,
    paymentStatus: 'paid' | 'partial',
    amount: number,
    method: 'cash' | 'upi' | 'credit' | 'cheque' = 'cash'
  ) {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const order = db.orders.find((o) => o.id === orderId);
    if (order) {
      const currentPaid = order.amountPaid || 0;
      const newPaid = Math.min(order.grandTotal, currentPaid + amount);
      order.amountPaid = newPaid;
      order.balanceDue = Math.max(0, order.grandTotal - newPaid);
      order.paymentMethod = method;
      if (newPaid >= order.grandTotal) {
        order.paymentStatus = 'paid';
        order.paidAt = new Date().toISOString();
      } else {
        order.paymentStatus = paymentStatus;
      }
      this.saveDb(db);
      FirestoreSync.saveDocument('orders', order.id, order);
      this.logAction(
        'RECORD_PAYMENT',
        'orders',
        order.id,
        `Collected payment of ₹${amount.toLocaleString()} (${method.toUpperCase()}) for order ${order.orderNo} from ${order.shopNameSnapshot}. Remaining due: ₹${order.balanceDue.toLocaleString()}`
      );
    }
  },

  resetEmployeePassword(employeeId: string, newPassword: string): boolean {
    const db = this.getDb();
    const emp = db.employees.find(e => e.id === employeeId);
    if (emp) {
      emp.password = newPassword;
      this.saveDb(db);
      FirestoreSync.saveDocument('employees', employeeId, emp);
      this.logAction('EDIT_EMPLOYEE', 'employees', employeeId, `Reset password for employee ${emp.name} (${emp.phone})`);
      return true;
    }
    return false;
  },

  cancelOrder(orderId: string, reason: string) {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'cancelled';
      order.active = false;
      order.isDeleted = true;
      order.cancelReason = reason;
      order.cancelledBy = user.name;
      order.cancelledAt = new Date().toISOString();

      // Restock items back to inventory
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const prodIndex = db.products.findIndex(p => p.id === item.productId);
          if (prodIndex !== -1) {
            const currentStock = db.products[prodIndex].stock ?? 0;
            db.products[prodIndex].stock = currentStock + item.qty;
            db.products[prodIndex].updatedAt = new Date().toISOString();
            FirestoreSync.saveDocument('products', db.products[prodIndex].id, db.products[prodIndex]);
          }
        });
      }

      this.saveDb(db);
      FirestoreSync.saveDocument('orders', orderId, order);
      this.logAction('CANCEL_ORDER', 'orders', orderId, `Cancelled order ${order.orderNo}: ${reason}. Restocked item quantities.`);
    }
  },

  deleteOrder(orderId: string, reason: string = 'Soft deleted by admin') {
    const db = this.getDb();
    const user = this.getCurrentUser();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'cancelled';
      order.active = false;
      order.isDeleted = true;
      order.cancelReason = reason;
      order.cancelledBy = user.name;
      order.cancelledAt = new Date().toISOString();

      // Restock items back to inventory if not already restocked
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const prodIndex = db.products.findIndex(p => p.id === item.productId);
          if (prodIndex !== -1) {
            const currentStock = db.products[prodIndex].stock ?? 0;
            db.products[prodIndex].stock = currentStock + item.qty;
            db.products[prodIndex].updatedAt = new Date().toISOString();
            FirestoreSync.saveDocument('products', db.products[prodIndex].id, db.products[prodIndex]);
          }
        });
      }

      this.saveDb(db);
      FirestoreSync.saveDocument('orders', orderId, order);
      this.logAction('DELETE_ORDER', 'orders', orderId, `Soft deleted order ${order.orderNo}`);
    }
  },

  restoreOrder(orderId: string) {
    const db = this.getDb();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      order.status = 'completed';
      order.active = true;
      order.isDeleted = false;
      order.cancelReason = undefined;

      // Re-deduct stock upon order restoration
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const prodIndex = db.products.findIndex(p => p.id === item.productId);
          if (prodIndex !== -1) {
            const currentStock = db.products[prodIndex].stock ?? 0;
            db.products[prodIndex].stock = Math.max(0, currentStock - item.qty);
            db.products[prodIndex].updatedAt = new Date().toISOString();
            FirestoreSync.saveDocument('products', db.products[prodIndex].id, db.products[prodIndex]);
          }
        });
      }

      this.saveDb(db);
      FirestoreSync.saveDocument('orders', orderId, order);
      this.logAction('RESTORE_ORDER', 'orders', orderId, `Restored order ${order.orderNo}`);
    }
  },

  markWhatsAppShared(orderId: string) {
    const db = this.getDb();
    const order = db.orders.find(o => o.id === orderId);
    if (order) {
      order.whatsappShared = true;
      this.saveDb(db);
      FirestoreSync.saveDocument('orders', orderId, order);
    }
  },

  // SETTINGS
  updateSettings(updates: Partial<BusinessSettings>) {
    const db = this.getDb();
    db.settings = { ...db.settings, ...updates };
    this.saveDb(db);
    FirestoreSync.saveDocument('settings', 'business_settings', db.settings);
    this.logAction('EDIT_PRODUCT', 'settings', 'config', 'Updated business system settings & templates');
  },

  getOrderByIdOrNo(identifier: string): Order | undefined {
    if (!identifier) return undefined;
    const db = this.getDb();
    const clean = identifier.trim().toLowerCase();
    const noHash = clean.replace(/^#/, '');
    return db.orders.find(o => 
      o.id.toLowerCase() === clean ||
      o.orderNo.toLowerCase() === clean ||
      o.orderNo.toLowerCase() === noHash ||
      o.invoiceNo.toLowerCase() === clean ||
      o.invoiceNo.toLowerCase() === noHash
    );
  }
};

