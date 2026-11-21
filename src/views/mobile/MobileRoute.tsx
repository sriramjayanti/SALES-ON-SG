import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  MoreVertical,
  Navigation,
  Store,
  ChevronRight,
  AlertCircle,
  Plus,
  Check,
  Play,
  CreditCard
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Route, Shop, Visit } from '../../types';
import { Modal } from '../../components/Modal';

interface MobileRouteProps {
  currentUser: Employee;
  onBack: () => void;
  onOpenShop: (shopId: string) => void;
}

export const MobileRoute: React.FC<MobileRouteProps> = ({
  currentUser,
  onBack,
  onOpenShop
}) => {
  const db = StorageService.getDb();
  const [, setTick] = useState(0);

  useEffect(() => {
    return StorageService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const formattedDate = new Date(selectedDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Route Selection: Staff only sees assigned routes; Admin sees all active routes
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

  // Daily Route Auto-Rotation: match route according to the day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const selectedDayOfWeek = new Date(selectedDate).getDay();
  const scheduledRouteForDay = availableRoutes.find(
    (r) => Array.isArray(r.defaultWeekdays) && r.defaultWeekdays.includes(selectedDayOfWeek)
  );
  const defaultRouteId = scheduledRouteForDay?.id || availableRoutes[0]?.id || '';

  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    return scheduledRouteForDay?.id || localStorage.getItem('selected_route_id') || defaultRouteId;
  });

  // Automatically switch route to according day when date changes
  useEffect(() => {
    if (scheduledRouteForDay) {
      setActiveRouteId(scheduledRouteForDay.id);
    } else if (availableRoutes.length > 0) {
      const fallback = availableRoutes[selectedDayOfWeek % availableRoutes.length];
      if (fallback) setActiveRouteId(fallback.id);
    }
  }, [selectedDate, availableRoutes.length]);

  const currentRoute: Route | undefined =
    scheduledRouteForDay ||
    availableRoutes.find((r) => r.id === activeRouteId) ||
    availableRoutes[selectedDayOfWeek % (availableRoutes.length || 1)] ||
    availableRoutes[0];

  // Holiday check
  const holiday = db.holidays.find((h) => h.dateString === selectedDate && !h.isDeleted && h.active !== false);

  // Workload filter for multi-agent routes
  const [workloadFilter, setWorkloadFilter] = useState<'my' | 'all'>('my');

  // Ordered shops in route
  const orderedShopIds = currentRoute?.orderedShopIds || [];
  let allOrderedShops: Shop[] = orderedShopIds
    .map((id) => db.shops.find((s) => s.id === id && !s.isDeleted && s.status !== 'inactive' && s.active !== false))
    .filter(Boolean) as Shop[];

  // If staff has specific custom shops assigned across routes, ONLY those shops are visible!
  if (hasAssignedShops) {
    allOrderedShops = allOrderedShops.filter((s) => currentUser.assignedShopIds!.includes(s.id));
    if (currentRoute) {
      const extraAssigned = db.shops.filter(
        (s) =>
          currentUser.assignedShopIds!.includes(s.id) &&
          s.routeId === currentRoute.id &&
          !s.isDeleted &&
          s.status !== 'inactive' &&
          s.active !== false &&
          !allOrderedShops.some((existing) => existing.id === s.id)
      );
      if (extraAssigned.length > 0) {
        allOrderedShops = [...allOrderedShops, ...extraAssigned];
      }
    }
  }

  const myOrderedShops = allOrderedShops.filter((s) => s.assignedEmployeeId === currentUser.id || currentUser.assignedShopIds?.includes(s.id));
  const hasMultiAgent = allOrderedShops.some((s) => s.assignedEmployeeId);

  const orderedShops = hasMultiAgent && myOrderedShops.length > 0 && workloadFilter === 'my'
    ? myOrderedShops
    : allOrderedShops;

  // Route team members
  const routeEmpIds = currentRoute?.assignedEmployeeIds && currentRoute.assignedEmployeeIds.length > 0
    ? currentRoute.assignedEmployeeIds
    : currentRoute?.assignedEmployeeId ? [currentRoute.assignedEmployeeId] : [];
  const teamReps = db.employees.filter((e) => routeEmpIds.includes(e.id));

  // Visits for selected date
  const visitsForDate: Visit[] = db.visits.filter((v) => v.dateString === selectedDate);

  // Real-time Completed Count: A shop is completed if an order was placed on selectedDate OR marked visited
  const completedCount = orderedShops.filter((s) => {
    const hasOrder = db.orders.some(
      (o) => o.shopId === s.id && o.dateString === selectedDate && !o.isDeleted
    );
    const v = visitsForDate.find((vis) => vis.shopId === s.id);
    const hasVisit = v && (v.status === 'completed' || v.status === 'order_placed' || v.status === 'no_order');
    return hasOrder || hasVisit;
  }).length;

  // Pending Payments on this Route & Today
  const routeShopIds = currentRoute?.orderedShopIds || [];
  const routeUnpaidOrders = db.orders.filter(
    (o) => (o.routeId === currentRoute?.id || routeShopIds.includes(o.shopId)) &&
           o.status === 'completed' &&
           o.paymentStatus !== 'paid' &&
           !o.isDeleted
  );
  const totalPendingRouteDues = routeUnpaidOrders.reduce(
    (sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)),
    0
  );

  const todayRouteUnpaidOrders = routeUnpaidOrders.filter((o) => o.dateString === selectedDate);
  const todayPendingRouteDues = todayRouteUnpaidOrders.reduce(
    (sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)),
    0
  );

  // Collections Today on this Route (Cash + UPI Breakdown)
  const todayRouteOrders = db.orders.filter(
    (o) => (o.routeId === currentRoute?.id || routeShopIds.includes(o.shopId)) &&
           o.status === 'completed' &&
           o.dateString === selectedDate &&
           !o.isDeleted
  );
  const todayRoutePaid = todayRouteOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const todayRouteCash = todayRouteOrders.reduce((sum, o) => sum + (o.cashAmount || (o.paymentMethod === 'cash' ? o.amountPaid : 0) || 0), 0);
  const todayRouteUpi = todayRouteOrders.reduce((sum, o) => sum + (o.upiAmount || (o.paymentMethod === 'upi' ? o.amountPaid : 0) || 0), 0);

  // New Route Creation State
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteArea, setNewRouteArea] = useState('');
  const [newRouteWeekdays, setNewRouteWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [selectedShopIdsForNewRoute, setSelectedShopIdsForNewRoute] = useState<string[]>([]);

  const toggleShopForNewRoute = (shopId: string) => {
    setSelectedShopIdsForNewRoute((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
    );
  };

  const handleSaveNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return alert('Please enter a route name');

    const created = StorageService.addRoute({
      name: newRouteName.trim(),
      code: newRouteCode.trim() || newRouteName.slice(0, 4).toUpperCase(),
      area: newRouteArea.trim() || 'General Territory',
      assignedEmployeeId: currentUser.id,
      orderedShopIds: selectedShopIdsForNewRoute,
      defaultWeekdays: newRouteWeekdays.length > 0 ? newRouteWeekdays : [1, 2, 3, 4, 5, 6],
      active: true
    });

    setActiveRouteId(created.id);
    setIsCreateRouteOpen(false);
    setNewRouteName('');
    setNewRouteCode('');
    setNewRouteArea('');
    setNewRouteWeekdays([1, 2, 3, 4, 5, 6]);
    setSelectedShopIdsForNewRoute([]);
    alert(`New Route "${created.name}" created and assigned!`);
  };

  // Dual Payment Collection Modal State
  const [collectModalShop, setCollectModalShop] = useState<{ shop: Shop; due: number } | null>(null);
  const [collectMode, setCollectMode] = useState<'cash' | 'upi' | 'split'>('cash');
  const [collectCashInput, setCollectCashInput] = useState<string>('');
  const [collectUpiInput, setCollectUpiInput] = useState<string>('');

  const openCollectModal = (shop: Shop, due: number) => {
    setCollectModalShop({ shop, due });
    setCollectMode('cash');
    setCollectCashInput(due.toString());
    setCollectUpiInput('');
  };

  const handleConfirmCollectModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalShop) return;
    const { shop, due } = collectModalShop;

    let cAmt = 0;
    let uAmt = 0;
    if (collectMode === 'cash') {
      cAmt = parseFloat(collectCashInput) || 0;
    } else if (collectMode === 'upi') {
      uAmt = parseFloat(collectUpiInput) || 0;
    } else {
      cAmt = parseFloat(collectCashInput) || 0;
      uAmt = parseFloat(collectUpiInput) || 0;
    }

    const totalCollected = cAmt + uAmt;
    if (totalCollected <= 0) {
      alert('⚠️ Compulsory Payment Required: Please enter at least some amount to collect (Cash, UPI, or Split). Partial payment is allowed.');
      return;
    }

    let remaining = Math.min(totalCollected, due);
    const unpaidOrders = db.orders
      .filter((o) => o.shopId === shop.id && o.status === 'completed' && o.paymentStatus !== 'paid' && !o.isDeleted)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remainingCash = cAmt;
    let remainingUpi = uAmt;

    for (const ord of unpaidOrders) {
      if (remaining <= 0) break;
      const ordDue = ord.grandTotal - (ord.amountPaid || 0);
      const payPortion = Math.min(remaining, ordDue);
      const isOrdPaid = payPortion >= ordDue;

      const portionCash = Math.min(remainingCash, payPortion);
      remainingCash -= portionCash;
      const portionUpi = Math.min(remainingUpi, payPortion - portionCash);
      remainingUpi -= portionUpi;

      const finalMethod = portionCash > 0 && portionUpi > 0 ? 'split' : portionUpi > 0 ? 'upi' : 'cash';

      StorageService.recordPayment(ord.id, isOrdPaid ? 'paid' : 'partial', payPortion, finalMethod, {
        cashAmount: portionCash,
        upiAmount: portionUpi,
        note: `Route payment collection: Cash ₹${portionCash} + UPI ₹${portionUpi}`
      });

      remaining -= payPortion;
    }

    const newDue = Math.max(0, due - totalCollected);
    setCollectModalShop(null);
    if (newDue > 0) {
      alert(`₹${totalCollected.toLocaleString()} collected for ${shop.name} (Cash: ₹${cAmt}, UPI: ₹${uAmt})!\nRemaining Balance Due: ₹${newDue.toLocaleString()} (will show pending until paid).`);
    } else {
      alert(`Full payment of ₹${totalCollected.toLocaleString()} collected for ${shop.name}! All pending dues cleared.`);
    }
  };

  return (
    <div className="mobile-app-shell">
      {/* Top Header */}
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ padding: '6px', color: 'var(--text-primary)' }} title="Back to Home">
            <ArrowLeft size={20} />
          </button>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
            Today's Route
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsCreateRouteOpen(true)}
            className="btn-primary"
            style={{ padding: '6px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Create New Delivery Route"
          >
            <Plus size={14} /> New Route
          </button>

          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px'
            }}
          >
            {currentUser.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mobile-body-scroll">
        {/* Date Selector Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>
            <Calendar size={16} color="var(--primary)" />
            <span>{formattedDate}</span>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {completedCount} / {orderedShops.length} Visited
          </span>
        </div>

        {/* Route Banner Card with Selector */}
        {currentRoute && (
          <div
            style={{
              background: '#FFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '18px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <select
                value={activeRouteId}
                onChange={(e) => {
                  setActiveRouteId(e.target.value);
                  localStorage.setItem('selected_route_id', e.target.value);
                }}
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  maxWidth: '220px'
                }}
              >
                {availableRoutes.length === 0 ? (
                  <option value="">No Assigned Routes</option>
                ) : (
                  availableRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}){r.id === scheduledRouteForDay?.id ? " ⭐ (Scheduled Route)" : ''}
                    </option>
                  ))
                )}
              </select>

              <span className="status-chip active">Assigned</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {currentRoute.area}
            </div>

            {/* Assigned Sales Team */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Team:</span>
              {teamReps.map((r) => (
                <span
                  key={r.id}
                  style={{
                    background: r.id === currentUser.id ? 'var(--primary-light)' : '#F1F5F4',
                    color: 'var(--primary)',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {r.name} {r.id === currentUser.id && '(You)'}
                </span>
              ))}
            </div>

            {/* 4 Route KPI Cards: Remaining Shops, Completed Shops, Amount Paid (Cash+UPI), Balance Due */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px' }}>
              {/* Card 1: Remaining Shops */}
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1.5px solid #FCD34D',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>Remaining</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '1px' }}>
                    {Math.max(0, orderedShops.length - completedCount)} <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>shops</span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                    Done: {completedCount} / {orderedShops.length}
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                  ⏱
                </div>
              </div>

              {/* Card 2: Completed Shops */}
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1.5px solid #A7F3D0',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#065F46', fontWeight: 700, textTransform: 'uppercase' }}>Completed</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800, color: 'var(--success)', marginTop: '1px' }}>
                    {completedCount} <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>shops</span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                    {orderedShops.length > 0 ? Math.round((completedCount / orderedShops.length) * 100) : 0}% progress
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>

              {/* Card 3: Amount Paid Today */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Amount Paid</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: '#15803D', marginTop: '1px' }}>
                    ₹{todayRoutePaid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    💵 ₹{todayRouteCash.toLocaleString()} • 📱 ₹{todayRouteUpi.toLocaleString()}
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  ₹
                </div>
              </div>

              {/* Card 4: Balance Due */}
              <div
                style={{
                  background: totalPendingRouteDues > 0 ? '#FEF2F2' : '#F0FDF4',
                  border: totalPendingRouteDues > 0 ? '1.5px solid #FECACA' : '1.5px solid #BBF7D0',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: totalPendingRouteDues > 0 ? '#991B1B' : '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Balance Due</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: totalPendingRouteDues > 0 ? '#DC2626' : 'var(--success)', marginTop: '1px' }}>
                    ₹{totalPendingRouteDues.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                    {todayPendingRouteDues > 0 ? `Today: ₹${todayPendingRouteDues.toLocaleString()}` : 'Cleared today'}
                  </div>
                </div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: totalPendingRouteDues > 0 ? '#FEE2E2' : '#DCFCE7', color: totalPendingRouteDues > 0 ? '#DC2626' : '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} />
                </div>
              </div>
            </div>

            {/* Multi-Agent Workload Toggle */}
            {hasMultiAgent && myOrderedShops.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('my')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: workloadFilter === 'my' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: workloadFilter === 'my' ? 'var(--primary-light)' : '#FFF',
                    color: workloadFilter === 'my' ? 'var(--primary)' : 'var(--text-secondary)'
                  }}
                >
                  👤 My Assigned ({myOrderedShops.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('all')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: workloadFilter === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: workloadFilter === 'all' ? 'var(--primary-light)' : '#FFF',
                    color: workloadFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)'
                  }}
                >
                  🏢 All Route Shops ({allOrderedShops.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Holiday Notice */}
        {holiday && (
          <div
            style={{
              background: 'var(--warning-light)',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              fontSize: '12.5px',
              color: '#92400E'
            }}
          >
            <AlertCircle size={18} />
            <span>Declared Holiday: <strong>{holiday.title}</strong></span>
          </div>
        )}

        {/* Ordered Shop Step Sequence */}
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
            Scheduled Shop Sequence
          </div>

          {orderedShops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
              No shops currently mapped to this route. Add shops from Admin Portal.
            </div>
          ) : (
            orderedShops.map((shop, index) => {
              const stepNumber = index + 1;
              const visit = visitsForDate.find((v) => v.shopId === shop.id);
              const isCompleted = visit?.status === 'completed' || visit?.status === 'order_placed';
              const isStarted = visit?.status === 'started';
              const isSkipped = visit?.status === 'skipped' || visit?.status === 'no_order';

              // Shop unpaid dues
              const shopUnpaidOrders = db.orders.filter(
                (o) => o.shopId === shop.id && o.status === 'completed' && o.paymentStatus !== 'paid' && !o.isDeleted
              );
              const shopPendingDue = shopUnpaidOrders.reduce(
                (sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)),
                0
              );

              return (
                <div
                  key={shop.id}
                  className="route-step-card"
                  onClick={() => onOpenShop(shop.id)}
                  style={{
                    cursor: 'pointer',
                    background: isCompleted ? '#FAFCFA' : '#FFF',
                    borderColor: isCompleted ? '#A7F3D0' : 'var(--border)'
                  }}
                >
                  {/* Step Number Badge or Shop Image */}
                  {shop.imageUrl ? (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={shop.imageUrl}
                        alt={shop.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          objectFit: 'cover',
                          border: isCompleted ? '2px solid #10B981' : '1px solid var(--border)'
                        }}
                      />
                      {isCompleted && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-4px',
                            right: '-4px',
                            background: '#10B981',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFF'
                          }}
                        >
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`step-number-badge ${isCompleted ? 'completed' : ''}`}
                      style={
                        isCompleted
                          ? { background: 'var(--success-light)', color: 'var(--success-dark)' }
                          : isStarted
                          ? { background: 'var(--warning-light)', color: '#B45309' }
                          : {}
                      }
                    >
                      {isCompleted ? <CheckCircle2 size={18} color="#047857" /> : stepNumber}
                    </div>
                  )}

                  {/* Shop Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <h4
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {shop.name}
                      </h4>
                      {shop.assignedEmployeeId && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '12px',
                            whiteSpace: 'nowrap',
                            background: shop.assignedEmployeeId === currentUser.id ? 'var(--primary-light)' : '#F3F4F6',
                            color: shop.assignedEmployeeId === currentUser.id ? 'var(--primary)' : 'var(--text-secondary)'
                          }}
                        >
                          👤 {shop.assignedEmployeeId === currentUser.id ? 'You' : db.employees.find((e) => e.id === shop.assignedEmployeeId)?.name?.split(' ')[0] || 'Agent'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span>ID: {shop.shopCode}</span>
                      {shop.preferredVisitTime && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--primary)', fontWeight: 600 }}>
                            <Clock size={11} /> {shop.preferredVisitTime}
                          </span>
                        </>
                      )}
                      {shop.preferredVisitDate && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                            <Calendar size={11} /> {shop.preferredVisitDate}
                          </span>
                        </>
                      )}
                    </div>

                    {shop.description && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shop.description}
                      </div>
                    )}

                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {shop.locality || shop.address}
                    </div>

                    {shopPendingDue > 0 && (
                      <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CreditCard size={11} /> Balance Pending: ₹{shopPendingDue.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCollectModal(shop, shopPendingDue);
                          }}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: '#059669',
                            color: '#FFF',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Collect Full or Partial Payment (Cash / UPI / Split)"
                        >
                          Collect ₹
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action / Status Chip */}
                  <div>
                    {isCompleted ? (
                      <span className="status-chip completed" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        Done
                      </span>
                    ) : isStarted ? (
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShop(shop.id);
                        }}
                      >
                        Resume
                      </button>
                    ) : isSkipped ? (
                      <span className="status-chip skipped" style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {visit?.status === 'no_order' ? 'No Order' : 'Skipped'}
                      </span>
                    ) : (
                      <button
                        className="btn-primary"
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: 'var(--primary)',
                          color: '#FFF',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenShop(shop.id);
                        }}
                      >
                        <Play size={11} fill="#FFF" /> Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE NEW ROUTE MODAL */}
      <Modal
        isOpen={isCreateRouteOpen}
        onClose={() => setIsCreateRouteOpen(false)}
        title="Create New Delivery Route"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsCreateRouteOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveNewRoute}>
              Save & Activate Route
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveNewRoute} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Route Name *
            </label>
            <input
              type="text"
              required
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              placeholder="e.g. Ring Road Express / Route C"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Route Code
              </label>
              <input
                type="text"
                value={newRouteCode}
                onChange={(e) => setNewRouteCode(e.target.value)}
                placeholder="e.g. R-EXP"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Area / City
              </label>
              <input
                type="text"
                value={newRouteArea}
                onChange={(e) => setNewRouteArea(e.target.value)}
                placeholder="e.g. Vijayawada Central"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Scheduled Days Selection (Monday to Sunday) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Scheduled Days (Mon to Sun) *
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setNewRouteWeekdays([1, 2, 3, 4, 5, 6, 0])}
                  style={{ fontSize: '10.5px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  All Days
                </button>
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <button
                  type="button"
                  onClick={() => setNewRouteWeekdays([1, 2, 3, 4, 5, 6])}
                  style={{ fontSize: '10.5px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Mon-Sat
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {[
                { day: 1, label: 'Mon' },
                { day: 2, label: 'Tue' },
                { day: 3, label: 'Wed' },
                { day: 4, label: 'Thu' },
                { day: 5, label: 'Fri' },
                { day: 6, label: 'Sat' },
                { day: 0, label: 'Sun' }
              ].map((item) => {
                const isSelected = newRouteWeekdays.includes(item.day);
                return (
                  <button
                    type="button"
                    key={item.day}
                    onClick={() => {
                      setNewRouteWeekdays((prev) =>
                        prev.includes(item.day)
                          ? prev.filter((d) => d !== item.day)
                          : [...prev, item.day]
                      );
                    }}
                    style={{
                      padding: '7px 0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'center',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-light)' : '#FFF',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shop Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Assign Shops ({selectedShopIdsForNewRoute.length} selected)</span>
              <span style={{ fontSize: '11px', color: 'var(--primary)' }}>Tap store to toggle</span>
            </label>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px',
                marginTop: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {db.shops.map((s) => {
                const isSelected = selectedShopIdsForNewRoute.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleShopForNewRoute(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-main)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {s.ownerName} • {s.shopCode}
                      </div>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        background: isSelected ? 'var(--primary)' : '#FFF',
                        border: isSelected ? 'none' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF'
                      }}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Dual Payment Collection Modal */}
      {collectModalShop && (
        <Modal
          isOpen={!!collectModalShop}
          onClose={() => setCollectModalShop(null)}
          title={`Collect Due: ${collectModalShop.shop.name}`}
        >
          <form onSubmit={handleConfirmCollectModal}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700, textTransform: 'uppercase' }}>Total Balance Pending</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                ₹{collectModalShop.due.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Shop Owner: {collectModalShop.shop.ownerName} • {collectModalShop.shop.phone}
              </div>
            </div>

            {/* Payment Method Selector */}
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Select Payment Mode:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => {
                  setCollectMode('cash');
                  setCollectCashInput(collectModalShop.due.toString());
                  setCollectUpiInput('');
                }}
                style={{
                  padding: '9px 6px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: collectMode === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: collectMode === 'cash' ? 'var(--primary-light)' : '#FFF',
                  color: collectMode === 'cash' ? 'var(--primary)' : 'var(--text-secondary)'
                }}
              >
                💵 Cash
              </button>

              <button
                type="button"
                onClick={() => {
                  setCollectMode('upi');
                  setCollectUpiInput(collectModalShop.due.toString());
                  setCollectCashInput('');
                }}
                style={{
                  padding: '9px 6px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: collectMode === 'upi' ? '2px solid #2563EB' : '1px solid var(--border)',
                  background: collectMode === 'upi' ? '#EFF6FF' : '#FFF',
                  color: collectMode === 'upi' ? '#2563EB' : 'var(--text-secondary)'
                }}
              >
                📱 UPI
              </button>

              <button
                type="button"
                onClick={() => {
                  setCollectMode('split');
                  const half = Math.round(collectModalShop.due / 2);
                  setCollectCashInput(half.toString());
                  setCollectUpiInput((collectModalShop.due - half).toString());
                }}
                style={{
                  padding: '9px 6px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: collectMode === 'split' ? '2px solid #D97706' : '1px solid var(--border)',
                  background: collectMode === 'split' ? '#FFFBEB' : '#FFF',
                  color: collectMode === 'split' ? '#B45309' : 'var(--text-secondary)'
                }}
              >
                ⚡ Split
              </button>
            </div>

            {/* Inputs based on mode */}
            {collectMode === 'cash' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  💵 Cash Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={collectCashInput}
                  onChange={(e) => setCollectCashInput(e.target.value)}
                  placeholder="Enter cash collected"
                  style={{ width: '100%', height: '42px', fontSize: '15px', fontWeight: 700 }}
                  required
                />
              </div>
            )}

            {collectMode === 'upi' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  📱 UPI Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={collectUpiInput}
                  onChange={(e) => setCollectUpiInput(e.target.value)}
                  placeholder="Enter UPI collected"
                  style={{ width: '100%', height: '42px', fontSize: '15px', fontWeight: 700 }}
                  required
                />
              </div>
            )}

            {collectMode === 'split' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                    💵 Cash (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={collectCashInput}
                    onChange={(e) => setCollectCashInput(e.target.value)}
                    placeholder="Cash part"
                    style={{ width: '100%', height: '42px', fontSize: '15px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px' }}>
                    📱 UPI (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={collectUpiInput}
                    onChange={(e) => setCollectUpiInput(e.target.value)}
                    placeholder="UPI part"
                    style={{ width: '100%', height: '42px', fontSize: '15px', fontWeight: 700 }}
                  />
                </div>
              </div>
            )}

            {/* Total collected calculation and remaining balance hint */}
            {(() => {
              const c = parseFloat(collectCashInput) || 0;
              const u = parseFloat(collectUpiInput) || 0;
              const tot = c + u;
              const rem = Math.max(0, collectModalShop.due - tot);
              return (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Entering:</span>
                    <strong style={{ color: '#047857' }}>₹{tot.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance Due:</span>
                    <strong style={{ color: rem > 0 ? '#DC2626' : 'var(--success)' }}>
                      ₹{rem.toLocaleString()} {rem > 0 ? '(Pending)' : '(Cleared)'}
                    </strong>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCollectModalShop(null)}
                style={{ flex: 1, height: '42px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 2, height: '42px', fontWeight: 700 }}
              >
                Confirm Payment Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
