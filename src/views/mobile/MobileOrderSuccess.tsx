import React from 'react';
import {
  CheckCircle2,
  FileText,
  Share2,
  ArrowRight,
  Send,
  Download,
  ArrowLeft,
  Calendar,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Order } from '../../types';

interface MobileOrderSuccessProps {
  order: Order;
  onNextShop: () => void;
  onViewInvoice: (order: Order) => void;
}

export const MobileOrderSuccess: React.FC<MobileOrderSuccessProps> = ({
  order,
  onNextShop,
  onViewInvoice
}) => {
  const db = StorageService.getDb();
  const phoneClean = order.shopPhoneSnapshot.replace(/[^0-9]/g, '');

  const amountPaid = order.amountPaid || 0;
  const balanceDue = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - amountPaid);
  const paymentMethodStr = (order.paymentMethod || 'cash').toUpperCase();
  const nextVisitStr = order.nextVisitDate
    ? `${order.nextVisitDate}${order.nextVisitTime ? ' at ' + order.nextVisitTime : ''}`
    : 'As scheduled';

  // Digital receipt public link
  const receiptUrl = `${window.location.origin}/?receipt=${order.orderNo}`;

  // Format high-clarity receipt message for WhatsApp
  const messageText = `*VARSHITHA SALES - ORDER RECEIPT*\n\nHello *${order.shopNameSnapshot}*,\nYour Order *#${order.orderNo}* (Invoice: *${order.invoiceNo}*) has been confirmed.\n\n*Total Bill:* ₹${order.grandTotal.toLocaleString()}\n*Amount Paid:* ₹${amountPaid.toLocaleString()} (${paymentMethodStr})\n*Has to be Paid (Balance Due):* ₹${balanceDue.toLocaleString()}\n\nItems Count: ${order.items.length}\nDate: ${order.dateString}\n*Next Visit:* ${nextVisitStr}\n\n*View Live Digital Receipt & Bill:*\n${receiptUrl}\n\nThank you for doing business with us!`;

  const whatsappUrl = `https://wa.me/${phoneClean.startsWith('91') ? phoneClean : '91' + phoneClean}?text=${encodeURIComponent(messageText)}`;

  const handleWhatsAppClick = () => {
    StorageService.markWhatsAppShared(order.id);
    window.open(whatsappUrl, '_blank');
  };


  return (
    <div className="mobile-app-shell" style={{ background: '#FFF' }}>
      <header className="mobile-app-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <button
          onClick={onNextShop}
          style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          title="Back to Route"
        >
          <ArrowLeft size={20} /> Back to Route
        </button>
      </header>

      <div
        className="mobile-body-scroll"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 20px'
        }}
      >
        {/* Animated Checkmark Circle */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--success-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            marginBottom: '16px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)'
          }}
        >
          <CheckCircle2 size={48} />
        </div>

        {/* Headline */}
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}
        >
          Order Created & Confirmed!
        </h2>

        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginBottom: '16px' }}>
          #{order.orderNo} • {order.shopNameSnapshot}
        </div>

        {/* COMPREHENSIVE PAYMENT & RECEIPT CARD */}
        <div
          style={{
            width: '100%',
            background: '#FAFDFB',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <Wallet size={17} color="var(--primary)" />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Order Payment & Visit Summary
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Bill Amount:</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>₹{order.grandTotal.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Paid Now:</span>
              <strong style={{ color: '#047857', fontSize: '14px' }}>₹{amountPaid.toLocaleString()} ({paymentMethodStr})</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid var(--border)',
                alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: 700, color: balanceDue > 0 ? '#DC2626' : '#047857' }}>
                Has to be Paid (Due):
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '15px',
                  color: balanceDue > 0 ? '#DC2626' : '#047857',
                  background: balanceDue > 0 ? '#FEE2E2' : '#DCFCE7',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                ₹{balanceDue.toLocaleString()}
              </span>
            </div>

            {order.nextVisitDate && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingTop: '8px',
                  marginTop: '4px',
                  borderTop: '1px dashed var(--border)',
                  fontSize: '12px',
                  color: 'var(--primary)',
                  fontWeight: 600
                }}
              >
                <Calendar size={14} />
                <span>Next Scheduled Visit: {order.nextVisitDate} {order.nextVisitTime ? `@ ${order.nextVisitTime}` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Ready Card */}
        <div
          onClick={() => onViewInvoice(order)}
          style={{
            width: '100%',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: '#FFF',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                Official Tax Invoice
              </div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                View Digital Invoice ({order.invoiceNo})
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="var(--text-secondary)" />
        </div>

        {/* Action CTAs */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Send on WhatsApp with proper receipt */}
          <button
            onClick={handleWhatsAppClick}
            className="btn-whatsapp"
            style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }}
          >
            <Send size={18} /> Send Receipt on WhatsApp
          </button>

          {/* Continue to Next Shop */}
          <button
            onClick={onNextShop}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '14px',
              justifyContent: 'center'
            }}
          >
            <span>Continue to Next Shop</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
