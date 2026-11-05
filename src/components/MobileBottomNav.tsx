import React from 'react';
import { Home, MapPin, FileText, Store, User } from 'lucide-react';

export type MobileTab = 'home' | 'route' | 'orders' | 'shops' | 'profile';

interface MobileBottomNavProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  cartCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onTabChange,
  cartCount = 0
}) => {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'route', label: 'Route', icon: <MapPin size={20} /> },
    { id: 'orders', label: 'Orders', icon: <FileText size={20} />, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'shops', label: 'Shops', icon: <Store size={20} /> },
    { id: 'profile', label: 'Profile', icon: <User size={20} /> }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div style={{ position: 'relative' }}>
              {tab.icon}
              {tab.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    background: '#EF4444',
                    color: '#FFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '1px 5px',
                    lineHeight: '1.2'
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
