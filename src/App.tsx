import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { Employee, Order } from './types';
import { DesktopSidebar, AdminTab } from './components/DesktopSidebar';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { MobileDrawer } from './components/MobileDrawer';
import { InvoiceModal } from './components/InvoiceModal';
import { Menu, ArrowLeft, LogOut } from 'lucide-react';

// Mobile Views
import { MobileHome } from './views/mobile/MobileHome';
import { MobileRoute } from './views/mobile/MobileRoute';
import { MobileShopDetail } from './views/mobile/MobileShopDetail';
import { MobileBillPreview } from './views/mobile/MobileBillPreview';
import { MobileOrderSuccess } from './views/mobile/MobileOrderSuccess';
import { MobileShopsList } from './views/mobile/MobileShopsList';
import { MobileOrdersList } from './views/mobile/MobileOrdersList';

// Admin Views
import { AdminDashboard } from './views/admin/AdminDashboard';
import { AdminProducts } from './views/admin/AdminProducts';
import { AdminRoutesCalendar } from './views/admin/AdminRoutesCalendar';
import { AdminShops } from './views/admin/AdminShops';
import { AdminEmployees } from './views/admin/AdminEmployees';
import { AdminOrders } from './views/admin/AdminOrders';
import { AdminReports } from './views/admin/AdminReports';
import { AdminAuditLogs } from './views/admin/AdminAuditLogs';
import { AdminSettings } from './views/admin/AdminSettings';
import { LoginView } from './views/auth/LoginView';
import { PublicReceiptView } from './views/public/PublicReceiptView';

export function App() {
  const [, setTick] = useState(0);

  const db = StorageService.getDb();
  const currentUser: Employee = StorageService.getCurrentUser();
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const isAuthenticated = StorageService.isAuthenticated();

  // Primary App View: 'mobile' (Field Sales) or 'admin' (Management Hub)
  const [viewMode, setViewMode] = useState<'mobile' | 'admin'>(() => {
    return isAdmin ? 'admin' : 'mobile';
  });

  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);

  // Mobile Drill-down states
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [activeCart, setActiveCart] = useState<{ [productId: string]: number }>({});
  const [isPreviewingBill, setIsPreviewingBill] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Global Invoice Inspection
  const [inspectingInvoice, setInspectingInvoice] = useState<Order | null>(null);

  // Central reactive storage subscription & Cloud Firestore real-time sync
  useEffect(() => {
    StorageService.initFirestore();
    return StorageService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Strict role guard: non-admin employees are strictly locked to field mobile view
  useEffect(() => {
    if (!isAdmin && viewMode === 'admin') {
      setViewMode('mobile');
    }
  }, [isAdmin, viewMode]);

  // Handle seamless login without page reload
  const handleLoginSuccess = (user?: Employee) => {
    const loggedUser = user || StorageService.getCurrentUser();
    const isUserAdmin = loggedUser.role === 'super_admin' || loggedUser.role === 'admin';
    setViewMode(isUserAdmin ? 'admin' : 'mobile');
    setTick((t) => t + 1);
  };

  // Check for public digital receipt query parameter (?receipt=... or ?bill=... or ?order=...)
  // This allows retailers and customers clicking WhatsApp receipt links to view their bill immediately without login
  const urlParams = new URLSearchParams(window.location.search);
  const receiptQuery = urlParams.get('receipt') || urlParams.get('bill') || urlParams.get('order');

  if (receiptQuery) {
    return (
      <PublicReceiptView
        receiptQuery={receiptQuery}
        onBackToLogin={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('receipt');
          url.searchParams.delete('bill');
          url.searchParams.delete('order');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
          setTick((t) => t + 1);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Handlers for Mobile Field Flow
  const handleOpenShop = (shopId: string) => {
    setActiveShopId(shopId);
    setActiveCart({});
    setIsPreviewingBill(false);
    setSuccessOrder(null);
  };

  const handleBackFromShop = () => {
    setActiveShopId(null);
    setActiveCart({});
    setIsPreviewingBill(false);
  };

  const handleViewBill = (cart: { [productId: string]: number }) => {
    setActiveCart(cart);
    setIsPreviewingBill(true);
  };

  const handleOrderSaved = (order: Order) => {
    setIsPreviewingBill(false);
    setSuccessOrder(order);
  };

  const handleNextShop = () => {
    setSuccessOrder(null);
    setActiveShopId(null);
    setActiveCart({});
    setMobileTab('route');
  };

  // Render Mobile Screen Content
  const renderMobileContent = () => {
    if (successOrder) {
      return (
        <MobileOrderSuccess
          order={successOrder}
          onNextShop={handleNextShop}
          onViewInvoice={(ord) => setInspectingInvoice(ord)}
        />
      );
    }

    if (isPreviewingBill && activeShopId) {
      const shop = db.shops.find((s) => s.id === activeShopId);
      if (shop) {
        return (
          <MobileBillPreview
            shop={shop}
            cart={activeCart}
            onBack={() => setIsPreviewingBill(false)}
            onOrderSaved={handleOrderSaved}
          />
        );
      }
    }

    if (activeShopId) {
      return (
        <MobileShopDetail
          shopId={activeShopId}
          currentUser={currentUser}
          onBack={handleBackFromShop}
          onViewBill={handleViewBill}
        />
      );
    }

    switch (mobileTab) {
      case 'home':
        return (
          <MobileHome
            currentUser={currentUser}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onGoToRoute={() => setMobileTab('route')}
            onGoToShop={handleOpenShop}
            onGoToTab={(t) => setMobileTab(t)}
            onOpenAdmin={isAdmin ? () => setViewMode('admin') : undefined}
          />
        );
      case 'route':
        return (
          <MobileRoute
            currentUser={currentUser}
            onBack={() => setMobileTab('home')}
            onOpenShop={handleOpenShop}
          />
        );
      case 'shops':
        return (
          <MobileShopsList
            currentUser={currentUser}
            onOpenShop={handleOpenShop}
            onBack={() => setMobileTab('home')}
            onAddNewShop={() => {
              if (isAdmin) {
                setViewMode('admin');
                setAdminTab('shops');
              } else {
                alert('Shop management requires Admin access.');
              }
            }}
          />
        );
      case 'orders':
        return (
          <MobileOrdersList
            currentUser={currentUser}
            onBack={() => setMobileTab('home')}
            onViewInvoice={(ord) => setInspectingInvoice(ord)}
          />
        );
      case 'profile':
        return (
          <div className="mobile-app-shell">
            <header className="mobile-app-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setMobileTab('home')}
                  style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
                  title="Back to Home"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
                  My Profile
                </h3>
              </div>
            </header>
            <div className="mobile-body-scroll">
              <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, margin: '0 auto 12px auto' }}>
                  {currentUser.name.charAt(0)}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{currentUser.name}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ID: {currentUser.employeeCode} • 📱 {currentUser.phone}
                </div>
                <span className="status-chip active" style={{ marginTop: '8px' }}>
                  {currentUser.role === 'sales_employee' ? 'Sales Executive' : currentUser.role}
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', textAlign: 'left' }}>
                  <div style={{ background: '#FAFDFB', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Shops</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                      {currentUser.assignedShopIds && currentUser.assignedShopIds.length > 0
                        ? `${currentUser.assignedShopIds.length} Shops`
                        : 'All Route Shops'}
                    </div>
                  </div>

                  <div style={{ background: '#FAFDFB', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Product Categories</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                      {currentUser.assignedCategoryIds && currentUser.assignedCategoryIds.length > 0
                        ? `${currentUser.assignedCategoryIds.length} Assigned`
                        : 'All Products'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '10px' }}>
                  Active Permissions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(currentUser.permissions).map(([k, v]) => (
                    <span key={k} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: v ? 'var(--primary-light)' : 'var(--bg-main)', color: v ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {k}: {v ? 'YES' : 'NO'}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => StorageService.logout()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: 'var(--danger)',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Logout from App
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render Admin Screen Content
  const renderAdminContent = () => {
    switch (adminTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            currentUser={currentUser}
            onNavigateTab={(tab) => setAdminTab(tab)}
            onViewInvoice={(ord) => setInspectingInvoice(ord)}
          />
        );
      case 'products':
        return <AdminProducts currentUser={currentUser} />;
      case 'shops':
        return <AdminShops currentUser={currentUser} />;
      case 'routes':
      case 'calendar':
        return <AdminRoutesCalendar />;
      case 'employees':
        return <AdminEmployees />;
      case 'orders':
        return (
          <AdminOrders
            currentUser={currentUser}
            onBack={() => setAdminTab('dashboard')}
            onViewInvoice={(ord) => setInspectingInvoice(ord)}
          />
        );
      case 'reports':
        return <AdminReports />;
      case 'audit':
        return <AdminAuditLogs />;
      case 'settings':
        return <AdminSettings />;
      default:
        return (
          <AdminDashboard
            currentUser={currentUser}
            onNavigateTab={setAdminTab}
            onViewInvoice={setInspectingInvoice}
          />
        );
    }
  };

  return (
    <div className="app-root">
      {viewMode === 'mobile' ? (
        /* Genuine Fluid Edge-to-Edge Mobile Web Application */
        <div className="mobile-app-shell">
          <div className="mobile-content-area">
            {renderMobileContent()}

            {/* Mobile Drawer (Hamburger Menu) */}
            <MobileDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              currentUser={currentUser}
              allUsers={db.employees}
              onSelectTab={(tab) => setMobileTab(tab)}
              onOpenProducts={() => {
                if (isAdmin) {
                  setViewMode('admin');
                  setAdminTab('products');
                } else {
                  setMobileTab('route');
                }
              }}
              onOpenSettings={() => {
                if (isAdmin) {
                  setViewMode('admin');
                  setAdminTab('settings');
                }
              }}
              onOpenAdminPortal={isAdmin ? () => setViewMode('admin') : undefined}
            />
          </div>

          {/* Mobile Bottom Navigation (Hidden on active bill preview or order success) */}
          {!activeShopId && !successOrder && (
            <MobileBottomNav
              currentTab={mobileTab}
              onTabChange={(tab) => setMobileTab(tab)}
              cartCount={Object.keys(activeCart).length}
            />
          )}
        </div>
      ) : (
        /* Desktop & Tablet Responsive Admin Operations Portal */
        <div className="admin-layout">
          <DesktopSidebar
            currentTab={adminTab}
            onTabChange={setAdminTab}
            currentUser={currentUser}
            isOpen={isAdminSidebarOpen}
            onClose={() => setIsAdminSidebarOpen(false)}
          />

          <main className="admin-main">
            <header className="admin-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Mobile/Tablet Hamburger to open sidebar drawer */}
                <button
                  className="admin-menu-toggle-btn"
                  onClick={() => setIsAdminSidebarOpen(true)}
                  title="Open Admin Navigation"
                >
                  <Menu size={20} />
                </button>

                {adminTab !== 'dashboard' && (
                  <button
                    onClick={() => setAdminTab('dashboard')}
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="Return to Admin Dashboard"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                )}

                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {adminTab.replace('-', ' ')}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={() => setViewMode('mobile')}
                  style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap', borderRadius: 'var(--radius-sm)' }}
                  title="Switch to Field Sales Mobile View"
                >
                  ← Field App
                </button>
                <button
                  onClick={() => StorageService.logout()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#FEE2E2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    cursor: 'pointer'
                  }}
                  title="Log out of current session"
                >
                  <LogOut size={13} /> Log Out
                </button>
              </div>
            </header>

            <div className="admin-content">
              {renderAdminContent()}
            </div>
          </main>
        </div>
      )}

      {/* Global Invoice / Receipt Inspection Modal */}
      <InvoiceModal
        order={inspectingInvoice}
        onClose={() => setInspectingInvoice(null)}
      />
    </div>
  );
}

export default App;
