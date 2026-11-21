import React, { useState, useEffect } from 'react';
import { Store, Plus, Search, MapPin, Phone, ChevronRight, ArrowLeft, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Shop } from '../../types';

interface MobileShopsListProps {
  currentUser: Employee;
  onOpenShop: (shopId: string) => void;
  onAddNewShop: () => void;
  onBack?: () => void;
}

export const MobileShopsList: React.FC<MobileShopsListProps> = ({
  currentUser,
  onOpenShop,
  onAddNewShop,
  onBack
}) => {
  const db = StorageService.getDb();
  const [, setTick] = useState(0);

  useEffect(() => {
    return StorageService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');

  const isStaff = currentUser.role !== 'super_admin' && currentUser.role !== 'admin';
  const hasAssignedShops = isStaff && Array.isArray(currentUser.assignedShopIds) && currentUser.assignedShopIds.length > 0;

  const availableRoutes = db.routes.filter((r) => {
    if (r.isDeleted || r.active === false) return false;
    if (!isStaff) return true;
    return (
      (Array.isArray(currentUser.assignedRouteIds) && currentUser.assignedRouteIds.includes(r.id)) ||
      (Array.isArray(r.assignedEmployeeIds) && r.assignedEmployeeIds.includes(currentUser.id)) ||
      r.assignedEmployeeId === currentUser.id ||
      (hasAssignedShops && currentUser.assignedShopIds!.some((sid) => db.shops.find((s) => s.id === sid)?.routeId === r.id))
    );
  });
  const availableRouteIds = availableRoutes.map((r) => r.id);

  const filteredShops = db.shops.filter((s) => {
    if (s.isDeleted || s.status === 'inactive' || s.active === false) return false;
    if (isStaff) {
      // If staff has specific assigned shops, strictly show ONLY those shops!
      if (hasAssignedShops) {
        if (!currentUser.assignedShopIds!.includes(s.id)) return false;
      } else {
        const isRouteAssigned = availableRouteIds.includes(s.routeId);
        const isDirectEmp = s.assignedEmployeeId === currentUser.id;
        if (!isRouteAssigned && !isDirectEmp) {
          return false;
        }
      }
    }
    const matchesRoute = selectedRoute === 'all' || s.routeId === selectedRoute;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.shopCode.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase());
    return matchesRoute && matchesSearch;
  });

  return (
    <div className="mobile-app-shell">
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
              title="Back to Home"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
            Shops Directory
          </h3>
        </div>

        {currentUser.permissions.canAddShop && (
          <button
            onClick={onAddNewShop}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Plus size={14} /> Add Shop
          </button>
        )}
      </header>

      <div className="mobile-body-scroll">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search
            size={16}
            color="var(--text-secondary)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by store or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* Route Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedRoute('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              background: selectedRoute === 'all' ? 'var(--primary)' : '#FFF',
              color: selectedRoute === 'all' ? '#FFF' : 'var(--text-secondary)',
              border: selectedRoute === 'all' ? 'none' : '1px solid var(--border)'
            }}
          >
            All Routes ({filteredShops.length})
          </button>
          {availableRoutes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoute(r.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: selectedRoute === r.id ? 'var(--primary)' : '#FFF',
                color: selectedRoute === r.id ? '#FFF' : 'var(--text-secondary)',
                border: selectedRoute === r.id ? 'none' : '1px solid var(--border)'
              }}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Shops List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredShops.map((shop) => {
            const shopOrders = db.orders.filter(
              (o) => o.shopId === shop.id && o.status === 'completed' && !o.isDeleted
            );
            const totalBilled = shopOrders.reduce((sum, o) => sum + o.grandTotal, 0);
            const totalPaid = shopOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
            const pendingDue = Math.max(0, totalBilled - totalPaid);

            // Latest order with timestamp
            const latestOrder = [...shopOrders].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];

            const formattedLastTime = latestOrder
              ? new Date(latestOrder.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short'
                }) + ' at ' + new Date(latestOrder.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              : null;

            return (
              <div
                key={shop.id}
                onClick={() => onOpenShop(shop.id)}
                style={{
                  background: '#FFF',
                  border: pendingDue > 0 ? '1px solid #FECACA' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  {shop.imageUrl ? (
                    <img
                      src={shop.imageUrl}
                      alt={shop.name}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover',
                        border: '1px solid var(--border)',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      <Store size={22} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {shop.name}
                      </h4>
                      {currentUser.assignedShopIds?.includes(shop.id) && (
                        <span style={{ fontSize: '10px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          ⭐ Custom Assigned
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {shop.ownerName} • {shop.phone}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {shop.address}
                    </div>

                    {/* Financial Summary & Due with Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                        Paid: ₹{totalPaid.toLocaleString()}
                      </span>

                      {pendingDue > 0 ? (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #FECACA' }}>
                          Due: ₹{pendingDue.toLocaleString()}
                        </span>
                      ) : (
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#166534', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                          ✓ Dues Cleared
                        </span>
                      )}

                      {formattedLastTime && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={11} /> {formattedLastTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight size={18} color="var(--text-secondary)" style={{ flexShrink: 0, marginLeft: '8px' }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
