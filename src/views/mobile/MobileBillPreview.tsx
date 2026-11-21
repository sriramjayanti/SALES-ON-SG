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

  // Payment Tracking State with Dual Method (Cash + UPI Split) Support
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'split'>('cash');
  const [cashInput, setCashInput] = useState<string>('');
  const [upiInput, setUpiInput] = useState<string>('');

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

  const parsedCash = parseFloat(cashInput) || 0;
  const parsedUpi = parseFloat(upiInput) || 0;

  let cashAmount = 0;
  let upiAmount = 0;

  if (paymentMode === 'cash') {
    cashAmount = Math.max(0, parsedCash);
    upiAmount = 0;
  } else if (paymentMode === 'upi') {
    cashAmount = 0;
    upiAmount = Math.max(0, parsedUpi);
  } else {
    // split mode: both cash and upi allowed simultaneously
    cashAmount = Math.max(0, parsedCash);
    upiAmount = Math.max(0, parsedUpi);
  }

  const amountPaid = Math.min(grandTotal, Math.max(0, cashAmount + upiAmount));
  const balanceDue = Math.max(0, grandTotal - amountPaid);

  const setPresetFull = () => {
    if (paymentMode === 'cash') {
      setCashInput(grandTotal.toString());
      setUpiInput('');
    } else if (paymentMode === 'upi') {
      setUpiInput(grandTotal.toString());
      setCashInput('');
    } else {
      // Split 50-50 default
      const half = Math.round(grandTotal / 2);
      setCashInput(half.toString());
      setUpiInput((grandTotal - half).toString());
    }
  };

  const setPresetHalf = () => {
    const half = Math.round(grandTotal / 2);
    if (paymentMode === 'cash') {
      setCashInput(half.toString());
      setUpiInput('');
    } else if (paymentMode === 'upi') {
      setUpiInput(half.toString());
      setCashInput('');
    } else {
      const q = Math.round(half / 2);
      setCashInput(q.toString());
      setUpiInput((half - q).toString());
    }
  };

  const overstockItem = items.find((i) => i.product.stock !== undefined && i.qty > i.product.stock);

  const handleSaveOrder = () => {
    if (overstockItem) {
      alert(`⚠️ Stock Alert: ${overstockItem.product.name} requested quantity (${overstockItem.qty}) exceeds available stock today (${overstockItem.product.stock}). Please adjust the order quantity before saving.`);
      return;
    }

    // Compulsory payment check: at least some amount must be paid to confirm order!
    if (amountPaid <= 0) {
      alert(
        '⚠️ Compulsory Payment Required: Please enter the payment amount received from the shopkeeper (Cash, UPI, or Split Cash+UPI). An initial payment must be recorded before confirming the order (partial payment is accepted).'
      );
      return;
    }

    const finalPaymentMethod =
      paymentMode === 'split' || (cashAmount > 0 && upiAmount > 0)
        ? 'split'
        : upiAmount > 0
        ? 'upi'
        : 'cash';

    const newOrder = StorageService.finalizeOrder({
      shopId: shop.id,
      routeId: shop.routeId,
      items: items.map((i) => ({ product: i.product, qty: i.qty })),
      notes,
      amountPaid,
      cashAmount,
      upiAmount,
      paymentMethod: finalPaymentMethod,
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

        {/* PAYMENT TRACKING SECTION (WITH DUAL PAYMENT: CASH + UPI TOGETHER) */}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Compulsory Payment Collection *
              </h4>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: amountPaid > 0 ? '#047857' : '#DC2626', background: amountPaid > 0 ? '#ECFDF5' : '#FEF2F2', padding: '2px 8px', borderRadius: '4px' }}>
              {amountPaid > 0 ? (amountPaid >= grandTotal ? '✓ Full Paid' : '✓ Partial Paid') : '⚠️ Payment Required'}
            </span>
          </div>

          {/* Payment Method Selector: Cash / UPI / Split (Both simultaneously) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Select Payment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '6px',
                  border: paymentMode === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMode === 'cash' ? 'var(--primary-light)' : '#FFF',
                  color: paymentMode === 'cash' ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: paymentMode === 'cash' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                💵 Cash Only
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '6px',
                  border: paymentMode === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: paymentMode === 'upi' ? 'var(--primary-light)' : '#FFF',
                  color: paymentMode === 'upi' ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: paymentMode === 'upi' ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                📱 UPI / Online
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('split')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '6px',
                  border: paymentMode === 'split' ? '2px solid #059669' : '1px solid var(--border)',
                  background: paymentMode === 'split' ? '#ECFDF5' : '#FFF',
                  color: paymentMode === 'split' ? '#047857' : 'var(--text-primary)',
                  fontWeight: paymentMode === 'split' ? 700 : 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                ⚡ Cash + UPI Split
              </button>
            </div>
          </div>

          {/* DUAL PAYMENT / SPLIT INPUT FIELDS */}
          {paymentMode === 'split' ? (
            <div style={{ background: '#FAFDFB', border: '1.5px dashed #A7F3D0', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#047857', marginBottom: '8px' }}>
                Split Payment Entry (e.g. ₹3,000 Cash + ₹2,000 UPI):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    💵 Cash Portion (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      padding: '8px 10px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    📱 UPI Portion (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    value={upiInput}
                    onChange={(e) => setUpiInput(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      padding: '8px 10px'
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#047857', marginTop: '6px', fontWeight: 600 }}>
                Combined Paid: ₹{amountPaid.toLocaleString()} (Cash: ₹{cashAmount.toLocaleString()} + UPI: ₹{upiAmount.toLocaleString()})
              </div>
            </div>
          ) : paymentMode === 'cash' ? (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                💵 Cash Amount Received (₹) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  max={grandTotal}
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="Enter cash collected"
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
            </div>
          ) : (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                📱 UPI Amount Transferred (₹) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  max={grandTotal}
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  placeholder="Enter UPI amount paid"
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
            </div>
          )}

          {/* Quick Amount Preset Chips (No ₹0 credit button because initial payment is compulsory!) */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={setPresetFull}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #10B981',
                background: amountPaid === grandTotal && grandTotal > 0 ? '#10B981' : '#ECFDF5',
                color: amountPaid === grandTotal && grandTotal > 0 ? '#FFF' : '#047857',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Full Bill Paid (₹{grandTotal.toLocaleString()})
            </button>

            <button
              type="button"
              onClick={setPresetHalf}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #F59E0B',
                background: amountPaid === Math.round(grandTotal / 2) && grandTotal > 0 ? '#F59E0B' : '#FFFBEB',
                color: amountPaid === Math.round(grandTotal / 2) && grandTotal > 0 ? '#FFF' : '#B45309',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Half Paid (₹{Math.round(grandTotal / 2).toLocaleString()})
            </button>
          </div>

          {/* Compulsory Warning if 0 */}
          {amountPaid <= 0 && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#991B1B',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>⚠️ Compulsory Payment: An initial payment (Cash, UPI, or Split) is required to place this order.</span>
            </div>
          )}

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
              <strong style={{ color: '#047857' }}>
                ₹{amountPaid.toLocaleString()}
                {paymentMode === 'split' && ` (Cash: ₹${cashAmount} + UPI: ₹${upiAmount})`}
              </strong>
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

        {/* Submit Save Order CTA with Compulsory Payment Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <button
            className="btn-primary"
            disabled={Boolean(overstockItem)}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              justifyContent: 'center',
              opacity: overstockItem ? 0.5 : (amountPaid <= 0 ? 0.85 : 1),
              background: amountPaid <= 0 ? '#9CA3AF' : 'var(--primary)',
              cursor: overstockItem ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSaveOrder}
          >
            {amountPaid <= 0
              ? `⚠️ Enter Initial Payment to Confirm Bill (₹${grandTotal.toLocaleString()})`
              : `Confirm & Place Order (Paid: ₹${amountPaid.toLocaleString()} • Due: ₹${balanceDue.toLocaleString()})`}
          </button>
        </div>
      </div>
    </div>
  );
};
