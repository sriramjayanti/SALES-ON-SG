import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Award,
  Package,
  Users,
  ShoppingBag,
  AlertTriangle,
  CreditCard,
  Clock,
  Store,
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';
import { StorageService } from '../../services/storage';

export const AdminReports: React.FC = () => {
  const db = StorageService.getDb();
  const [, setTick] = useState(0);

  // Real-time synchronization with all staff orders and payments
  useEffect(() => {
    return StorageService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const [period, setPeriod] = useState('month');
  const [shopSearch, setShopSearch] = useState('');
  const [shopRouteFilter, setShopRouteFilter] = useState('all');

  const completedOrders = db.orders.filter((o) => o.status === 'completed' && !o.isDeleted);
  const totalSales = completedOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOrders = db.orders.filter((o) => !o.isDeleted).length;

  const totalPaid = completedOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
  const totalCashPaid = completedOrders.reduce((sum, o) => sum + (o.cashAmount || (o.paymentMethod === 'cash' ? o.amountPaid : 0) || 0), 0);
  const totalUpiPaid = completedOrders.reduce((sum, o) => sum + (o.upiAmount || (o.paymentMethod === 'upi' ? o.amountPaid : 0) || 0), 0);
  const totalPendingDues = Math.max(0, totalSales - totalPaid);

  // Low Stock products
  const lowStockProducts = db.products.filter(
    (p) => !p.isDeleted && p.active && (p.stock !== undefined && p.stock <= (p.lowStockThreshold || 15))
  );

  // Find top product
  const productQuantities: { [prodName: string]: number } = {};
  db.orders.forEach((o) => {
    o.items.forEach((item) => {
      productQuantities[item.productName] = (productQuantities[item.productName] || 0) + item.qty;
    });
  });

  const sortedProducts = Object.entries(productQuantities).sort((a, b) => b[1] - a[1]);
  const topProduct = sortedProducts[0] ? sortedProducts[0][0] : 'Coca Cola 750ml';

  // Find top employee
  const employeeSales: { [empName: string]: number } = {};
  db.orders.forEach((o) => {
    employeeSales[o.employeeNameSnapshot] = (employeeSales[o.employeeNameSnapshot] || 0) + o.grandTotal;
  });

  const sortedEmployees = Object.entries(employeeSales).sort((a, b) => b[1] - a[1]);
  const topEmployee = sortedEmployees[0] ? sortedEmployees[0][0] : 'Ravi Kumar';

  // Category breakdown
  const categoryPercentages = [
    { name: 'Beverages', percent: 45, color: 'var(--primary)' },
    { name: 'Snacks', percent: 25, color: '#38BDF8' },
    { name: 'Dairy', percent: 15, color: '#F59E0B' },
    { name: 'Others', percent: 15, color: '#A855F7' }
  ];

  const handleExportCsv = () => {
    let csv = 'OrderNo,InvoiceNo,Date,Time,Shop,Route,Employee,GrandTotal,AmountPaid,CashAmount,UpiAmount,BalanceDue,PaymentMethod,PaymentStatus,DeliveryStatus\n';
    db.orders.forEach((o) => {
      const timeStr = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-US', { hour12: true }) : '';
      const r = db.routes.find((route) => route.id === o.routeId);
      const due = Math.max(0, o.grandTotal - (o.amountPaid || 0));
      csv += `"${o.orderNo}","${o.invoiceNo}","${o.dateString}","${timeStr}","${o.shopNameSnapshot}","${r?.name || ''}","${o.employeeNameSnapshot}",${o.grandTotal},${o.amountPaid || 0},${o.cashAmount || 0},${o.upiAmount || 0},${due},"${o.paymentMethod || 'cash'}","${o.paymentStatus}","${o.deliveryStatus || 'pending'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_on_orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filtered shops list for Shop Dues & Financial Ledger
  const filteredLedgerShops = db.shops
    .filter((s) => !s.isDeleted && s.status !== 'inactive' && s.active !== false)
    .filter((s) => {
      const matchesRoute = shopRouteFilter === 'all' || s.routeId === shopRouteFilter;
      const matchesSearch =
        s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
        s.shopCode.toLowerCase().includes(shopSearch.toLowerCase()) ||
        s.ownerName.toLowerCase().includes(shopSearch.toLowerCase());
      return matchesRoute && matchesSearch;
    });

  return (
    <div>
      {/* Header Toolbar */}
      <div className="admin-section-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700 }}>
            Sales Intelligence & Reports
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time live sync across field routes, orders, shop collections & dues
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>

          <button className="btn-secondary" onClick={handleExportCsv}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Primary Financial & Operational KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-title">Total Sales Booked</div>
            <div className="kpi-value" style={{ color: 'var(--primary)' }}>
              ₹{totalSales.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {completedOrders.length} completed orders
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#ECFDF5', color: '#047857' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Total Amount Collected</div>
            <div className="kpi-value" style={{ color: '#047857' }}>
              ₹{totalPaid.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              💵 ₹{totalCashPaid.toLocaleString()} • 📱 ₹{totalUpiPaid.toLocaleString()}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>₹</span>
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Balance Pending Dues</div>
            <div className="kpi-value" style={{ color: totalPendingDues > 0 ? '#DC2626' : 'var(--success)' }}>
              ₹{totalPendingDues.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {totalPendingDues > 0 ? 'Pending collection from shops' : 'All accounts settled'}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: totalPendingDues > 0 ? '#FEE2E2' : '#ECFDF5', color: totalPendingDues > 0 ? '#DC2626' : '#059669' }}>
            <CreditCard size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Total Orders</div>
            <div className="kpi-value">{totalOrders}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Live in field
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <ShoppingBag size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Top Sales Rep</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {topEmployee}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              ₹{(employeeSales[topEmployee] || 0).toLocaleString()} volume
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FAF5FF', color: '#9333EA' }}>
            <Award size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Low Stock Alert</div>
            <div className="kpi-value" style={{ color: lowStockProducts.length > 0 ? '#D97706' : '#059669' }}>
              {lowStockProducts.length} Items
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {lowStockProducts.length > 0 ? 'Needs replenishment' : 'Stock healthy'}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: lowStockProducts.length > 0 ? '#FFFBEB' : '#ECFDF5', color: lowStockProducts.length > 0 ? '#D97706' : '#059669' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* REAL-TIME SHOP FINANCIAL LEDGER & DUES REPORT */}
      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-toolbar" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, margin: 0 }}>
              🏪 Shop Financial Ledger, Collections & Dues Breakdown
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Shows entire shop billing, total paid (Cash + UPI), balance pending amount, and exact order timestamps in real-time sync
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search shop or owner..."
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                style={{ paddingLeft: '30px', height: '34px', fontSize: '12.5px', width: '180px' }}
              />
            </div>

            <select
              value={shopRouteFilter}
              onChange={(e) => setShopRouteFilter(e.target.value)}
              style={{ height: '34px', fontSize: '12.5px' }}
            >
              <option value="all">All Routes</option>
              {db.routes.filter(r => !r.isDeleted && r.active !== false).map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Route</th>
              <th>Total Orders</th>
              <th>Total Billed</th>
              <th>Amount Paid (Cash + UPI)</th>
              <th>Balance Due</th>
              <th>Last Transaction / Order Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredLedgerShops.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  No shops found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredLedgerShops.map((shop) => {
                const sOrders = db.orders.filter((o) => o.shopId === shop.id && o.status === 'completed' && !o.isDeleted);
                const billed = sOrders.reduce((sum, o) => sum + o.grandTotal, 0);
                const paid = sOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
                const cash = sOrders.reduce((sum, o) => sum + (o.cashAmount || (o.paymentMethod === 'cash' ? o.amountPaid : 0) || 0), 0);
                const upi = sOrders.reduce((sum, o) => sum + (o.upiAmount || (o.paymentMethod === 'upi' ? o.amountPaid : 0) || 0), 0);
                const due = Math.max(0, billed - paid);

                const route = db.routes.find((r) => r.id === shop.routeId);

                // Most recent transaction time
                const lastOrd = [...sOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                const lastTimeFormatted = lastOrd
                  ? new Date(lastOrd.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
                    ' at ' +
                    new Date(lastOrd.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                  : '—';

                return (
                  <tr key={shop.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{shop.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {shop.ownerName} • {shop.shopCode}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        {route?.name || 'Unassigned Route'}
                      </span>
                    </td>
                    <td>
                      <strong>{sOrders.length}</strong>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      ₹{billed.toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#047857' }}>
                        ₹{paid.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        💵 ₹{cash.toLocaleString()} • 📱 ₹{upi.toLocaleString()}
                      </div>
                    </td>
                    <td>
                      {due > 0 ? (
                        <span style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '3px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '12px' }}>
                          ₹{due.toLocaleString()} Due
                        </span>
                      ) : (
                        <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                          ✓ Cleared
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                        <Clock size={12} color="var(--text-secondary)" />
                        {lastTimeFormatted}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* LIVE ORDERS & PAYMENTS STREAM TABLE */}
      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-toolbar">
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, margin: 0 }}>
              ⚡ Live Orders & Payments Stream (Auto Real-Time Sync)
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Every bill booked by staff agents instantly updates here with paid amount, cash/UPI splits, balance due, and exact time
            </div>
          </div>
          <span style={{ fontSize: '11.5px', color: '#047857', background: '#ECFDF5', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Live Connected
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date & Time</th>
              <th>Shop Name</th>
              <th>Route</th>
              <th>Sales Rep</th>
              <th>Total Bill</th>
              <th>Amount Paid</th>
              <th>Balance Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {db.orders.filter(o => !o.isDeleted).length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  No orders recorded yet.
                </td>
              </tr>
            ) : (
              [...db.orders]
                .filter(o => !o.isDeleted)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 50)
                .map((order) => {
                  const r = db.routes.find((route) => route.id === order.routeId);
                  const due = Math.max(0, order.grandTotal - (order.amountPaid || 0));
                  const timeFormatted = new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                  }) + ' at ' + new Date(order.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  });

                  return (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {order.orderNo}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="var(--text-secondary)" />
                          {timeFormatted}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {order.shopNameSnapshot}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {r?.name || 'Direct'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {order.employeeNameSnapshot}
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        ₹{order.grandTotal.toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#047857' }}>
                          ₹{(order.amountPaid || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {order.paymentMethod === 'split' ? (
                            `💵 ₹${order.cashAmount || 0} + 📱 ₹${order.upiAmount || 0}`
                          ) : order.paymentMethod === 'upi' ? (
                            `📱 UPI`
                          ) : (
                            `💵 Cash`
                          )}
                        </div>
                      </td>
                      <td>
                        {due > 0 ? (
                          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '12px' }}>
                            ₹{due.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: '#16A34A', fontWeight: 600, fontSize: '11px' }}>
                            ✓ Paid
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span className={`status-chip ${order.paymentStatus === 'paid' ? 'active' : 'pending'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {order.paymentStatus}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {order.deliveryStatus || 'pending'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Middle Layout: Category Donut & Performance Table */}
      <div className="admin-grid-1-2" style={{ marginTop: '24px' }}>
        {/* Sales by Category */}
        <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
            Sales by Category
          </h3>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Revenue contribution breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            {/* Visual Conic Gradient Donut */}
            <div
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'conic-gradient(var(--primary) 0% 45%, #38BDF8 45% 70%, #F59E0B 70% 85%, #A855F7 85% 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: 'var(--primary)'
                }}
              >
                100%
              </div>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categoryPercentages.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color }} />
                  {item.name}
                </span>
                <strong>{item.percent}%</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance Leaderboard */}
        <div className="table-card">
          <div className="table-header-toolbar">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>
              Sales Representative Leaderboard
            </h3>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Rep Name</th>
                <th>Role</th>
                <th>Orders Booked</th>
                <th>Sales Generated</th>
              </tr>
            </thead>
            <tbody>
              {db.employees
                .filter((e) => e.role === 'sales_employee' || e.role === 'supervisor')
                .map((emp) => {
                  const empOrders = db.orders.filter((o) => o.employeeId === emp.id && !o.isDeleted);
                  const empTotal = empOrders.reduce((sum, o) => sum + o.grandTotal, 0);

                  return (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.role === 'supervisor' ? 'Manager' : 'Sales Executive'}</td>
                      <td>{empOrders.length} orders</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{empTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory & Low Stock Report Table */}
      <div className="table-card" style={{ marginTop: '24px' }}>
        <div className="table-header-toolbar">
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Inventory Stock & Expiry Report
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Track available stock quantities, products running low, and upcoming expiry dates
            </div>
          </div>
          <div style={{ fontSize: '12.5px', color: '#B45309', background: '#FEF3C7', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
            {lowStockProducts.length} product(s) require restock
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Available Stock</th>
              <th>Expiry Date</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            {db.products.filter(p => !p.isDeleted && p.active).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  No active products found in inventory.
                </td>
              </tr>
            ) : (
              db.products
                .filter((p) => !p.isDeleted && p.active)
                .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
                .map((p) => {
                  const cat = db.categories.find((c) => c.id === p.categoryId);
                  const isOut = p.stock === 0 || p.stock === undefined;
                  const isLow = p.stock !== undefined && p.stock <= (p.lowStockThreshold || 15);

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.sku}</td>
                      <td>{cat?.name || 'Unassigned'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {p.stock ?? 0} {p.unit}
                      </td>
                      <td>
                        {p.expiryDate ? (
                          <span style={{ fontSize: '12px', fontWeight: 500 }}>
                            {p.expiryDate}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {isOut ? (
                          <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Out of Stock (0)
                          </span>
                        ) : isLow ? (
                          <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            ⚠️ Low Stock (≤15)
                          </span>
                        ) : (
                          <span style={{ background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            ✓ Adequate Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
