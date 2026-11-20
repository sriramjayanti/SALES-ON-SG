import React from 'react';
import {
  Home,
  MapPin,
  Store,
  FileText,
  Package,
  RefreshCw,
  Settings,
  HelpCircle,
  LogOut,
  X,
  CheckCircle2,
  ShieldAlert,
  LayoutDashboard,
  UserCheck
} from 'lucide-react';
import { Employee } from '../types';
import { MobileTab } from './MobileBottomNav';
import { StorageService } from '../services/storage';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  allUsers: Employee[];
  onSelectTab: (tab: MobileTab) => void;
  onOpenProducts: () => void;
  onOpenSettings: () => void;
  onOpenAdminPortal?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSelectTab,
  onOpenProducts,
  onOpenSettings,
  onOpenAdminPortal
}) => {
  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        justifyContent: 'flex-start'
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        style={{
          position: 'relative',
          width: '300px',
          maxWidth: '85%',
          height: '100%',
          background: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 25px rgba(0, 0, 0, 0.2)',
          zIndex: 510,
          overflowY: 'auto'
        }}
      >
        {/* Header Profile with Role Switcher */}
        <div
          style={{
            padding: '24px 20px',
            background: 'var(--primary)',
            color: '#FFF',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#FFF',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px'
                }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{currentUser.name}</h4>
                <span style={{ fontSize: '11.5px', opacity: 0.85 }}>
                  {currentUser.role === 'sales_employee' ? 'Sales Executive' : currentUser.role}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ color: '#FFF', opacity: 0.8 }}>
              <X size={20} />
            </button>
          </div>

          {/* Quick Role Switcher (Admin Only) */}
          {isAdmin && (
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={12} /> Switch User:
              </span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  StorageService.switchUser(e.target.value);
                  onClose();
                }}
                style={{
                  background: '#FFF',
                  color: 'var(--primary)',
                  border: 'none',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px'
                }}
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <div style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => {
              onSelectTab('home');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <Home size={18} color="var(--primary)" /> Home Dashboard
          </button>

          <button
            onClick={() => {
              onSelectTab('route');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <MapPin size={18} color="var(--primary)" /> Today's Route
          </button>

          <button
            onClick={() => {
              onSelectTab('shops');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <Store size={18} color="var(--primary)" /> Retail Shops
          </button>

          <button
            onClick={() => {
              onSelectTab('orders');
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <FileText size={18} color="var(--primary)" /> Orders Taken
          </button>

          <button
            onClick={() => {
              onOpenProducts();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <Package size={18} color="var(--primary)" /> Product Catalog
          </button>

          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

          {/* ADMIN PORTAL ACCESS (Admin Only) */}
          {isAdmin && onOpenAdminPortal && (
            <button
              onClick={() => {
                onOpenAdminPortal();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: '13.5px'
              }}
            >
              <LayoutDashboard size={18} />
              <span>Admin Management Portal</span>
            </button>
          )}

          {/* Sync Data Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--bg-main)',
              borderRadius: '8px',
              fontSize: '13px',
              marginTop: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={15} color="var(--primary)" />
              <span style={{ fontWeight: 500 }}>Database Sync</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '11px', fontWeight: 600 }}>
              <CheckCircle2 size={13} /> Live
            </div>
          </div>

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <Settings size={18} color="var(--text-secondary)" /> Business Settings
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset all demo data to initial factory defaults?')) {
                StorageService.resetToFactory();
                onClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <RefreshCw size={18} color="var(--text-secondary)" /> Reset Demo Data
          </button>

          <button
            onClick={() => {
              alert('Sales On Field Support: Toll-Free 1800-SALES-ON (Mon-Sat 8 AM - 8 PM)');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <HelpCircle size={18} color="var(--text-secondary)" /> Help & Support
          </button>
        </div>

        {/* Footer Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => {
              StorageService.logout();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--danger)',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <LogOut size={18} /> Logout
          </button>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Sales On Native PWA v1.0.0
          </div>
        </div>
      </div>
    </div>
  );
};
