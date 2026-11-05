import React from 'react';
import { FileText, Printer, Send, X, CheckCircle2, Calendar, Wallet } from 'lucide-react';
import { Order, BusinessSettings } from '../types';
import { StorageService } from '../services/storage';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const db = StorageService.getDb();
  const settings: BusinessSettings = db.settings;

  const phoneClean = order.shopPhoneSnapshot.replace(/[^0-9]/g, '');
  const amountPaid = order.amountPaid || 0;
  const balanceDue = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - amountPaid);
  const paymentMethodStr = (order.paymentMethod || 'cash').toUpperCase();
  const nextVisitStr = order.nextVisitDate
    ? `${order.nextVisitDate}${order.nextVisitTime ? ' at ' + order.nextVisitTime : ''}`
    : 'As scheduled';

  // Digital receipt public link
  const receiptUrl = `${window.location.origin}/?receipt=${order.orderNo}`;

  // Professional Tax Invoice & Receipt WhatsApp text
  const messageText = `*VARSHITHA SALES - TAX INVOICE & RECEIPT*\n\nHello *${order.shopNameSnapshot}*,\nInvoice: *${order.invoiceNo}* (Order: *#${order.orderNo}*)\n\n*Total Bill:* ₹${order.grandTotal.toLocaleString()}\n*Amount Paid:* ₹${amountPaid.toLocaleString()} (${paymentMethodStr})\n*Has to be Paid (Balance Due):* ₹${balanceDue.toLocaleString()}\n\nItems: ${order.items.length} products\nDate: ${order.dateString}\n*Next Scheduled Visit:* ${nextVisitStr}\n\n*View Live Digital Receipt & Bill:*\n${receiptUrl}\n\nThank you for choosing Varshitha Sales!`;

  const whatsappUrl = `https://wa.me/${phoneClean.startsWith('91') ? phoneClean : '91' + phoneClean}?text=${encodeURIComponent(messageText)}`;


  const handleWhatsApp = () => {
    StorageService.markWhatsAppShared(order.id);
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--primary)" />
            <h3 className="modal-title">Tax Invoice / Order Receipt</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#FFF', padding: '24px' }}>
          {/* Business Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                {settings.businessName}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '300px', marginTop: '2px' }}>
                {settings.address}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                GSTIN: <strong>{settings.gstin}</strong> • Phone: {settings.phone}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                {order.invoiceNo}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Order: #{order.orderNo}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Date: {order.dateString}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', alignItems: 'flex-end' }}>
                <span className={`status-chip ${order.deliveryStatus === 'delivered' ? 'delivered' : 'pending_delivery'}`}>
                  {order.deliveryStatus === 'delivered' ? '✓ Delivered' : '⏱ Pending Delivery'}
                </span>
                <span className={`status-chip ${balanceDue === 0 ? 'paid' : 'unpaid'}`}>
                  {balanceDue === 0 ? '✓ Paid Full' : `Due: ₹${balanceDue.toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Customer / Billed To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Billed To (Retailer):
              </span>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                {order.shopNameSnapshot}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Shop ID: {order.shopCodeSnapshot} • Phone: {order.shopPhoneSnapshot}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {order.shopAddressSnapshot}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Field Logistics:
              </span>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                Rep: {order.employeeNameSnapshot}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Route: {order.routeNameSnapshot}
              </div>
              {order.nextVisitDate && (
                <div style={{ fontSize: '11.5px', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                  Next Visit: {order.nextVisitDate} {order.nextVisitTime ? `@ ${order.nextVisitTime}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>#</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Item Description</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>Qty</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Rate</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: 500 }}>
                    {item.productName}
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{item.qty} {item.unit}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>₹{item.unitPrice}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹{item.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Totals Breakdown: Total, Paid, Has to be Paid */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                <span>₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GST (Tax):</span>
                <span>₹{order.taxTotal}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border)',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text-primary)'
                }}
              >
                <span>Total Bill Amount:</span>
                <span>₹{order.grandTotal.toLocaleString()}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#047857' }}>
                <span style={{ fontWeight: 600 }}>Amount Paid ({paymentMethodStr}):</span>
                <span style={{ fontWeight: 700 }}>₹{amountPaid.toLocaleString()}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '2px solid var(--primary)',
                  fontWeight: 800,
                  fontSize: '15px',
                  color: balanceDue > 0 ? '#DC2626' : '#047857'
                }}
              >
                <span>Has to be Paid (Due):</span>
                <span>₹{balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {order.cancelReason && (
            <div style={{ marginTop: '14px', padding: '10px', background: 'var(--danger-light)', borderRadius: '6px', color: 'var(--danger)', fontSize: '12px' }}>
              <strong>Cancellation Reason:</strong> {order.cancelReason} (by {order.cancelledBy})
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> Print / PDF
            </button>

            {order.deliveryStatus === 'pending' && (
              <button
                className="btn-primary"
                onClick={() => {
                  StorageService.confirmDelivery(order.id, {
                    notes: 'Delivered at store'
                  });
                }}
              >
                Mark Delivered
              </button>
            )}

            {balanceDue > 0 && (
              <button
                style={{
                  background: '#059669',
                  color: '#FFF',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  StorageService.recordPayment(order.id, 'paid', balanceDue, 'cash');
                }}
              >
                Collect Due ₹{balanceDue.toLocaleString()}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-whatsapp" onClick={handleWhatsApp}>
              <Send size={15} /> Share via WhatsApp
            </button>
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
