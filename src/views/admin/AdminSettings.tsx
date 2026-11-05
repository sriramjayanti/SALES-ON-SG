import React, { useState } from 'react';
import { Settings, Save, Download, Upload, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { BusinessSettings } from '../../types';

export const AdminSettings: React.FC = () => {
  const db = StorageService.getDb();
  const [form, setForm] = useState<BusinessSettings>(db.settings);
  const [isSaved, setIsSaved] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = StorageService.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_on_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    const ok = StorageService.importJson(importJsonText);
    if (ok) {
      alert('Database restored successfully from JSON!');
      setImportJsonText('');
      window.location.reload();
    } else {
      alert('Invalid database JSON structure.');
    }
  };

  return (
    <div style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Business Profile Configuration */}
      <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
              Business Profile & Invoice Settings
            </h3>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Configure trading details printed on receipts & invoices
            </div>
          </div>

          {isSaved && (
            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Company / Distributor Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Warehouse / Office Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div className="form-grid-3">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Official Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>GSTIN</label>
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div className="form-grid-3">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Invoice Sequence Prefix</label>
              <input
                type="text"
                value={form.invoicePrefix}
                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Next Number</label>
              <input
                type="number"
                value={form.nextInvoiceNumber}
                onChange={(e) => setForm({ ...form, nextInvoiceNumber: Number(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Default GST Rate (%)</label>
              <input
                type="number"
                value={form.defaultTaxRate}
                onChange={(e) => setForm({ ...form, defaultTaxRate: Number(e.target.value) })}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>WhatsApp Bill Message Template</label>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Dynamic variables available: {'{shopName}'}, {'{orderNo}'}, {'{invoiceNo}'}, {'{amount}'}, {'{itemCount}'}, {'{date}'}, {'{link}'}
            </div>
            <textarea
              rows={4}
              value={form.whatsappTemplate}
              onChange={(e) => setForm({ ...form, whatsappTemplate: e.target.value })}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
            />
          </div>

          <div>
            <button className="btn-primary" type="submit">
              <Save size={15} /> Save System Settings
            </button>
          </div>
        </form>
      </div>

      {/* Database Backup & Transfer */}
      <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
          Data Portability & Backup Engine
        </h3>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Export your complete operational data (Products, Shops, Routes, Orders, Staff) as JSON or load live real datasets.
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button className="btn-secondary" onClick={handleDownloadBackup}>
            <Download size={15} /> Download Full JSON Database
          </button>

          <button
            className="btn-secondary"
            style={{ color: 'var(--danger)', borderColor: '#FCA5A5', background: 'var(--danger-light)' }}
            onClick={() => {
              if (window.confirm('Delete ALL operational data (products, shops, routes, orders, visits, staff) to start with a 100% clean slate?')) {
                StorageService.clearAllData();
                window.location.reload();
              }
            }}
          >
            <RefreshCw size={15} /> Delete All Data (Start Clean)
          </button>
        </div>

        <div>
          <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Paste JSON to Restore / Import Data</label>
          <textarea
            rows={3}
            placeholder="Paste exported JSON here..."
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            style={{ width: '100%', marginTop: '4px', fontFamily: 'monospace', fontSize: '11px' }}
          />
          <button
            className="btn-primary"
            style={{ marginTop: '8px' }}
            onClick={handleImportJson}
            disabled={!importJsonText.trim()}
          >
            <Upload size={14} /> Import & Replace Database
          </button>
        </div>
      </div>
    </div>
  );
};
