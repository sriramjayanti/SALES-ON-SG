import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Share2,
  Send,
  ArrowLeft,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Order } from '../../types';

interface MobileOrdersListProps {
  currentUser: Employee;
  onViewInvoice: (order: Order) => void;
  onBack?: () => void;
}

export const MobileOrdersList: React.FC<MobileOrdersListProps> = ({
  currentUser,
  onViewInvoice,
  onBack
}) => {
  const db = StorageService.getDb();
  const [filterTab, setFilterTab] = useState<'all' | 'pending_delivery' | 'unpaid'>('all');

  const allUserOrders = db.orders.filter(
    (o) =>
      !o.isDeleted &&
      o.active !== false &&
      (currentUser.role === 'super_admin' ||
        currentUser.role === 'admin' ||
        o.employeeId === currentUser.id)
  );

  const pendingDeliveryCount = allUserOrders.filter((o) => o.deliveryStatus === 'pending').length;
  const unpaidCount = allUserOrders.filter(
    (o) => o.status === 'completed' && o.paymentStatus !== 'paid'
  ).length;

  const filteredOrders = allUserOrders.filter((o) => {
    if (filterTab === 'pending_delivery') return o.deliveryStatus === 'pending';
    if (filterTab === 'unpaid') return o.status === 'completed' && o.paymentStatus !== 'paid';
    return true;
  });

  const handleConfirmDelivery = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const order = db.orders.find((o) => o.id === orderId);
    const dueAmt = order ? order.grandTotal - (order.amountPaid || 0) : 0;
    const input = window.prompt(
      `Delivery confirmation for ${order?.orderNo || 'order'}:\nEnter payment collected upon delivery (Full: ₹${dueAmt}, or enter partial amount, or 0 for Credit/Unpaid):`,
      dueAmt.toString()
    );
    if (input === null) return;
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) {
      StorageService.confirmDelivery(orderId, {
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        notes: 'Delivered at store (Credit / Pending Payment)'
      });
      alert('Delivery recorded as Unpaid/Credit. Pending balance tracked.');
    } else {
      const payAmt = Math.min(amt, dueAmt);
      const isFull = payAmt >= dueAmt;
      StorageService.confirmDelivery(orderId, {
        paymentStatus: isFull ? 'paid' : 'partial',
        paymentMethod: 'cash',
        notes: `Delivered at store. Collected ₹${payAmt}`
      });
      if (!isFull) {
        StorageService.recordPayment(orderId, 'partial', payAmt, 'cash');
        alert(`Delivered! Partial payment of ₹${payAmt} recorded. Remaining pending balance: ₹${dueAmt - payAmt}`);
      } else {
        alert(`Delivered! Full payment of ₹${dueAmt} collected.`);
      }
    }
  };

  const handleCollectPayment = (e: React.MouseEvent, orderId: string, amount: number) => {
    e.stopPropagation();
    const input = window.prompt(
      `Enter collection amount (Pending Balance Due: ₹${amount}):`,
      amount.toString()
    );
    if (input === null) return;
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const payAmt = Math.min(amt, amount);
    const isFull = payAmt >= amount;
    StorageService.recordPayment(orderId, isFull ? 'paid' : 'partial', payAmt, 'cash');
    const remaining = amount - payAmt;
    if (remaining > 0) {
      alert(`₹${payAmt} collected.\nRemaining Balance Pending: ₹${remaining} (will remain pending until fully paid).`);
    } else {
      alert(`Full payment of ₹${payAmt} collected! Bill is now fully settled.`);
    }
  };

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
            Orders & Bills
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {allUserOrders.length} Total
        </span>
      </header>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-main)',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          gap: '6px',
          overflowX: 'auto'
        }}
      >
        <button
          onClick={() => setFilterTab('all')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            background: filterTab === 'all' ? 'var(--primary)' : '#FFF',
            color: filterTab === 'all' ? '#FFF' : 'var(--text-secondary)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          All ({allUserOrders.length})
        </button>

        <button
          onClick={() => setFilterTab('pending_delivery')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            background: filterTab === 'pending_delivery' ? '#B45309' : '#FFF',
            color: filterTab === 'pending_delivery' ? '#FFF' : '#B45309',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Pending Delivery ({pendingDeliveryCount})
        </button>

        <button
          onClick={() => setFilterTab('unpaid')}
          style={{
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontWeight: 600,
            background: filterTab === 'unpaid' ? '#DC2626' : '#FFF',
            color: filterTab === 'unpaid' ? '#FFF' : '#DC2626',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Unpaid Dues ({unpaidCount})
        </button>
      </div>

      <div className="mobile-body-scroll">
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            No orders matching this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredOrders.map((ord) => {
              const isDelivered = ord.deliveryStatus === 'delivered';
              const isPaid = ord.paymentStatus === 'paid';
              const pendingAmt = ord.grandTotal - (ord.amountPaid || 0);

              return (
                <div
                  key={ord.id}
                  onClick={() => onViewInvoice(ord)}
                  style={{
                    background: '#FFF',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}
                      >
                        <FileText size={20} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                            {ord.orderNo}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {ord.invoiceNo}
                          </span>
                        </div>

                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                          {ord.shopNameSnapshot}
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {ord.dateString} • {ord.items.length} items
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{ord.grandTotal.toLocaleString()}
                      </div>
                      {ord.whatsappShared && (
                        <span style={{ fontSize: '10.5px', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', marginTop: '2px' }}>
                          <CheckCircle2 size={11} /> Sent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delivery & Payment Status Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                    <span className={`status-chip ${isDelivered ? 'delivered' : 'pending_delivery'}`} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Truck size={12} />
                      {isDelivered ? 'Delivered' : 'Pending Delivery'}
                    </span>

                    <span className={`status-chip ${isPaid ? 'paid' : ord.paymentStatus === 'partial' ? 'partial' : 'unpaid'}`} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={12} />
                      {isPaid
                        ? 'Payment Paid'
                        : ord.paymentStatus === 'partial'
                        ? `Partial Paid (Paid: ₹${(ord.amountPaid || 0).toLocaleString()} • Due: ₹${pendingAmt.toLocaleString()})`
                        : `Unpaid (Due: ₹${pendingAmt.toLocaleString()})`}
                    </span>
                  </div>

                  {/* Quick Action Buttons */}
                  {(!isDelivered || !isPaid) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {!isDelivered && (
                        <button
                          onClick={(e) => handleConfirmDelivery(e, ord.id)}
                          className="btn-primary"
                          style={{ flex: 1, padding: '7px 10px', fontSize: '11.5px', justifyContent: 'center' }}
                        >
                          <Truck size={14} /> Confirm Delivery
                        </button>
                      )}

                      {!isPaid && (
                        <button
                          onClick={(e) => handleCollectPayment(e, ord.id, pendingAmt)}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            fontSize: '11.5px',
                            background: '#059669',
                            color: '#FFF',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <CreditCard size={14} /> Collect ₹{pendingAmt}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
