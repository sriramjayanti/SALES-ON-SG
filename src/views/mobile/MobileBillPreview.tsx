import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit3,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Wallet
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Shop, Product, Order } from '../../types';

interface MobileBillPreviewProps {
  shop: Shop;
  cart: { [productId: string]: number };
  onBack: () => void;
  onOrderSaved: (order: Order) => void;
}

export const MobileBillPreview: React.FC<MobileBillPreviewProps> = ({
  shop,
  cart,
  onBack,
  onOrderSaved
}) => {
  const db = StorageService.getDb();
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Payment Tracking State
  const [amountPaidInput, setAmountPaidInput] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit' | 'cheque'>('cash');

  // Next Visit Scheduling State (defaults to shop preferred visit if set, or blank)
  const [nextVisitDate, setNextVisitDate] = useState<string>(shop.preferredVisitDate || '');
  const [nextVisitTime, setNextVisitTime] = useState<string>(shop.preferredVisitTime || '');

  const nowFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Resolve items
  const items = Object.entries(cart).map(([productId, qty]) => {
    const product = db.products.find((p) => p.id === productId)!;
    const lineTotal = product.sellPrice * qty;
    return {
      product,
      qty,
      price: product.sellPrice,
      amount: lineTotal
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = (taxableAmount * db.settings.defaultTaxRate) / 100;
  const grandTotal = taxableAmount + gstAmount;

  const parsedPaid = parseFloat(amountPaidInput) || 0;
  const amountPaid = Math.min(grandTotal, Math.max(0, parsedPaid));
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const setPresetPaid = (val: number) => {
    setAmountPaidInput(val.toString());
  };

  const overstockItem = items.find((i) => i.product.stock !== undefined && i.qty > i.product.stock);

  const handleSaveOrder = () => {
    if (overstockItem) {
      alert(`⚠️ Stock Alert: ${overstockItem.product.name} requested quantity (${overstockItem.qty}) exceeds available stock today (${overstockItem.product.stock}). Please adjust the order quantity before saving.`);
      return;
    }

    const newOrder = StorageService.finalizeOrder({
      shopId: shop.id,
      routeId: shop.routeId,
      items: items.map((i) => ({ product: i.product, qty: i.qty })),
      notes,
      amountPaid,
      paymentMethod,
      nextVisitDate: nextVisitDate || undefined,
      nextVisitTime: nextVisitTime || undefined
    });

    onOrderSaved(newOrder);
  };

  return (
    <div className="mobile-app-shell">
      {/* Header */}
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ padding: '6px', color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
            Bill & Payment Collection
          </h3>
        </div>

        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '13px'
          }}
        >
          <Edit3 size={14} /> Edit Cart
        </button>
      </header>

      {/* Body Content */}
      <div className="mobile-body-scroll" style={{ paddingBottom: '40px' }}>
        {/* Shop Info Card */}
        <div
          style={{
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {shop.imageUrl ? (
              <img
                src={shop.imageUrl}
                alt={shop.name}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  border: '1px solid var(--border)'
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
                  fontWeight: 700
                }}
              >
                <FileText size={22} />
              </div>
            )}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {shop.name}
              </h4>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {shop.shopCode} • {shop.ownerName} • {nowFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div
          style={{
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: '16px'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#FAFDFB', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Item</th>
                <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Qty</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Price</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isOverstock = item.product.stock !== undefined && item.qty > item.product.stock;
                const isLow = item.product.stock !== undefined && item.product.stock <= 15;

                return (
                  <tr key={item.product.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ color: isOverstock ? '#DC2626' : isLow ? '#B45309' : 'var(--text-secondary)', fontWeight: isOverstock || isLow ? 600 : 400 }}>
                          Available Today: {item.product.stock ?? 0} {item.product.unit}
                        </span>
                        {isOverstock && (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>
                            ⚠️ Exceeds Stock!
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: isOverstock ? '#DC2626' : 'inherit' }}>
                      {item.qty}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      ₹{item.price}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{item.amount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Financial Calculation Breakdown */}
          <div style={{ padding: '14px 16px', background: '#FAFDFB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>

            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Discount ({discountPercent}%)</span>
                <span>₹{discountAmount}</span>
              </div>
            )}

            {db.settings.defaultTaxRate > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>GST ({db.settings.defaultTaxRate}%)</span>
                <span>₹{gstAmount}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid var(--border)',
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--primary)'
              }}
            >
              <span>Total Bill</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* PAYMENT TRACKING SECTION */}
        <div
          style={{
            background: '#FFF',
            border: '2px solid var(--primary-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Wallet size={18} color="var(--primary)" />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Payment Collection at Order Taking
            </h4>
          </div>

          <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            Amount Paid Right Now (₹) *
          </label>
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
              ₹
            </span>
            <input
              type="number"
              min={0}
              max={grandTotal}
              value={amountPaidInput}
              onChange={(e) => setAmountPaidInput(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                paddingLeft: '32px',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                borderColor: 'var(--primary)'
              }}
            />
          </div>

          {/* Quick Amount Preset Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setPresetPaid(grandTotal)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #10B981',
                background: amountPaid === grandTotal ? '#10B981' : '#ECFDF5',
                color: amountPaid === grandTotal ? '#FFF' : '#047857',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Full Paid (₹{grandTotal.toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => setPresetPaid(Math.round(grandTotal / 2))}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #F59E0B',
                background: amountPaid === Math.round(grandTotal / 2) ? '#F59E0B' : '#FFFBEB',
                color: amountPaid === Math.round(grandTotal / 2) ? '#FFF' : '#B45309',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Half (₹{Math.round(grandTotal / 2).toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => setPresetPaid(0)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: amountPaid === 0 ? 'var(--text-secondary)' : '#F3F4F6',
                color: amountPaid === 0 ? '#FFF' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Unpaid / Credit (₹0)
            </button>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Payment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {(['cash', 'upi', 'credit', 'cheque'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    border: paymentMethod === m ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: paymentMethod === m ? 'var(--primary-light)' : '#FFF',
                    color: paymentMethod === m ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: paymentMethod === m ? 700 : 500,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Real-Time Receipt Summary */}
          <div
            style={{
              background: '#FAFDFB',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Bill Amount:</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{grandTotal.toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Paid Now:</span>
              <strong style={{ color: '#047857' }}>₹{amountPaid.toLocaleString()}</strong>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px solid var(--border)',
                fontSize: '14px'
              }}
            >
              <span style={{ fontWeight: 700, color: balanceDue > 0 ? '#DC2626' : '#047857' }}>
                Has to be Paid (Balance Due):
              </span>
              <strong style={{ fontSize: '15px', color: balanceDue > 0 ? '#DC2626' : '#047857' }}>
                ₹{balanceDue.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* NEXT VISIT SCHEDULING SECTION */}
        <div
          style={{
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Calendar size={18} color="var(--primary)" />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Next Visit Scheduling
            </h4>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Set when the sales agent should visit {shop.name} next for replenishment and payment collection.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Next Visit Date
              </label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Next Visit Time
              </label>
              <input
                type="time"
                value={nextVisitTime}
                onChange={(e) => setNextVisitTime(e.target.value)}
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Order Notes / Delivery Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Urgent morning delivery, collect balance by cheque"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Overstock Warning Banner */}
        {overstockItem && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              color: '#991B1B',
              fontSize: '13px',
              marginTop: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <strong>Stock Warning:</strong> {overstockItem.product.name} quantity ({overstockItem.qty}) exceeds available stock today ({overstockItem.product.stock}). Please reduce quantity to proceed.
            </div>
          </div>
        )}

        {/* Submit Save Order CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <button
            className="btn-primary"
            disabled={Boolean(overstockItem)}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              justifyContent: 'center',
              opacity: overstockItem ? 0.5 : 1,
              cursor: overstockItem ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSaveOrder}
          >
            Confirm & Save Order (₹{grandTotal.toLocaleString()})
          </button>
        </div>
      </div>
    </div>
  );
};
