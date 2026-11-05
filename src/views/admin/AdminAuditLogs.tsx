import React, { useState } from 'react';
import { History, Search, ShieldCheck, Clock, Download } from 'lucide-react';
import { StorageService } from '../../services/storage';

export const AdminAuditLogs: React.FC = () => {
  const db = StorageService.getDb();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = db.auditLogs.filter((log) => {
    const matchesSearch =
      log.summary.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="table-card">
      <div className="table-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="FINALIZE_ORDER">FINALIZE_ORDER</option>
            <option value="CANCEL_ORDER">CANCEL_ORDER</option>
            <option value="ADD_SHOP">ADD_SHOP</option>
            <option value="EDIT_SHOP">EDIT_SHOP</option>
            <option value="ADD_PRODUCT">ADD_PRODUCT</option>
            <option value="UPDATE_PRICE">UPDATE_PRICE</option>
            <option value="UPDATE_PERMISSIONS">UPDATE_PERMISSIONS</option>
            <option value="CREATE_HOLIDAY">CREATE_HOLIDAY</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <strong>{filteredLogs.length}</strong> Audit Events
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Entity Type</th>
            <th>Summary / Details</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((log) => (
            <tr key={log.id}>
              <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td>
                <div style={{ fontWeight: 600 }}>{log.actorName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.actorRole}</div>
              </td>
              <td>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background:
                      log.action.includes('CANCEL') || log.action.includes('DELETE')
                        ? 'var(--danger-light)'
                        : log.action.includes('PRICE')
                        ? 'var(--warning-light)'
                        : 'var(--primary-light)',
                    color:
                      log.action.includes('CANCEL') || log.action.includes('DELETE')
                        ? 'var(--danger)'
                        : log.action.includes('PRICE')
                        ? '#B45309'
                        : 'var(--primary)'
                  }}
                >
                  {log.action}
                </span>
              </td>
              <td style={{ textTransform: 'capitalize', fontSize: '12.5px' }}>{log.entityType}</td>
              <td style={{ fontWeight: 500, fontSize: '13px' }}>{log.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
