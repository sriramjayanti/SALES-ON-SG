import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Maximize2,
  Minimize2,
  Sliders,
  UserCheck,
  RefreshCw,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { Employee } from '../types';

export type ViewMode = 'mobile-frame' | 'mobile-full' | 'admin' | 'auto';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentUser: Employee;
  allUsers: Employee[];
  resolvedMode: 'mobile' | 'admin';
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  currentUser,
  allUsers,
  resolvedMode
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <header className={`global-banner ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Top Banner Main Row */}
      <div className="global-banner-inner">
        {/* Left: Branding & Tagline */}
        <div className="global-banner-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-logo-pill">
              <Sparkles size={14} color="#4ADE80" />
            </div>
            <div>
              <strong style={{ color: '#FFF', fontSize: '13.5px', letterSpacing: '-0.2px' }}>
                Varshitha Sales
              </strong>
              <span className="brand-subtext">Route Sales & Distribution</span>
            </div>
          </div>
          <span className="badge-brand">Live Demo</span>
        </div>

        {/* Center: Device & Auto-Layout View Mode Controls */}
        <div className="view-mode-toggles">
          <button
            className={`view-mode-btn ${viewMode === 'auto' ? 'active' : ''}`}
            onClick={() => setViewMode('auto')}
            title="Auto-detect layout based on your screen size (Mobile on phone, Admin on desktop)"
          >
            <Sliders size={13} />
            <span>Auto Layout</span>
            {viewMode === 'auto' && (
              <span className="mode-sub-pill">{resolvedMode === 'admin' ? 'Desktop' : 'Phone'}</span>
            )}
          </button>

          <button
            className={`view-mode-btn ${viewMode === 'mobile-frame' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile-frame')}
            title="Preview Field Sales App inside a realistic smartphone mockup frame"
          >
            <Smartphone size={13} />
            <span>Phone Frame</span>
          </button>

          <button
            className={`view-mode-btn ${viewMode === 'mobile-full' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile-full')}
            title="Full-width edge-to-edge mobile experience"
          >
            <Maximize2 size={13} />
            <span>Full Width</span>
          </button>

          <button
            className={`view-mode-btn ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={() => setViewMode('admin')}
            title="Desktop Admin Operations & Route Management Portal"
          >
            <Monitor size={13} />
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Right: Role Switcher & Database Reset */}
        <div className="global-banner-right">
          {/* User Switcher */}
          <div className="user-switcher">
            <UserCheck size={13} color="#A2C4BC" />
            <span className="user-switcher-label">User:</span>
            <select
              value={currentUser.id}
              onChange={(e) => StorageService.switchUser(e.target.value)}
              title="Switch between different roles (Sales Executive, Supervisor, Super Admin)"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : u.role === 'supervisor' ? 'Supervisor' : 'Sales Rep'})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Demo Data */}
          <button
            className="header-action-btn"
            onClick={() => {
              if (window.confirm('Reset demo database to fresh factory seed data?')) {
                StorageService.resetToFactory();
              }
            }}
            title="Reset demo data to initial factory state"
          >
            <RefreshCw size={13} />
            <span className="hide-on-mobile">Reset Data</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            className="collapse-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Show Top Bar' : 'Hide Top Bar for cleaner view'}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
    </header>
  );
};
