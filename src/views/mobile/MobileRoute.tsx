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

  // Route Selection
  const assignedRouteId = currentUser.assignedRouteIds[0] || db.routes[0]?.id || 'route_a';
  const [activeRouteId, setActiveRouteId] = useState<string>(() => {
    return localStorage.getItem('selected_route_id') || assignedRouteId;
  });
  const currentRoute: Route | undefined =
    db.routes.find((r) => r.id === activeRouteId && !r.isDeleted && r.active !== false) ||
    db.routes.find((r) => !r.isDeleted && r.active !== false) ||
    db.routes[0];

  // Holiday check
  const holiday = db.holidays.find((h) => h.dateString === selectedDate && !h.isDeleted && h.active !== false);

  // Workload filter for multi-agent routes
  const [workloadFilter, setWorkloadFilter] = useState<'my' | 'all'>('my');

  // Ordered shops in route
  const orderedShopIds = currentRoute?.orderedShopIds || [];
  const allOrderedShops: Shop[] = orderedShopIds
    .map((id) => db.shops.find((s) => s.id === id && !s.isDeleted && s.status !== 'inactive' && s.active !== false))
    .filter(Boolean) as Shop[];

  const myOrderedShops = allOrderedShops.filter((s) => s.assignedEmployeeId === currentUser.id);
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

  const completedCount = orderedShops.filter((s) => {
    const v = visitsForDate.find((vis) => vis.shopId === s.id);
    return v && (v.status === 'completed' || v.status === 'order_placed');
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

  // New Route Creation State
  const [isCreateRouteOpen, setIsCreateRouteOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteArea, setNewRouteArea] = useState('');
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
      defaultWeekdays: [1, 2, 3, 4, 5, 6],
      active: true
    });

    setActiveRouteId(created.id);
    setIsCreateRouteOpen(false);
    setNewRouteName('');
    setNewRouteCode('');
    setNewRouteArea('');
    setSelectedShopIdsForNewRoute([]);
    alert(`New Route "${created.name}" created and assigned!`);
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
                  padding: '4px 8px'
                }}
              >
                {db.routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
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

            {/* Completed & Remaining Counts Banner */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <span style={{ background: 'var(--success-light)', color: 'var(--success-dark)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                ✓ {completedCount} Completed
              </span>
              <span style={{ background: 'var(--warning-light)', color: '#B45309', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                ⏱ {Math.max(0, orderedShops.length - completedCount)} Remaining
              </span>
            </div>

            {/* Pending Payments on that Day / Route Banner */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: totalPendingRouteDues > 0 ? '#FEF2F2' : '#F0FDF4',
                border: totalPendingRouteDues > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color={totalPendingRouteDues > 0 ? '#DC2626' : '#16A34A'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: totalPendingRouteDues > 0 ? '#991B1B' : '#166534' }}>
                    Pending Payments on Route
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    Today's Pending: ₹{todayPendingRouteDues.toLocaleString()} • Total Route Due: ₹{totalPendingRouteDues.toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: totalPendingRouteDues > 0 ? '#DC2626' : '#16A34A' }}>
                  ₹{totalPendingRouteDues.toLocaleString()}
                </div>
                <div style={{ fontSize: '9.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Total Dues
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
                      <div style={{ marginTop: '5px' }}>
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
                          <CreditCard size={11} /> Due: ₹{shopPendingDue.toLocaleString()}
                        </span>
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
    </div>
  );
};
