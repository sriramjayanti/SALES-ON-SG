import React, { useState } from 'react';
import { Store, Plus, Search, MapPin, Phone, ChevronRight, ArrowLeft } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, Shop } from '../../types';

interface MobileShopsListProps {
  currentUser: Employee;
  onOpenShop: (shopId: string) => void;
  onAddNewShop: () => void;
  onBack?: () => void;
}

export const MobileShopsList: React.FC<MobileShopsListProps> = ({
  currentUser,
  onOpenShop,
  onAddNewShop,
  onBack
}) => {
  const db = StorageService.getDb();
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');

  const filteredShops = db.shops.filter((s) => {
    if (s.isDeleted || s.status === 'inactive' || s.active === false) return false;
    const matchesRoute = selectedRoute === 'all' || s.routeId === selectedRoute;
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.shopCode.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase());
    return matchesRoute && matchesSearch;
  });

  return (
    <div className="mobile-app-shell">
      <header className="mobile-app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ padding: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}
              title="Back to Home"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
            Shops Directory
          </h3>
        </div>

        {currentUser.permissions.canAddShop && (
          <button
            onClick={onAddNewShop}
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <Plus size={14} /> Add Shop
          </button>
        )}
      </header>

      <div className="mobile-body-scroll">
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search
            size={16}
            color="var(--text-secondary)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search by store or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px', height: '40px', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* Route Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedRoute('all')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 600,
              background: selectedRoute === 'all' ? 'var(--primary)' : '#FFF',
              color: selectedRoute === 'all' ? '#FFF' : 'var(--text-secondary)',
              border: selectedRoute === 'all' ? 'none' : '1px solid var(--border)'
            }}
          >
            All Routes
          </button>
          {db.routes.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoute(r.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: selectedRoute === r.id ? 'var(--primary)' : '#FFF',
                color: selectedRoute === r.id ? '#FFF' : 'var(--text-secondary)',
                border: selectedRoute === r.id ? 'none' : '1px solid var(--border)'
              }}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* Shops List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredShops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => onOpenShop(shop.id)}
              style={{
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {shop.imageUrl ? (
                  <img
                    src={shop.imageUrl}
                    alt={shop.name}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      border: '1px solid var(--border)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}
                  >
                    <Store size={20} />
                  </div>
                )}
                <div>
                  <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {shop.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {shop.ownerName} • {shop.phone}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {shop.address}
                  </div>
                </div>
              </div>

              <ChevronRight size={18} color="var(--text-secondary)" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
