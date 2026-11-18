import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Award,
  Package,
  Users,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import { StorageService } from '../../services/storage';

export const AdminReports: React.FC = () => {
  const db = StorageService.getDb();
  const [period, setPeriod] = useState('month');

  const totalSales = db.orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  const totalOrders = db.orders.length;

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
    let csv = 'OrderNo,InvoiceNo,Date,Shop,Employee,GrandTotal,Status\n';
    db.orders.forEach((o) => {
      csv += `"${o.orderNo}","${o.invoiceNo}","${o.dateString}","${o.shopNameSnapshot}","${o.employeeNameSnapshot}",${o.grandTotal},"${o.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_on_orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Header Toolbar */}
      <div className="admin-section-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700 }}>
            Sales Intelligence & Reports
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time analytics across field routes, orders and product lines
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

      {/* 4 Metric Cards (Showcase Screen 14) */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-title">Total Sales</div>
            <div className="kpi-value" style={{ color: 'var(--primary)' }}>
              ₹{totalSales.toLocaleString()}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#ECFDF5', color: '#047857' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Total Orders</div>
            <div className="kpi-value">{totalOrders}</div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <ShoppingBag size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Top Product</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {topProduct}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Package size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-title">Top Employee</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {topEmployee}
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
          </div>
          <div className="kpi-icon-wrap" style={{ background: lowStockProducts.length > 0 ? '#FFFBEB' : '#ECFDF5', color: lowStockProducts.length > 0 ? '#D97706' : '#059669' }}>
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Middle Layout: Category Donut & Performance Table */}
      <div className="admin-grid-1-2">
        {/* Sales by Category (Showcase Screen 14 Donut) */}
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
                  const empOrders = db.orders.filter((o) => o.employeeId === emp.id);
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
