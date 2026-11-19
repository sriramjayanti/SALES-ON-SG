import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  XCircle,
  Truck,
  CreditCard,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Phone,
  Store,
  Calendar,
  Trash2,
  RotateCcw,
  Radio
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Order, Employee } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

interface AdminOrdersProps {
  currentUser: Employee;
  onViewInvoice: (order: Order) => void;
  onBack?: () => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ currentUser, onViewInvoice, onBack }) => {
  const db = StorageService.getDb();
  const [, setTick] = useState(0);

  // Live real-time subscription for automatic bill arrival from staff logins
  useEffect(() => {
    return StorageService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'pending_delivery' | 'delivered' | 'cancelled_deleted'>('all');

  // In-App Delete & Restore Order State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToRestore, setOrderToRestore] = useState<Order | null>(null);

  // Cancel Modal
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Customer Request / Order Mistake');

  const handleCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) return alert('Cancellation reason is mandatory');
    StorageService.cancelOrder(cancelModalOrder.id, cancelReason);
    setCancelModalOrder(null);
  };

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

  // Metrics for Filter Tabs
  const totalOrders = db.orders;
  const isDeletedOrCancelled = (o: Order) => o.status === 'cancelled' || o.isDeleted || o.active === false;
  const unpaidOrders = totalOrders.filter((o) => o.status === 'completed' && o.paymentStatus !== 'paid' && !isDeletedOrCancelled(o));
  const totalUnpaidDue = unpaidOrders.reduce((sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)), 0);

  const pendingDeliveryOrders = totalOrders.filter((o) => o.status === 'completed' && o.deliveryStatus === 'pending' && !isDeletedOrCancelled(o));
  const totalPendingDeliveryAmt = pendingDeliveryOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  const deliveredOrders = totalOrders.filter((o) => o.status === 'completed' && o.deliveryStatus === 'delivered' && !isDeletedOrCancelled(o));
  const cancelledOrDeletedOrders = totalOrders.filter((o) => isDeletedOrCancelled(o));

  // Pending Payments on that Day / Route
  const pendingByRouteAndDay = totalOrders.filter((o) => {
    if (isDeletedOrCancelled(o)) return false;
    if (o.status !== 'completed' || o.paymentStatus === 'paid') return false;
    const matchesRoute = routeFilter === 'all' || o.routeId === routeFilter;
    const matchesDate = dateFilter === 'all' || o.dateString === dateFilter;
    return matchesRoute && matchesDate;
  });

  const totalPendingOnSelection = pendingByRouteAndDay.reduce(
    (sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)),
    0
  );

  // Available unique dates for day filter
  const uniqueDates = Array.from(new Set(totalOrders.map((o) => o.dateString))).sort().reverse();

  // Filtering
  const filteredOrders = totalOrders.filter((o) => {
    const matchesSearch =
      o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      o.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      o.shopNameSnapshot.toLowerCase().includes(search.toLowerCase()) ||
      o.shopPhoneSnapshot.includes(search) ||
      o.employeeNameSnapshot.toLowerCase().includes(search.toLowerCase());

    const matchesRoute = routeFilter === 'all' || o.routeId === routeFilter;
    const matchesDate = dateFilter === 'all' || o.dateString === dateFilter;

    if (!matchesSearch || !matchesRoute || !matchesDate) return false;

    const isDeleted = isDeletedOrCancelled(o);
    if (activeTab === 'unpaid') return o.status === 'completed' && o.paymentStatus !== 'paid' && !isDeleted;
    if (activeTab === 'pending_delivery') return o.status === 'completed' && o.deliveryStatus === 'pending' && !isDeleted;
    if (activeTab === 'delivered') return o.status === 'completed' && o.deliveryStatus === 'delivered' && !isDeleted;
    if (activeTab === 'cancelled_deleted') return isDeleted;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%' }}>
      {/* Top Header & Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
              title="Back to Dashboard"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Orders & Billing Hub
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Manage orders, deliveries, and pending payments
            </div>
          </div>
        </div>

        {/* Search, Route & Day Filters with Live Sync Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '11.5px', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            Live Bills Stream (Auto-updating)
          </div>

          <div style={{ position: 'relative', width: '200px' }}>
            <Search
              size={15}
              color="var(--text-secondary)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search orders, shops, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          {/* Route Filter */}
          <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
            <option value="all">All Routes</option>
            {db.routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Day / Date Filter */}
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Days / Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                Date: {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PENDING PAYMENTS ON THAT DAY / ROUTE BANNER */}
      <div
        style={{
          background: totalPendingOnSelection > 0 ? '#FEF2F2' : '#F0FDF4',
          border: totalPendingOnSelection > 0 ? '1px solid #FECACA' : '1px solid #BBF7D0',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: totalPendingOnSelection > 0 ? '#DC2626' : '#16A34A',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {totalPendingOnSelection > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: totalPendingOnSelection > 0 ? '#991B1B' : '#15803D' }}>
              Pending Payments on {routeFilter === 'all' ? 'All Routes' : (db.routes.find(r => r.id === routeFilter)?.name || 'Selected Route')} {dateFilter === 'all' ? '(All Dates)' : `for ${dateFilter}`}
            </div>
            <div style={{ fontSize: '11.5px', color: totalPendingOnSelection > 0 ? '#B91C1C' : '#166534' }}>
              {totalPendingOnSelection > 0
                ? `${pendingByRouteAndDay.length} bill(s) pending payment on this route/day`
                : 'All bills on this day & route are fully paid / cleared'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: totalPendingOnSelection > 0 ? '#DC2626' : '#15803D' }}>
              ₹{totalPendingOnSelection.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Outstanding Balance Due
            </div>
          </div>

          {totalPendingOnSelection > 0 && activeTab !== 'unpaid' && (
            <button
              onClick={() => setActiveTab('unpaid')}
              style={{
                padding: '6px 12px',
                fontSize: '11.5px',
                background: '#DC2626',
                color: '#FFF',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Filter Unpaid Bills
            </button>
          )}
        </div>
      </div>

      {/* QUICK FILTER PILLS / SUMMARY TABS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%'
        }}
      >
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            background: activeTab === 'all' ? 'var(--primary)' : '#FFF',
            color: activeTab === 'all' ? '#FFF' : 'var(--text-primary)',
            border: activeTab === 'all' ? 'none' : '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          All Orders ({totalOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('unpaid')}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            background: activeTab === 'unpaid' ? '#DC2626' : '#FEF2F2',
            color: activeTab === 'unpaid' ? '#FFF' : '#DC2626',
            border: activeTab === 'unpaid' ? 'none' : '1px solid #FCA5A5',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertTriangle size={14} />
          Pending Payments ({unpaidOrders.length} • ₹{totalUnpaidDue.toLocaleString()})
        </button>

        <button
          onClick={() => setActiveTab('pending_delivery')}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            background: activeTab === 'pending_delivery' ? '#D97706' : '#FFFBEB',
            color: activeTab === 'pending_delivery' ? '#FFF' : '#B45309',
            border: activeTab === 'pending_delivery' ? 'none' : '1px solid #FCD34D',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={14} />
          Pending Delivery ({pendingDeliveryOrders.length} • ₹{totalPendingDeliveryAmt.toLocaleString()})
        </button>

        <button
          onClick={() => setActiveTab('delivered')}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            background: activeTab === 'delivered' ? '#059669' : '#ECFDF5',
            color: activeTab === 'delivered' ? '#FFF' : '#047857',
            border: activeTab === 'delivered' ? 'none' : '1px solid #A7F3D0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <CheckCircle2 size={14} />
          Delivered ({deliveredOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled_deleted')}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '12.5px',
            fontWeight: 600,
            background: activeTab === 'cancelled_deleted' ? '#64748B' : '#F1F5F9',
            color: activeTab === 'cancelled_deleted' ? '#FFF' : '#475569',
            border: activeTab === 'cancelled_deleted' ? 'none' : '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <Trash2 size={14} />
          Deleted / Cancelled ({cancelledOrDeletedOrders.length})
        </button>
      </div>

      {/* OUTSTANDING DUE BANNER (When viewing unpaid or dues exist) */}
      {activeTab === 'unpaid' && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#DC2626" />
            <div>
              <strong style={{ color: '#991B1B', fontSize: '13.5px' }}>
                Pending Customer Balances: {unpaidOrders.length} unpaid invoices
              </strong>
              <div style={{ fontSize: '12px', color: '#B91C1C' }}>
                Total unpaid dues to collect: <strong>₹{totalUnpaidDue.toLocaleString()}</strong>
              </div>
            </div>
          </div>
          <span style={{ fontSize: '11.5px', color: '#7F1D1D', fontWeight: 600 }}>
            Click 'Collect' on any invoice to record cash payment
          </span>
        </div>
      )}

      {/* ORDERS LIST */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            background: '#FFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}
        >
          No orders found matching the selected filter criteria.
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order / Invoice</th>
                <th>Retailer Shop</th>
                <th>Field Rep</th>
                <th>Bill Amount</th>
                <th>Delivery Status</th>
                <th>Payment Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => {
                const isOrderDeleted = ord.isDeleted || ord.status === 'cancelled' || ord.active === false;
                const isDelivered = ord.deliveryStatus === 'delivered';
                const isPaid = ord.paymentStatus === 'paid';
                const due = ord.grandTotal - (ord.amountPaid || 0);

                return (
                  <tr key={ord.id} style={{ opacity: isOrderDeleted ? 0.75 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 700, color: isOrderDeleted ? 'var(--text-secondary)' : 'var(--primary)' }}>
                        {ord.orderNo}
                        {isOrderDeleted && (
                          <span style={{ marginLeft: '6px', fontSize: '10.5px', background: 'var(--danger-light)', color: 'var(--danger)', padding: '2px 5px', borderRadius: '3px', fontWeight: 600 }}>
                            Deleted
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ord.invoiceNo}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ord.shopNameSnapshot}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        📞 {ord.shopPhoneSnapshot} • {ord.shopAddressSnapshot}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{ord.employeeNameSnapshot}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        ₹{ord.grandTotal.toLocaleString()}
                      </div>
                      {!isPaid && due > 0 && !isOrderDeleted && (
                        <div style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 700 }}>
                          Due: ₹{due.toLocaleString()}
                        </div>
                      )}
                    </td>

                    {/* Delivery Status & 1-Click Action */}
                    <td>
                      {isOrderDeleted ? (
                        <span className="status-chip inactive" style={{ fontSize: '11px' }}>
                          Cancelled
                        </span>
                      ) : isDelivered ? (
                        <span className="status-chip delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <CheckCircle2 size={12} /> Delivered
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
                          title="Confirm delivery to store"
                        >
                          <Truck size={12} /> Confirm Delivery
                        </button>
                      )}
                    </td>

                    {/* Payment Status & 1-Click Action */}
                    <td>
                      {isOrderDeleted ? (
                        <span className="status-chip inactive" style={{ fontSize: '11px' }}>
                          Void
                        </span>
                      ) : isPaid ? (
                        <span className="status-chip paid" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <CreditCard size={12} /> Paid Full
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
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Mark payment collected"
                        >
                          <CreditCard size={12} /> Collect ₹{due}
                        </button>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {ord.dateString}
                    </td>

                    {/* View Invoice, Delete & Restore Actions - Generous Safety Spacing */}
                    <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <button
                          onClick={() => onViewInvoice(ord)}
                          style={{
                            minWidth: '95px',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            background: '#F0FDF4',
                            color: 'var(--primary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            border: '1.5px solid var(--primary)',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                          title="View Full Bill & Receipt"
                        >
                          <Eye size={13} /> View Bill
                        </button>

                        {isOrderDeleted ? (
                          <button
                            onClick={() => setOrderToRestore(ord)}
                            style={{
                              minWidth: '95px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#E6F4EA',
                              color: '#137333',
                              border: '1px solid #A7F3D0',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              cursor: 'pointer'
                            }}
                            title="Restore Order"
                          >
                            <RotateCcw size={13} /> Restore
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setCancelModalOrder(ord)}
                              style={{
                                minWidth: '95px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: '#FFFBEB',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title="Cancel / Void Order"
                            >
                              <XCircle size={12} /> Cancel Order
                            </button>

                            <button
                              onClick={() => setOrderToDelete(ord)}
                              style={{
                                minWidth: '95px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer'
                              }}
                              title="Delete Order (Soft Delete)"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOrder && (
        <Modal
          isOpen={true}
          onClose={() => setCancelModalOrder(null)}
          title={`Cancel Order #${cancelModalOrder.orderNo}`}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setCancelModalOrder(null)}>
                Dismiss
              </button>
              <button
                className="btn-primary"
                style={{ background: 'var(--danger)' }}
                onClick={handleCancelOrder}
              >
                Confirm Cancellation
              </button>
            </>
          }
        >
          <form onSubmit={handleCancelOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you sure you want to cancel order <strong>{cancelModalOrder.orderNo}</strong> for{' '}
              <strong>{cancelModalOrder.shopNameSnapshot}</strong> (Amount: ₹{cancelModalOrder.grandTotal})?
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Reason for Cancellation *</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', marginTop: '6px' }}
              >
                <option value="Customer Request / Order Mistake">Customer Request / Order Mistake</option>
                <option value="Stock Shortage / Out of Inventory">Stock Shortage / Out of Inventory</option>
                <option value="Store Closed / Unreachable">Store Closed / Unreachable</option>
                <option value="Price Discrepancy / Pricing Dispute">Price Discrepancy / Pricing Dispute</option>
                <option value="Duplicate Order Placed">Duplicate Order Placed</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {/* In-App Delete & Restore Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(orderToDelete)}
        title="Delete Order"
        itemName={orderToDelete ? `#${orderToDelete.orderNo}` : undefined}
        message="This order will be soft-deleted. It can be viewed or restored from the 'Cancelled / Deleted' tab."
        confirmLabel="Soft Delete Order"
        onConfirm={() => {
          if (orderToDelete) {
            StorageService.deleteOrder(orderToDelete.id, 'Soft deleted by Admin');
            setOrderToDelete(null);
          }
        }}
        onClose={() => setOrderToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(orderToRestore)}
        title="Restore Order"
        itemName={orderToRestore ? `#${orderToRestore.orderNo}` : undefined}
        message="This will reactivate this order and restore it to the completed orders list."
        confirmLabel="Restore Order"
        onConfirm={() => {
          if (orderToRestore) {
            StorageService.restoreOrder(orderToRestore.id);
            setOrderToRestore(null);
          }
        }}
        onClose={() => setOrderToRestore(null)}
      />
    </div>
  );
};
