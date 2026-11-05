export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'sales_employee';

export interface UserPermissions {
  canAddShop: boolean;
  canEditShop: boolean;
  canAddCategory: boolean;
  canAddProduct: boolean;
  canChangePrice: boolean;
  canCancelOrder: boolean;
  canViewTeamOrders: boolean;
  canManageRoutes: boolean;
  canManageHolidays: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canViewAuditLogs: boolean;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  active?: boolean;
  isDeleted?: boolean;
  assignedRouteIds: string[];
  assignedCategoryIds?: string[]; // Categories assigned to this sales agent
  permissions: UserPermissions;
  joinedAt: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  active?: boolean;
  isDeleted?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

export interface ProductType {
  id: string;
  categoryId: string;
  subcategoryId?: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  subcategoryId?: string;
  productTypeId?: string;
  unit: string;
  sellPrice: number;
  mrp: number;
  taxRate: number;
  imageUrl?: string;
  active: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Route {
  id: string;
  code: string;
  name: string;
  area: string;
  orderedShopIds: string[];
  defaultWeekdays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  active: boolean;
  isDeleted?: boolean;
  assignedEmployeeId?: string; // Primary / Legacy single rep
  assignedEmployeeIds?: string[]; // Multiple agents handling this route
}

export interface Shop {
  id: string;
  shopCode: string;
  name: string;
  ownerName: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  locality?: string;
  city: string;
  state: string;
  routeId: string;
  assignedEmployeeId?: string; // Primary agent
  assignedEmployeeIds?: string[]; // Multiple agents servicing this shop for different products
  imageUrl?: string; // Shop storefront / location photo
  status: 'active' | 'inactive';
  active?: boolean;
  isDeleted?: boolean;
  latitude?: number;
  longitude?: number;
  notes?: string;
  description?: string;
  preferredVisitDate?: string;
  preferredVisitTime?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type VisitStatus = 'pending' | 'started' | 'order_placed' | 'no_order' | 'skipped' | 'completed';

export interface Visit {
  id: string;
  dateString: string; // YYYY-MM-DD
  routeId: string;
  shopId: string;
  employeeId: string;
  status: VisitStatus;
  outcomeReason?: string;
  orderId?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface OrderItemSnapshot {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNo: string;
  invoiceNo: string;
  dateString: string;
  createdAt: string;
  
  // Snapshots
  shopId: string;
  shopCodeSnapshot: string;
  shopNameSnapshot: string;
  shopPhoneSnapshot: string;
  shopAddressSnapshot: string;
  
  employeeId: string;
  employeeNameSnapshot: string;
  
  routeId: string;
  routeNameSnapshot: string;
  
  items: OrderItemSnapshot[];
  
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  
  status: 'completed' | 'cancelled';
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;

  // Delivery & Payment tracking
  deliveryStatus: 'pending' | 'delivered';
  deliveredAt?: string;
  deliveredBy?: string;
  deliveryNotes?: string;

  paymentStatus: 'unpaid' | 'paid' | 'partial';
  paymentMethod?: 'cash' | 'upi' | 'credit' | 'cheque';
  amountPaid: number;
  balanceDue: number; // Has to be paid (grandTotal - amountPaid)
  paidAt?: string;

  // Next Visit Scheduling
  nextVisitDate?: string;
  nextVisitTime?: string;
  
  whatsappShared: boolean;
  notes?: string;
  active?: boolean;
  isDeleted?: boolean;
}

export interface Holiday {
  id: string;
  dateString: string; // YYYY-MM-DD
  title: string;
  reason?: string;
  type: 'public' | 'festival' | 'company' | 'emergency';
  scope: 'all' | 'route_specific';
  routeId?: string;
  active?: boolean;
  isDeleted?: boolean;
  createdBy: string;
  createdAt: string;
}

export interface RouteScheduleOverride {
  id: string;
  dateString: string; // YYYY-MM-DD
  routeId: string;
  employeeId: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'ADD_SHOP' | 'EDIT_SHOP' | 'DELETE_SHOP' | 'RESTORE_SHOP' | 'ADD_PRODUCT' | 'EDIT_PRODUCT' | 'DELETE_PRODUCT' | 'RESTORE_PRODUCT' | 'DELETE_CATEGORY' | 'RESTORE_CATEGORY' | 'UPDATE_PRICE' | 'FINALIZE_ORDER' | 'CANCEL_ORDER' | 'DELETE_ORDER' | 'RESTORE_ORDER' | 'CONFIRM_DELIVERY' | 'RECORD_PAYMENT' | 'UPDATE_PERMISSIONS' | 'CREATE_HOLIDAY' | 'DELETE_HOLIDAY' | 'CREATE_ROUTE' | 'UPDATE_ROUTE' | 'DELETE_ROUTE' | 'RESTORE_ROUTE' | 'ADD_EMPLOYEE' | 'EDIT_EMPLOYEE' | 'DELETE_EMPLOYEE' | 'RESTORE_EMPLOYEE';
  entityType: 'shops' | 'products' | 'categories' | 'orders' | 'employees' | 'routes' | 'holidays' | 'settings';
  entityId: string;
  summary: string;
  details?: any;
  timestamp: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currencySymbol: string;
  defaultTaxRate: number;
  whatsappTemplate: string;
}

export interface AppDatabase {
  employees: Employee[];
  categories: Category[];
  subcategories: Subcategory[];
  productTypes: ProductType[];
  products: Product[];
  routes: Route[];
  shops: Shop[];
  visits: Visit[];
  orders: Order[];
  holidays: Holiday[];
  scheduleOverrides: RouteScheduleOverride[];
  auditLogs: AuditLog[];
  settings: BusinessSettings;
  currentUserId: string;
}
