import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Share2,
  Phone,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Download,
  Building2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Order, BusinessSettings } from '../../types';
import { firestore, doc, getDoc, collection, getDocs, query, where } from '../../services/firebase';

interface PublicReceiptViewProps {
  receiptQuery: string;
  onBackToLogin?: () => void;
}

export const PublicReceiptView: React.FC<PublicReceiptViewProps> = ({
  receiptQuery,
  onBackToLogin
}) => {
  const [order, setOrder] = useState<Order | null>(() => {
    return StorageService.getOrderByIdOrNo(receiptQuery) || null;
  });
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    return StorageService.getDb().settings;
  });
  const [loading, setLoading] = useState<boolean>(!order);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // If order is already found in local memory, no urgent need to fetch, but can re-verify in background
    let isMounted = true;

    async function fetchRemoteOrder() {
      try {
        const cleanQuery = receiptQuery.trim().replace(/^#/, '');

        // 1. Try fetching directly by document ID
        if (cleanQuery.startsWith('ord_')) {
          const docSnap = await getDoc(doc(firestore, 'orders', cleanQuery));
          if (docSnap.exists() && isMounted) {
            const data = docSnap.data() as Order;
            setOrder(data);
            setLoading(false);
            return;
          }
        }

        // 2. Query by orderNo
        const qOrderNo = query(collection(firestore, 'orders'), where('orderNo', '==', cleanQuery));
        const orderNoSnap = await getDocs(qOrderNo);
        if (!orderNoSnap.empty && isMounted) {
          const data = orderNoSnap.docs[0].data() as Order;
          setOrder(data);
          setLoading(false);
          return;
        }

        // 3. Query by invoiceNo
        const qInvoiceNo = query(collection(firestore, 'orders'), where('invoiceNo', '==', cleanQuery));
        const invoiceSnap = await getDocs(qInvoiceNo);
        if (!invoiceSnap.empty && isMounted) {
          const data = invoiceSnap.docs[0].data() as Order;
          setOrder(data);
          setLoading(false);
          return;
        }

        // 4. Fallback: Scan orders collection in case of casing mismatch or partial search
        const allOrdersSnap = await getDocs(collection(firestore, 'orders'));
        if (!allOrdersSnap.empty && isMounted) {
          const lowerQ = cleanQuery.toLowerCase();
          const matchedDoc = allOrdersSnap.docs.find(d => {
            const ord = d.data() as Order;
            return (
              ord.id.toLowerCase() === lowerQ ||
              ord.orderNo.toLowerCase() === lowerQ ||
              ord.invoiceNo.toLowerCase() === lowerQ
            );
          });

          if (matchedDoc) {
            setOrder(matchedDoc.data() as Order);
            setLoading(false);
            return;
          }
        }

        // Also fetch live settings if available
        const settingsSnap = await getDoc(doc(firestore, 'settings', 'business_settings'));
        if (settingsSnap.exists() && isMounted) {
          setSettings(settingsSnap.data() as BusinessSettings);
        }
      } catch (err) {
        console.warn('[PublicReceiptView] Could not fetch remote order:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!order) {
      fetchRemoteOrder();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [receiptQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '4px solid var(--border)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          Loading Official Receipt...
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
          Retrieving live bill reference <strong>{receiptQuery}</strong> from Varshitha Sales & Distributing Co.
        </p>
      </div>
    );
  }

  // Not Found Screen
  if (!order) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--danger)',
          marginBottom: '16px'
        }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Receipt Not Found
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '380px', marginBottom: '24px', lineHeight: 1.5 }}>
          We could not find an active bill or receipt matching <strong>"{receiptQuery}"</strong>. Please verify the link or contact our distribution support.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href={`https://wa.me/917799225566?text=${encodeURIComponent(`Hello Varshitha Sales, I have a question regarding receipt query: ${receiptQuery}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            style={{ textDecoration: 'none' }}
          >
            <Phone size={16} /> Contact Support
          </a>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="btn-secondary"
            >
              Go to Staff Login
            </button>
          )}
        </div>
      </div>
    );
  }

  const amountPaid = order.amountPaid || 0;
  const balanceDue = order.balanceDue !== undefined ? order.balanceDue : Math.max(0, order.grandTotal - amountPaid);
  const isDelivered = order.deliveryStatus === 'delivered';
  const isPaid = balanceDue === 0;
  const paymentMethodStr = (order.paymentMethod || 'cash').toUpperCase();

  const nextVisitStr = order.nextVisitDate
    ? `${order.nextVisitDate}${order.nextVisitTime ? ' at ' + order.nextVisitTime : ''}`
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', paddingBottom: '40px' }}>
      {/* Top Navbar - Hide in Print */}
      <nav className="public-receipt-no-print" style={{
        background: '#FFF',
        borderBottom: '1px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '14px'
          }}>
            VS
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {settings.businessName || 'Varshitha Sales'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ShieldCheck size={12} /> Verified Digital Receipt
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Copy Public Receipt Link"
          >
            {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Print or Save PDF"
          >
            <Printer size={14} />
            <span>Print PDF</span>
          </button>

          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Staff Portal
            </button>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <div style={{ maxWidth: '720px', margin: '24px auto', padding: '0 16px' }}>
        {/* Receipt Paper Card */}
        <div
          className="receipt-paper"
          style={{
            background: '#FFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden'
          }}
        >
          {/* Company Brand Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #1e3a8a 100%)',
            color: '#FFF',
            padding: '24px 24px 20px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  Official Tax Invoice & Delivery Receipt
                </span>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, margin: 0, color: '#FFF' }}>
                  {settings.businessName}
                </h1>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                  {settings.address}
                </div>
                <div style={{ fontSize: '11.5px', opacity: 0.85, marginTop: '4px' }}>
                  GSTIN: <strong>{settings.gstin}</strong> • Phone: {settings.phone}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 600 }}>
                  Invoice Number
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, letterSpacing: '0.02em', color: '#FFF' }}>
                  {order.invoiceNo}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  Order #{order.orderNo}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '4px' }}>
                  Date: {order.dateString}
                </div>
              </div>
            </div>

            {/* Badges Bar */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
              <span style={{
                background: isDelivered ? '#10b981' : '#f59e0b',
                color: '#FFF',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {isDelivered ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                {isDelivered ? 'Delivered' : 'Order Confirmed / Pending Delivery'}
              </span>

              <span style={{
                background: isPaid ? '#10b981' : '#ef4444',
                color: '#FFF',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                {isPaid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {isPaid ? 'Fully Paid' : `Payment Due: ₹${balanceDue.toLocaleString()}`}
              </span>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Retailer Section (Billed To) */}
            <div style={{
              background: 'var(--bg-app)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              border: '1px solid var(--border-light)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Billed To (Customer / Retailer)
                </span>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {order.shopNameSnapshot}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Shop Code: <strong>{order.shopCodeSnapshot}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Contact: <a href={`tel:${order.shopPhoneSnapshot}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{order.shopPhoneSnapshot}</a>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                  {order.shopAddressSnapshot}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Order & Sales Dispatch Details
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Route: <strong>{order.routeNameSnapshot || 'Distribution Route'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Sales Agent: <strong>{order.employeeNameSnapshot || 'Varshitha Sales Staff'}</strong>
                </div>
                {nextVisitStr && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    color: '#065f46',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Calendar size={14} color="#059669" />
                    <span>Next Scheduled Visit: <strong>{nextVisitStr}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Itemized Products ({order.items.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-app)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', width: '32px' }}>#</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Product Description</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', width: '70px' }}>Unit</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', width: '80px' }}>Rate</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)', width: '60px' }}>Qty</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)', width: '90px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.productName}</div>
                        {item.sku && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {item.unit || 'unit'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        ₹{item.unitPrice.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.qty}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Billing Calculation & Payment Summary */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '100%',
                maxWidth: '360px',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.subtotal.toLocaleString()}</span>
                </div>

                {order.taxTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>GST / Tax:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.taxTotal.toLocaleString()}</span>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border)',
                  marginBottom: '12px'
                }}>
                  <span>Grand Total:</span>
                  <span style={{ color: 'var(--primary)' }}>₹{order.grandTotal.toLocaleString()}</span>
                </div>

                {/* Amount Paid */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  padding: '8px 10px',
                  background: '#f0fdf4',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  color: '#166534'
                }}>
                  <span style={{ fontWeight: 600 }}>Amount Paid ({paymentMethodStr}):</span>
                  <span style={{ fontWeight: 800 }}>₹{amountPaid.toLocaleString()}</span>
                </div>

                {/* Balance Due / Has to be Paid */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13.5px',
                  padding: '10px',
                  background: balanceDue > 0 ? '#fef2f2' : '#f0fdf4',
                  border: balanceDue > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  borderRadius: '6px',
                  color: balanceDue > 0 ? '#991b1b' : '#166534'
                }}>
                  <span style={{ fontWeight: 700 }}>
                    {balanceDue > 0 ? 'Has to be Paid (Balance Due):' : 'Status:'}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: '15px' }}>
                    {balanceDue > 0 ? `₹${balanceDue.toLocaleString()}` : '✓ Fully Cleared'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes if any */}
            {order.notes && (
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                padding: '10px 14px',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px'
              }}>
                <strong>Order Notes:</strong> {order.notes}
              </div>
            )}

            {/* Legal / Distribution Footer */}
            <div style={{
              textAlign: 'center',
              paddingTop: '20px',
              borderTop: '1px dashed var(--border)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              lineHeight: 1.5
            }}>
              <p style={{ margin: '0 0 4px 0' }}>
                Thank you for your business with <strong>{settings.businessName}</strong>.
              </p>
              <p style={{ margin: 0 }}>
                This is a computer-verified digital invoice. For billing or delivery inquiries, please call or WhatsApp <strong>{settings.phone}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls for Customer - Hide in Print */}
        <div className="public-receipt-no-print" style={{
          marginTop: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ padding: '12px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Printer size={16} /> Print or Download PDF
          </button>

          <a
            href={`https://wa.me/917799225566?text=${encodeURIComponent(`Hello Varshitha Sales, I have an inquiry regarding Order #${order.orderNo} (Invoice: ${order.invoiceNo}).`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
            style={{ textDecoration: 'none', padding: '12px 20px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Phone size={16} /> WhatsApp Varshitha Support
          </a>

          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '12px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {copied ? <Check size={16} color="var(--success)" /> : <Share2 size={16} />}
            <span>{copied ? 'Link Copied!' : 'Share Receipt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
