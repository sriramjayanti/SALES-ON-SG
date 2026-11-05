import React from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Store,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  FileText,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Order, AuditLog } from '../../types';

interface AdminDashboardProps {
  currentUser: Employee;
  onNavigateTab: (tab: any) => void;
  onViewInvoice: (order: Order) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onNavigateTab,
  onViewInvoice
}) => {
  const db = StorageService.getDb();

  // Metrics: Orders & Delivery
  const totalOrdersCount = db.orders.length;
  const completedOrders = db.orders.filter((o) => o.status === 'completed');

  // Delivered Sales (only completed deliveries count in Delivered Revenue)
  const deliveredOrders = completedOrders.filter((o) => o.deliveryStatus === 'delivered');
  const deliveredSalesAmount = deliveredOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Pending Deliveries
  const pendingDeliveryOrders = completedOrders.filter((o) => o.deliveryStatus === 'pending');
  const pendingDeliveryAmount = pendingDeliveryOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Pending Payments (Unpaid dues)
  const unpaidOrders = completedOrders.filter((o) => o.paymentStatus !== 'paid');
  const totalPendingPayments = unpaidOrders.reduce(
    (sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)),
    0
  );

  const totalShopsCount = db.shops.length;
  const activeEmployeesCount = db.employees.filter((e) => e.status === 'active').length;

  const handleConfirmDelivery = (orderId: string) => {
    const isPaid = window.confirm(
      'Did you collect payment upon delivery? Click OK for Paid, or Cancel for Credit / Pending Payment.'
    );
    StorageService.confirmDelivery(orderId, {
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      paymentMethod: isPaid ? 'cash' : 'credit',
      notes: 'Delivered and verified by Admin'
    });
  };

  const handleCollectPayment = (orderId: string, amount: number) => {
    StorageService.recordPayment(orderId, 'paid', amount, 'cash');
  };

  // Route completion calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const allRouteShopIds = db.routes.flatMap((r) => r.orderedShopIds);
  const todayVisits = db.visits.filter((v) => v.dateString === todayStr);
  const completedVisits = todayVisits.filter((v) => v.status === 'completed' || v.status === 'order_placed');
  const pendingVisitsCount = Math.max(0, allRouteShopIds.length - completedVisits.length);
  const completionPercentage = allRouteShopIds.length > 0
    ? Math.round((completedVisits.length / allRouteShopIds.length) * 100)
    : 0;

  // Recent 5 orders
  const recentOrders = db.orders.slice(0, 5);

  // Today activity logs (last 5)
  const recentLogs: AuditLog[] = db.auditLogs.slice(0, 5);

  // Helper for simple description in Today's Activity
  const getSimpleActivity = (log: AuditLog) => {
    const sum = log.summary || '';
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actor = log.actorName.split(' ')[0] || log.actorName;

    if (sum.toLowerCase().includes('order') || log.action.includes('ORDER')) {
      const ordMatch = sum.match(/ORD-[^\s,]+/i) || sum.match(/VS-[^\s,]+/i);
      const amtMatch = sum.match(/₹[\d,]+/);
      return {
        title: 'New Order Placed',
        desc: `${ordMatch ? ordMatch[0] : 'Order'} ${amtMatch ? `• ${amtMatch[0]}` : ''}`,
        meta: `${actor} • ${timeStr}`,
        icon: <ShoppingBag size={14} />,
        bg: '#ECFDF5',
        color: '#059669'
      };
    }
    if (sum.toLowerCase().includes('delivery') || log.action.includes('DELIVERY')) {
      return {
        title: 'Delivery Confirmed',
        desc: sum.replace(/Confirmed delivery for\s*/i, 'Delivered: '),
        meta: `${actor} • ${timeStr}`,
        icon: <Truck size={14} />,
        bg: '#EFF6FF',
        color: '#2563EB'
      };
    }
    if (sum.toLowerCase().includes('payment') || log.action.includes('PAYMENT')) {
      const amtMatch = sum.match(/₹[\d,]+/);
      return {
        title: 'Payment Received',
        desc: amtMatch ? `Collected ${amtMatch[0]} in cash` : 'Payment collected',
        meta: `${actor} • ${timeStr}`,
        icon: <CreditCard size={14} />,
        bg: '#F0FDF4',
        color: '#16A34A'
      };
    }
    if (sum.toLowerCase().includes('shop') || log.action.includes('SHOP')) {
      return {
        title: 'Retail Shop Updated',
        desc: sum.replace(/Added new shop\s*/i, 'Added: ').replace(/Updated shop details for\s*/i, 'Updated: '),
        meta: `${actor} • ${timeStr}`,
        icon: <Store size={14} />,
        bg: '#FFFBEB',
        color: '#D97706'
      };
    }
    return {
      title: 'System Activity',
      desc: sum,
      meta: `${actor} • ${timeStr}`,
      icon: <Clock size={14} />,
      bg: '#F3F4F6',
      color: '#4B5563'
    };
  };

  return (
    <div>
      {/* 2-per-line KPI Grid (Side by Side) */}
      <div className="kpi-grid">
        {/* KPI 1: Total Orders */}
        <div className="kpi-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Total Orders</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span className="kpi-value">{totalOrdersCount}</span>
              <span className="kpi-badge positive">
                <ArrowUpRight size={11} /> +12%
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              All-time orders taken
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <ShoppingBag size={20} />
          </div>
        </div>

        {/* KPI 2: Delivered Sales */}
        <div className="kpi-card">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Delivered Sales</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span className="kpi-value" style={{ color: '#059669' }}>₹{deliveredSalesAmount.toLocaleString()}</span>
              <span className="kpi-badge positive">
                <CheckCircle2 size={11} /> {deliveredOrders.length} Delivered
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Verified revenue delivered
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#ECFDF5', color: '#059669' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        {/* KPI 3: Pending Deliveries */}
        <div className="kpi-card" onClick={() => onNavigateTab('orders')} style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Pending Deliveries</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span className="kpi-value" style={{ color: pendingDeliveryOrders.length > 0 ? '#D97706' : 'var(--text-primary)' }}>
                {pendingDeliveryOrders.length}
              </span>
              {pendingDeliveryOrders.length > 0 && (
                <span className="kpi-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>
                  ₹{pendingDeliveryAmount.toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {pendingDeliveryOrders.length > 0 ? 'Orders awaiting dispatch' : 'All orders dispatched'}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Truck size={20} />
          </div>
        </div>

        {/* KPI 4: Pending Payments (Dues) */}
        <div className="kpi-card" onClick={() => onNavigateTab('orders')} style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Pending Payments</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
              <span className="kpi-value" style={{ color: totalPendingPayments > 0 ? '#DC2626' : 'var(--text-primary)' }}>
                ₹{totalPendingPayments.toLocaleString()}
              </span>
              {totalPendingPayments > 0 && (
                <span className="kpi-badge negative" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  {unpaidOrders.length} Dues
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Outstanding customer balance
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FEF2F2', color: '#DC2626' }}>
            <CreditCard size={20} />
          </div>
        </div>

        {/* KPI 5: Active Retail Shops */}
        <div className="kpi-card" onClick={() => onNavigateTab('shops')} style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Active Shops</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className="kpi-value">{totalShopsCount}</span>
              <span className="kpi-badge positive">
                <ArrowUpRight size={11} /> Stores
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Registered retailer accounts
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#F0FDF4', color: '#16A34A' }}>
            <Store size={20} />
          </div>
        </div>

        {/* KPI 6: Field Workforce */}
        <div className="kpi-card" onClick={() => onNavigateTab('employees')} style={{ cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kpi-title">Field Workforce</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className="kpi-value">{activeEmployeesCount}</span>
              <span className="kpi-badge" style={{ background: '#FAF5FF', color: '#7E22CE' }}>
                Active
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Sales reps on field routes
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FAF5FF', color: '#9333EA' }}>
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Middle Grid: Sales Overview Chart & Route Completion */}
      <div className="admin-grid-2-1">
        {/* Sales Overview Bar Chart Card */}
        <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Sales Overview
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Weekly Order Intake vs Net Revenue
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--primary)' }} />
                Orders
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38BDF8' }} />
                Sales (₹)
              </span>
            </div>
          </div>

          {/* Realistic Bar Chart Visualizer */}
          <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '10px 10px 0 10px', borderBottom: '1px solid var(--border)' }}>
            {[
              { day: 'Mon', orders: 40, sales: 85 },
              { day: 'Tue', orders: 60, sales: 110 },
              { day: 'Wed', orders: 75, sales: 140 },
              { day: 'Thu', orders: 90, sales: 160 },
              { day: 'Fri', orders: 80, sales: 145 },
              { day: 'Sat', orders: 95, sales: 175 },
              { day: 'Sun', orders: 30, sales: 65 }
            ].map((d) => (
              <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '150px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: `${(d.orders / 100) * 120}px`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0'
                    }}
                    title={`Orders: ${d.orders}`}
                  />
                  <div
                    style={{
                      width: '14px',
                      height: `${(d.sales / 180) * 150}px`,
                      background: '#38BDF8',
                      borderRadius: '4px 4px 0 0'
                    }}
                    title={`Sales: ₹${d.sales * 100}`}
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Route Completion Donut / Progress */}
        <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Route Completion
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Daily field visit progress
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(var(--primary) ${completionPercentage * 3.6}deg, #E8F1EE 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
              }}
            >
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: '#FFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
                  {completionPercentage}%
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Done</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '18px', width: '100%', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success-dark)' }}>
                  {completedVisits.length}
                </div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pending</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--warning)' }}>
                  {pendingVisitsCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PENDING PAYMENTS (OUTSTANDING DUES) CARD */}
      {unpaidOrders.length > 0 && (
        <div className="table-card" style={{ marginBottom: '20px', border: '1px solid #FCA5A5' }}>
          <div className="table-header-toolbar" style={{ background: '#FEF2F2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#DC2626" />
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, color: '#991B1B' }}>
                  Pending Customer Payments ({unpaidOrders.length} Invoices Due)
                </h3>
                <div style={{ fontSize: '12px', color: '#B91C1C' }}>
                  Total Outstanding Balance: <strong>₹{totalPendingPayments.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('orders')}
              style={{ fontSize: '12.5px', color: '#DC2626', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              View in Orders →
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Retailer Shop</th>
                <th>Contact</th>
                <th>Total Bill</th>
                <th>Amount Due</th>
                <th>Delivery Status</th>
                <th style={{ textAlign: 'right' }}>Payment Action</th>
              </tr>
            </thead>
            <tbody>
              {unpaidOrders.slice(0, 5).map((ord) => {
                const due = ord.grandTotal - (ord.amountPaid || 0);
                const isDelivered = ord.deliveryStatus === 'delivered';

                return (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ord.invoiceNo}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.shopNameSnapshot}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rep: {ord.employeeNameSnapshot}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ord.shopPhoneSnapshot}</td>
                    <td style={{ fontSize: '12.5px' }}>₹{ord.grandTotal.toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: '#DC2626', fontSize: '13.5px' }}>
                      ₹{due.toLocaleString()}
                    </td>
                    <td>
                      <span className={`status-chip ${isDelivered ? 'delivered' : 'pending_delivery'}`} style={{ fontSize: '11px' }}>
                        {isDelivered ? 'Delivered' : 'Pending Delivery'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleCollectPayment(ord.id, due)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '4px',
                          background: '#059669',
                          color: '#FFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        title="Mark full payment collected"
                      >
                        Collect ₹{due}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Grid: Recent Orders Table & Activity Logs Feed */}
      <div className="admin-grid-2-1">
        {/* Recent Orders Table */}
        <div className="table-card">
          <div className="table-header-toolbar">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>
              Recent Orders
            </h3>
            <button
              onClick={() => onNavigateTab('orders')}
              style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: 600 }}
            >
              View All ({db.orders.length})
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Shop Name</th>
                <th>Amount</th>
                <th>Delivery</th>
                <th>Payment</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((ord) => {
                const isDelivered = ord.deliveryStatus === 'delivered';
                const isPaid = ord.paymentStatus === 'paid';
                const due = ord.grandTotal - (ord.amountPaid || 0);

                return (
                  <tr key={ord.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      <div>{ord.orderNo}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{ord.invoiceNo}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.shopNameSnapshot}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ord.dateString}</div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '13.5px' }}>
                      ₹{ord.grandTotal.toLocaleString()}
                    </td>
                    <td>
                      {isDelivered ? (
                        <span className="status-chip delivered" style={{ fontSize: '11px' }}>
                          Delivered
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmDelivery(ord.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#FEF3C7',
                            color: '#B45309',
                            border: '1px solid #FCD34D',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Confirm Delivery to store"
                        >
                          <Truck size={12} /> Confirm
                        </button>
                      )}
                    </td>
                    <td>
                      {isPaid ? (
                        <span className="status-chip paid" style={{ fontSize: '11px' }}>
                          Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCollectPayment(ord.id, due)}
                          style={{
                            padding: '4px 8px',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Record payment collection"
                        >
                          Collect ₹{due}
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onViewInvoice(ord)}
                        style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Today's Activity Live Feed (Audit Trail) */}
        <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>
              Today's Activity
            </h3>
            <button
              onClick={() => onNavigateTab('audit')}
              style={{ fontSize: '12.5px', color: 'var(--primary)', fontWeight: 600 }}
            >
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No activity recorded today.
              </div>
            ) : (
              recentLogs.map((log) => {
                const act = getSimpleActivity(log);
                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: act.bg,
                        color: act.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {act.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {act.title}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {act.meta}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px'
                        }}
                      >
                        {act.desc}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
