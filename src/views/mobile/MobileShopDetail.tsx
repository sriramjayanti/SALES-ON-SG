import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Search,
  Filter,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  History,
  Info,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Truck,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Shop, Product, Category } from '../../types';

interface MobileShopDetailProps {
  shopId: string;
  currentUser: Employee;
  onBack: () => void;
  onViewBill: (cart: { [productId: string]: number }, shop: Shop) => void;
}

export const MobileShopDetail: React.FC<MobileShopDetailProps> = ({
  shopId,
  currentUser,
  onBack,
  onViewBill
}) => {
  const db = StorageService.getDb();
  const shop = db.shops.find((s) => s.id === shopId);

  const allCategories = db.categories.filter((c) => !c.isDeleted && c.status !== 'inactive' && c.active !== false);
  const rawProducts = db.products.filter((p) => p.active && !p.isDeleted);

  // If sales agent has assigned product categories, show ONLY those categories & products
  const hasCategoryRestriction =
    currentUser.role !== 'super_admin' &&
    Array.isArray(currentUser.assignedCategoryIds) &&
    currentUser.assignedCategoryIds.length > 0;

  const categories = hasCategoryRestriction
    ? allCategories.filter((c) => currentUser.assignedCategoryIds!.includes(c.id))
    : allCategories;

  const allProducts = hasCategoryRestriction
    ? rawProducts.filter((p) => currentUser.assignedCategoryIds!.includes(p.categoryId))
    : rawProducts;

  const [activeTab, setActiveTab] = useState<'order' | 'history' | 'details'>('order');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [showNoOrderModal, setShowNoOrderModal] = useState<boolean>(false);
  const [noOrderReason, setNoOrderReason] = useState<string>('Shop Owner Unavailable');
  const [stockWarning, setStockWarning] = useState<string | null>(null);

  if (!shop) {
    return (
      <div className="mobile-app-shell">
        <header className="mobile-app-header">
          <button onClick={onBack}><ArrowLeft size={20} /></button>
          <h3>Shop Not Found</h3>
        </header>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          This shop does not exist or was deleted.
        </div>
      </div>
    );
  }

  // Handle Stepper (+ / -) with Authoritative Stock Guard
  const updateQty = (productId: string, delta: number) => {
    const prod = allProducts.find((p) => p.id === productId);
    const availableStock = prod?.stock ?? 0;

    setCart((prev) => {
      const current = prev[productId] || 0;

      // When increasing quantity, guard against low/insufficient stock
      if (delta > 0 && prod && prod.stock !== undefined) {
        if (availableStock === 0) {
          setStockWarning(`⚠️ "${prod.name}" is Out of Stock today (0 available).`);
          return prev;
        }
        if (current + delta > availableStock) {
          setStockWarning(
            `⚠️ Stock is low! Only ${availableStock} available in stock today for "${prod.name}". Cannot add more.`
          );
          return prev;
        }
      }

      setStockWarning(null);
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Direct Type Quantity with Stock Validation & Auto-Cap Warning
  const handleDirectQty = (productId: string, valStr: string) => {
    const prod = allProducts.find((p) => p.id === productId);
    const availableStock = prod?.stock ?? 0;
    const parsed = parseInt(valStr, 10);
    const rawNext = isNaN(parsed) ? 0 : Math.max(0, parsed);

    if (prod && prod.stock !== undefined && rawNext > availableStock) {
      // Customer booked more than available stock (e.g. 50 requested, 15 available)
      setStockWarning(
        `⚠️ Stock is low! Customer requested ${rawNext} ${prod.unit}s, but only ${availableStock} available in stock today for "${prod.name}". Quantity adjusted to available stock (${availableStock}).`
      );

      setCart((prev) => {
        if (availableStock === 0) {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        }
        return { ...prev, [productId]: availableStock };
      });
      return;
    }

    setStockWarning(null);
    setCart((prev) => {
      if (rawNext === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: rawNext };
    });
  };

  // Filter products
  const filteredProducts = allProducts.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Calculate cart metrics
  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = Object.entries(cart).reduce((sum, [pId, qty]) => {
    const prod = allProducts.find((p) => p.id === pId);
    return sum + (prod ? prod.sellPrice * qty : 0);
  }, 0);

  // Shop order history & pending dues
  const shopOrders = db.orders.filter((o) => o.shopId === shop.id);
  const unpaidOrders = shopOrders.filter((o) => o.status === 'completed' && o.paymentStatus !== 'paid');
  const totalDue = unpaidOrders.reduce((sum, o) => sum + (o.grandTotal - (o.amountPaid || 0)), 0);

  // Delivery & Payment Handlers
  const handleConfirmDelivery = (orderId: string) => {
    const order = db.orders.find((o) => o.id === orderId);
    const dueAmt = order ? order.grandTotal - (order.amountPaid || 0) : 0;
    const input = window.prompt(
      `Confirm Delivery for ${order?.orderNo || 'order'}:\nEnter payment collected upon delivery (Full: ₹${dueAmt}, or enter partial amount, or 0 for Credit/Unpaid):`,
      dueAmt.toString()
    );
    if (input === null) return;
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) {
      StorageService.confirmDelivery(orderId, {
        paymentStatus: 'unpaid',
        paymentMethod: 'credit',
        notes: 'Delivered at store by sales rep (Credit / Pending Payment)'
      });
      alert('Delivery confirmed as Unpaid / Credit. Balance remains pending.');
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
        alert(`Delivery confirmed! Partial payment of ₹${payAmt} collected. Remaining balance pending: ₹${dueAmt - payAmt}`);
      } else {
        alert(`Delivery confirmed! Full payment of ₹${dueAmt} collected.`);
      }
    }
  };

  const handleCollectPayment = (orderId: string, pendingAmt: number) => {
    const input = window.prompt(
      `Enter collection amount (Pending Balance Due: ₹${pendingAmt}):`,
      pendingAmt.toString()
    );
    if (input === null) return;
    const amt = parseFloat(input);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const payAmt = Math.min(amt, pendingAmt);
    const isFull = payAmt >= pendingAmt;
    StorageService.recordPayment(orderId, isFull ? 'paid' : 'partial', payAmt, 'cash');
    const remaining = pendingAmt - payAmt;
    if (remaining > 0) {
      alert(`₹${payAmt} collected successfully.\nRemaining Balance Pending: ₹${remaining} (will remain pending until fully paid).`);
    } else {
      alert(`Full payment of ₹${payAmt} collected! Bill is now fully settled.`);
    }
  };

  // Handle No Order
  const handleMarkNoOrder = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    StorageService.updateVisitStatus(todayStr, shop.id, 'no_order', noOrderReason);
    setShowNoOrderModal(false);
    alert(`Marked visit for ${shop.name} as 'No Order' (${noOrderReason}).`);
    onBack();
  };

  return (
    <div className="mobile-app-shell">
      {/* Top Header */}
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ padding: '6px', color: 'var(--text-primary)' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 700 }}>
              Shop Details
            </h3>
          </div>
        </div>

        <button
          onClick={() => setShowNoOrderModal(true)}
          style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600, padding: '4px 8px' }}
        >
          No Order?
        </button>
      </header>

      {/* Main Content Area */}
      <div className="mobile-body-scroll" style={{ paddingBottom: totalItems > 0 ? '110px' : '30px' }}>
        {/* Shop Info Card (Showcase Screen 4 Top) */}
        <div
          style={{
            background: '#FFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            marginBottom: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {shop.imageUrl ? (
              <img
                src={shop.imageUrl}
                alt={shop.name}
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover',
                  border: '1.5px solid var(--border)',
                  flexShrink: 0
                }}
              />
            ) : null}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  {shop.name}
                </h2>
                <span className="status-chip active" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {shop.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Shop ID: {shop.shopCode}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {shop.ownerName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {shop.phone}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`tel:${shop.phone}`}
                  style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <Phone size={14} /> Call
                </a>

                <button
                  onClick={() => alert(`Navigating to: ${shop.address}, ${shop.city}`)}
                  style={{
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <MapPin size={14} /> Map
                </button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {shop.address}, {shop.city}, {shop.state}
            </div>

            {shop.description && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <strong style={{ color: 'var(--text-primary)' }}>Description: </strong>
                {shop.description}
              </div>
            )}

            {(shop.preferredVisitDate || shop.preferredVisitTime) && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Clock size={13} />
                <span>Requested Appointment: {shop.preferredVisitDate || ''} {shop.preferredVisitTime || ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Payment Alert if any */}
        {totalDue > 0 && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} color="#DC2626" />
                Pending Payment: ₹{totalDue.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                {unpaidOrders.length} unpaid order{unpaidOrders.length > 1 ? 's' : ''} awaiting collection
              </div>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                background: '#DC2626',
                color: '#FFF',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Collect
            </button>
          </div>
        )}

        {/* Tab Navigation: Order / History / Details */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '3px',
            marginBottom: '16px'
          }}
        >
          <button
            onClick={() => setActiveTab('order')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'order' ? 700 : 500,
              background: activeTab === 'order' ? '#FFF' : 'transparent',
              color: activeTab === 'order' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'order' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Order
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'history' ? 700 : 500,
              background: activeTab === 'history' ? '#FFF' : 'transparent',
              color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            History ({shopOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: activeTab === 'details' ? 700 : 500,
              background: activeTab === 'details' ? '#FFF' : 'transparent',
              color: activeTab === 'details' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'details' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            Details
          </button>
        </div>

        {/* TAB 1: ORDER ENTRY */}
        {activeTab === 'order' && (
          <div>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search products or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: 'var(--radius-md)' }}
              />
            </div>

            {hasCategoryRestriction && (
              <div
                style={{
                  background: '#EEF2FF',
                  border: '1px solid #C7D2FE',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  marginBottom: '10px',
                  fontSize: '11.5px',
                  color: '#4338CA',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🏷 Assigned Lines: {categories.map(c => c.name).join(', ')}</span>
              </div>
            )}

            {/* Category Filter Pills (Showcase Screen 4) */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '14px',
                scrollbarWidth: 'none'
              }}
            >
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: selectedCategory === 'all' ? 'var(--primary)' : '#FFF',
                  color: selectedCategory === 'all' ? '#FFF' : 'var(--text-secondary)',
                  border: selectedCategory === 'all' ? 'none' : '1px solid var(--border)'
                }}
              >
                All
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      background: isSelected ? 'var(--primary)' : '#FFF',
                      color: isSelected ? '#FFF' : 'var(--text-secondary)',
                      border: isSelected ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Live Stock Warning Alert Banner */}
            {stockWarning && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '12.5px',
                  color: '#991B1B',
                  lineHeight: '1.4'
                }}
              >
                <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>{stockWarning}</div>
                <button
                  type="button"
                  onClick={() => setStockWarning(null)}
                  style={{ background: 'none', border: 'none', color: '#991B1B', fontWeight: 700, cursor: 'pointer', padding: '0 4px' }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Product Items List with 1-Tap Stepper */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No products found matching filters.
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const qty = cart[prod.id] || 0;
                  const availableStock = prod.stock ?? 0;
                  const isOut = prod.stock === 0 || prod.stock === undefined;
                  const isLow = prod.stock !== undefined && prod.stock <= (prod.lowStockThreshold || 15);

                  return (
                    <div
                      key={prod.id}
                      style={{
                        background: '#FFF',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm)',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--primary-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary)',
                              fontWeight: 700
                            }}
                          >
                            {prod.name.charAt(0)}
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}
                          >
                            {prod.name}
                          </h4>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                            ₹{prod.sellPrice} <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>/{prod.unit}</span>
                          </div>

                          {/* Available Stock & Expiry Information Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {isOut ? (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                                ❌ Out of Stock (0 today)
                              </span>
                            ) : isLow ? (
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                                ⚠️ Low Stock: {prod.stock} available today
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#047857', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                                ✓ Available: {prod.stock} {prod.unit}
                              </span>
                            )}
                            {prod.expiryDate && (
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', background: '#F1F5F9', padding: '2px 5px', borderRadius: '4px' }}>
                                Exp: {prod.expiryDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 1-Tap Stepper & Direct Typing Input */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div className="quantity-stepper">
                          <button
                            className="step-btn"
                            onClick={() => updateQty(prod.id, -1)}
                            disabled={qty === 0}
                            style={{ opacity: qty === 0 ? 0.35 : 1 }}
                            title="Decrease Quantity"
                          >
                            <Minus size={14} />
                          </button>

                          <input
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            min="0"
                            max={prod.stock !== undefined ? prod.stock : undefined}
                            className="step-input"
                            value={qty === 0 ? '' : qty}
                            placeholder="0"
                            onChange={(e) => handleDirectQty(prod.id, e.target.value)}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            title="Type quantity directly or use +/-"
                            style={{
                              borderColor: prod.stock !== undefined && qty >= availableStock && availableStock > 0 ? '#D97706' : undefined
                            }}
                          />

                          <button
                            className="step-btn"
                            onClick={() => updateQty(prod.id, 1)}
                            disabled={prod.stock !== undefined && qty >= availableStock}
                            style={{ opacity: prod.stock !== undefined && qty >= availableStock ? 0.35 : 1 }}
                            title={prod.stock !== undefined && qty >= availableStock ? `Max available stock (${availableStock}) reached` : 'Increase Quantity'}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {prod.stock !== undefined && qty >= availableStock && availableStock > 0 && (
                          <span style={{ fontSize: '10px', color: '#B45309', fontWeight: 600 }}>
                            Max {availableStock} reached
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORDER HISTORY */}
        {activeTab === 'history' && (
          <div>
            {shopOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                No past orders recorded for this shop.
              </div>
            ) : (
              shopOrders.map((ord) => {
                const isDelivered = ord.deliveryStatus === 'delivered';
                const isPaid = ord.paymentStatus === 'paid';
                const pendingAmt = ord.grandTotal - (ord.amountPaid || 0);

                return (
                  <div
                    key={ord.id}
                    style={{
                      background: '#FFF',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      marginBottom: '10px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                          {ord.orderNo}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {ord.invoiceNo}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                          ₹{ord.grandTotal.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {ord.items.length} Items • {ord.dateString}
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
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

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {!isDelivered && (
                        <button
                          onClick={() => handleConfirmDelivery(ord.id)}
                          className="btn-primary"
                          style={{ flex: 1, padding: '7px 12px', fontSize: '12px', justifyContent: 'center' }}
                        >
                          <Truck size={14} /> Confirm Delivery
                        </button>
                      )}

                      {!isPaid && (
                        <button
                          onClick={() => handleCollectPayment(ord.id, pendingAmt)}
                          style={{
                            flex: 1,
                            padding: '7px 12px',
                            fontSize: '12px',
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
                          <CreditCard size={14} /> Collect Due (₹{pendingAmt})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: DETAILS */}
        {activeTab === 'details' && (
          <div
            style={{
              background: '#FFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Address</span>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{shop.address}, {shop.city}, {shop.state}</div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alternate Phone</span>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{shop.alternatePhone || 'None'}</div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Delivery Instructions</span>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {shop.notes || 'Normal store hours.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Order Footer (Showcase Screen 4 Bottom) */}
      {totalItems > 0 && activeTab === 'order' && (
        <div className="sticky-order-bar">
          <div className="sticky-order-summary">
            <span className="sticky-order-count">
              <ShoppingBag size={13} style={{ display: 'inline', verticalAlign: '-1px' }} /> {totalItems} items
            </span>
            <span className="sticky-order-total">
              ₹{totalAmount.toLocaleString()}
            </span>
          </div>

          <button
            className="btn-primary"
            style={{ padding: '12px 24px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
            onClick={() => onViewBill(cart, shop)}
          >
            View Bill
          </button>
        </div>
      )}

      {/* No Order Reason Modal */}
      {showNoOrderModal && (
        <div className="modal-backdrop" onClick={() => setShowNoOrderModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record No Order</h3>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Reason for No Order / Skip:</label>
              <select
                value={noOrderReason}
                onChange={(e) => setNoOrderReason(e.target.value)}
                style={{ width: '100%', height: '40px' }}
              >
                <option value="Shop Closed">Shop Closed</option>
                <option value="Shop Owner Unavailable">Shop Owner Unavailable</option>
                <option value="Sufficient Inventory / Stock Full">Sufficient Inventory / Stock Full</option>
                <option value="Payment / Credit Issue">Payment / Credit Issue</option>
                <option value="Refused Order">Refused Order</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNoOrderModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ background: 'var(--danger)' }} onClick={handleMarkNoOrder}>
                Confirm No Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
