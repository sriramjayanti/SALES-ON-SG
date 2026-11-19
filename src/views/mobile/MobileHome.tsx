import React, { useState } from 'react';
import {
  Menu,
  Bell,
  MapPin,
  Store,
  FileText,
  Package,
  Navigation,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Truck,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Route, Shop } from '../../types';

interface MobileHomeProps {
  currentUser: Employee;
  onOpenDrawer: () => void;
  onGoToRoute: () => void;
  onGoToShop: (shopId: string) => void;
  onGoToTab: (tab: any) => void;
  onOpenAdmin?: () => void;
}

export const MobileHome: React.FC<MobileHomeProps> = ({
  currentUser,
  onOpenDrawer,
  onGoToRoute,
  onGoToShop,
  onGoToTab,
  onOpenAdmin
}) => {
  const db = StorageService.getDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Resolve selected route (defaults to saved or assigned route)
  const defaultRouteId = currentUser.assignedRouteIds[0] || db.routes[0]?.id || 'route_a';
  const [selectedRouteId, setSelectedRouteId] = useState<string>(() => {
    return localStorage.getItem('selected_route_id') || defaultRouteId;
  });

  const handleRouteChange = (newRouteId: string) => {
    setSelectedRouteId(newRouteId);
    localStorage.setItem('selected_route_id', newRouteId);
  };

  const currentRoute: Route | undefined =
    db.routes.find((r) => r.id === selectedRouteId && !r.isDeleted && r.active !== false) ||
    db.routes.find((r) => !r.isDeleted && r.active !== false) ||
    db.routes[0];

  // Check holiday
  const todayHoliday = db.holidays.find((h) => h.dateString === todayStr && !h.isDeleted && h.active !== false);

  // Multi-agent workload filter
  const [workloadFilter, setWorkloadFilter] = useState<'my' | 'all'>('my');

  // Calculate metrics
  const routeShopIds = currentRoute?.orderedShopIds || [];
  const allRouteShops = db.shops.filter((s) => routeShopIds.includes(s.id) && !s.isDeleted && s.status !== 'inactive' && s.active !== false);
  const myAssignedShops = allRouteShops.filter((s) => s.assignedEmployeeId === currentUser.id);
  const hasMultiAgent = allRouteShops.some((s) => s.assignedEmployeeId);

  // Active target shops based on workload filter
  const assignedShops = hasMultiAgent && myAssignedShops.length > 0 && workloadFilter === 'my'
    ? myAssignedShops
    : allRouteShops;
  const targetShopIds = assignedShops.map((s) => s.id);
  
  // Today visits for target shops
  const todayVisits = db.visits.filter((v) => v.dateString === todayStr && targetShopIds.includes(v.shopId));
  const completedVisits = todayVisits.filter(
    (v) => v.status === 'completed' || v.status === 'order_placed'
  );

  // Today orders
  const todayOrders = db.orders.filter(
    (o) => o.employeeId === currentUser.id && o.dateString === todayStr && o.status === 'completed'
  );

  // Delivered sales (only counted after delivery to shop is confirmed!)
  const deliveredOrders = todayOrders.filter((o) => o.deliveryStatus === 'delivered');
  const deliveredSalesToday = deliveredOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Pending delivery orders
  const pendingDeliveries = todayOrders.filter((o) => o.deliveryStatus === 'pending');
  const pendingDeliveryAmount = pendingDeliveries.reduce((sum, o) => sum + o.grandTotal, 0);

  // Pending payments on current route & today
  const routeUnpaidOrders = db.orders.filter(
    (o) =>
      (o.routeId === currentRoute?.id || routeShopIds.includes(o.shopId)) &&
      o.status === 'completed' &&
      o.paymentStatus !== 'paid' &&
      !o.isDeleted
  );
  const routePendingDue = routeUnpaidOrders.reduce((sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)), 0);

  // Pending payments (orders placed but not yet paid)
  const unpaidOrders = db.orders.filter(
    (o) =>
      (currentUser.role === 'super_admin' || currentUser.role === 'admin' || o.employeeId === currentUser.id || o.routeId === currentRoute?.id) &&
      o.status === 'completed' &&
      o.paymentStatus !== 'paid' &&
      !o.isDeleted
  );
  const totalUnpaidDue = unpaidOrders.reduce((sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)), 0);

  const handleConfirmDelivery = (orderId: string) => {
    const isPaid = window.confirm(
      'Did you collect payment upon delivery? Click OK for Paid, or Cancel for Credit / Pending Payment.'
    );
    StorageService.confirmDelivery(orderId, {
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      paymentMethod: isPaid ? 'cash' : 'credit',
      notes: 'Delivered at store by sales rep'
    });
  };

  const handleCollectPayment = (orderId: string, amount: number) => {
    StorageService.recordPayment(orderId, 'paid', amount, 'cash');
  };

  const percentage = assignedShops.length > 0
    ? Math.round((completedVisits.length / assignedShops.length) * 100)
    : 0;

  // Next shop to visit in user's target sequence
  const nextShopId = targetShopIds.find((id) => {
    const v = todayVisits.find((vis) => vis.shopId === id);
    return !v || (v.status !== 'completed' && v.status !== 'order_placed');
  });
  const nextShop: Shop | undefined = db.shops.find((s) => s.id === nextShopId);

  return (
    <div className="mobile-app-shell">
      {/* Top Header Bar */}
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onOpenDrawer}
            style={{
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-primary)'
            }}
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Good Morning,
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {currentUser.name}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              style={{
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '5px 11px',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid rgba(23, 63, 53, 0.12)'
              }}
              title="Open Admin Management Portal"
            >
              Admin Portal
            </button>
          )}

          <button
            onClick={() => alert('No new urgent notifications.')}
            style={{
              position: 'relative',
              padding: '6px',
              color: 'var(--text-primary)'
            }}
          >
            <Bell size={20} />
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#EF4444'
              }}
            />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="mobile-body-scroll">
        {/* Simple Route Selection Dropdown at Top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={15} color="var(--primary)" />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Active Route:
            </span>
          </div>

          <select
            value={selectedRouteId}
            onChange={(e) => handleRouteChange(e.target.value)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-light)',
              border: '1px solid rgba(23, 63, 53, 0.15)',
              color: 'var(--primary)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {db.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
        {/* Holiday Banner if active */}
        {todayHoliday && (
          <div
            style={{
              background: 'var(--warning-light)',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <AlertTriangle size={24} color="#D97706" />
            <div>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '14px' }}>
                Today is a Holiday: {todayHoliday.title}
              </div>
              <div style={{ fontSize: '12px', color: '#B45309' }}>
                Assigned route deliveries are optional/on hold today.
              </div>
            </div>
          </div>
        )}

        {/* Assigned Route Card (Matching Showcase Screen 2) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #173F35 0%, #1F5447 100%)',
            color: '#FFF',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: 'var(--shadow-md)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, fontSize: '12px', marginBottom: '4px' }}>
                <Calendar size={13} />
                <span>Today, {formattedDate}</span>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, margin: '2px 0 6px 0' }}>
                {currentRoute?.name || 'No Route Assigned'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
                  ✓ {completedVisits.length} Completed
                </span>
                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
                  ⏱ {Math.max(0, assignedShops.length - completedVisits.length)} Remaining
                </span>
              </div>

              {/* Multi-Agent Workload Toggle */}
              {hasMultiAgent && myAssignedShops.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setWorkloadFilter('my')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: workloadFilter === 'my' ? '#FFF' : 'rgba(255,255,255,0.2)',
                      color: workloadFilter === 'my' ? 'var(--primary)' : '#FFF',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>👤 My Shops ({myAssignedShops.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkloadFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: workloadFilter === 'all' ? '#FFF' : 'rgba(255,255,255,0.2)',
                      color: workloadFilter === 'all' ? 'var(--primary)' : '#FFF',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🏢 All Route ({allRouteShops.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Circular Progress Display */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '3px solid rgba(255, 255, 255, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1 }}>{percentage}%</span>
              <span style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase' }}>Done</span>
            </div>
          </div>

          <button
            onClick={onGoToRoute}
            style={{
              marginTop: '16px',
              background: '#FFF',
              color: 'var(--primary)',
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <MapPin size={16} /> Open Today's Route ({Math.max(0, assignedShops.length - completedVisits.length)} Remaining)
          </button>
        </div>

        {/* 4 Metric Tiles with Completed & Remaining Shops prominent */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
          {/* Tile 1: Completed Shops */}
          <div
            style={{
              background: '#FFF',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Completed</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--success)', marginTop: '1px' }}>
                {completedVisits.length} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>shops</span>
              </div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>

          {/* Tile 2: Remaining Shops */}
          <div
            style={{
              background: '#FFF',
              border: '1px solid #FDE68A',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Remaining</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--warning)', marginTop: '1px' }}>
                {Math.max(0, assignedShops.length - completedVisits.length)} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>shops</span>
              </div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--warning-light)', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
              ⏱
            </div>
          </div>

          {/* Tile 3: Orders Booked */}
          <div
            style={{
              background: '#FFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Orders Booked</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--accent)', marginTop: '1px' }}>
                {todayOrders.length}
              </div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} />
            </div>
          </div>

          {/* Tile 4: Delivered Sales (Updates after delivery is confirmed!) */}
          <div
            style={{
              background: '#FFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Delivered Sales</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--primary)', marginTop: '1px' }}>
                ₹{deliveredSalesToday.toLocaleString()}
              </div>
              <div style={{ fontSize: '10.5px', color: pendingDeliveryAmount > 0 ? '#B45309' : 'var(--text-secondary)', marginTop: '2px' }}>
                {pendingDeliveryAmount > 0 ? `+ ₹${pendingDeliveryAmount.toLocaleString()} pending` : `${deliveredOrders.length} delivered`}
              </div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={18} />
            </div>
          </div>
        </div>

        {/* PENDING DELIVERIES SECTION (Orders booked, awaiting delivery confirmation) */}
        {pendingDeliveries.length > 0 && (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13.5px', color: '#92400E' }}>
                <Truck size={16} color="#B45309" />
                Orders Awaiting Delivery ({pendingDeliveries.length})
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309' }}>
                ₹{pendingDeliveryAmount.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pendingDeliveries.map((ord) => (
                <div
                  key={ord.id}
                  style={{
                    background: '#FFF',
                    border: '1px solid #FDE68A',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {ord.shopNameSnapshot}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ord.orderNo} • {ord.items.length} items • ₹{ord.grandTotal.toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleConfirmDelivery(ord.id)}
                    className="btn-primary"
                    style={{ padding: '6px 10px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                    title="Confirm Delivery & Update Sales Amount"
                  >
                    Confirm Delivery
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PENDING PAYMENTS (OUTSTANDING DUES) SECTION */}
        {totalUnpaidDue > 0 && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-lg)',
              padding: '14px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', color: '#991B1B' }}>
                <AlertTriangle size={16} color="#DC2626" />
                Pending Payments ({currentRoute?.name || 'Route'}: ₹{routePendingDue.toLocaleString()})
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>
                ₹{totalUnpaidDue.toLocaleString()} Total Due
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unpaidOrders.slice(0, 3).map((ord) => {
                const due = ord.grandTotal - (ord.amountPaid || 0);
                return (
                  <div
                    key={ord.id}
                    style={{
                      background: '#FFF',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {ord.shopNameSnapshot}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {ord.invoiceNo} • Phone: {ord.shopPhoneSnapshot}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCollectPayment(ord.id, due)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        background: '#059669',
                        color: '#FFF',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="Collect full payment"
                    >
                      Collect ₹{due}
                    </button>
                  </div>
                );
              })}
              {unpaidOrders.length > 3 && (
                <button
                  onClick={() => onGoToTab('orders')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '4px'
                  }}
                >
                  View all {unpaidOrders.length} unpaid orders →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Next Shop Shortcut Card */}
        {nextShop && (
          <div
            style={{
              background: '#FFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
              Next Up on Route
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Store size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {nextShop.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ID: {nextShop.shopCode} • {nextShop.locality || nextShop.city}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onGoToShop(nextShop.id)}
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '12px' }}
              >
                <Navigation size={14} /> Start
              </button>
            </div>
          </div>
        )}

        {/* Quick Action Shortcuts */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <button
              onClick={() => onGoToTab('shops')}
              style={{
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store size={18} />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Shops</span>
            </button>

            <button
              onClick={() => onGoToTab('orders')}
              style={{
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Orders</span>
            </button>

            <button
              onClick={onGoToRoute}
              style={{
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Route</span>
            </button>

            <button
              onClick={onOpenDrawer}
              style={{
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F3E8FF', color: '#7E22CE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={18} />
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>More</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
