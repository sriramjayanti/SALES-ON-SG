import React from 'react';
import {
  LayoutDashboard,
  Package,
  Store,
  Route as RouteIcon,
  Users,
  FileText,
  Calendar,
  BarChart3,
  History,
  Settings,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  X
} from 'lucide-react';
import { Employee } from '../types';
import { StorageService } from '../services/storage';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'shops'
  | 'routes'
  | 'employees'
  | 'orders'
  | 'calendar'
  | 'reports'
  | 'audit'
  | 'settings';

interface DesktopSidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  currentUser: Employee;
  isOpen?: boolean;
  onClose?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  isOpen,
  onClose
}) => {
  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'products', label: 'Products Master', icon: <Package size={18} /> },
    { id: 'shops', label: 'Shops Directory', icon: <Store size={18} /> },
    { id: 'routes', label: 'Custom Routes', icon: <RouteIcon size={18} /> },
    { id: 'calendar', label: 'Calendar & Holidays', icon: <Calendar size={18} /> },
    { id: 'orders', label: 'Orders & Bills', icon: <FileText size={18} /> },
    { id: 'employees', label: 'Staff & Roles', icon: <Users size={18} /> },
    { id: 'reports', label: 'Sales Reports', icon: <BarChart3 size={18} /> },
    { id: 'audit', label: 'Activity Logs', icon: <History size={18} /> },
    { id: 'settings', label: 'Business Settings', icon: <Settings size={18} /> }
  ];

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <ShoppingBag size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', lineHeight: 1.2 }}>Varshitha Sales</h2>
            <span style={{ fontSize: '11px', color: '#8CA69E' }}>Route & Order Hub</span>
          </div>
          {onClose && (
            <button
              className="admin-sidebar-close-btn"
              onClick={onClose}
              title="Close menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (onClose) onClose();
                }}
              >
                {item.icon}
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#255C4E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0
              }}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  color: '#FFF',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
              >
                {currentUser.name}
              </div>
              <div style={{ color: '#8EAFA5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} color="#4ADE80" />
                {currentUser.role === 'super_admin'
                  ? 'Super Admin'
                  : currentUser.role === 'admin'
                  ? 'Admin'
                  : currentUser.role === 'supervisor'
                  ? 'Manager'
                  : 'Sales Rep'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              StorageService.logout();
            }}
            title="Log Out"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>
    </>
  );
};
