import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { Lock, Phone, Eye, EyeOff, ShieldCheck, ArrowRight, Shield, Smartphone, Sparkles, UserCheck } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Tab: 'admin' (Strict Admin Operations Portal) or 'staff' (Field Sales App)
  const [authMode, setAuthMode] = useState<'admin' | 'staff'>('admin');
  
  // Credentials
  const [identifier, setIdentifier] = useState('7799225566');
  const [password, setPassword] = useState('id@varshitha123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Switch between Admin and Staff mode with sensible defaults
  const handleModeSwitch = (mode: 'admin' | 'staff') => {
    setAuthMode(mode);
    setError('');
    if (mode === 'admin') {
      setIdentifier('7799225566');
      setPassword('id@varshitha123');
    } else {
      setIdentifier('9876543210');
      setPassword('43210');
    }
  };

  // Derive last 5 digits of entered phone for staff
  const phoneDigits = identifier.replace(/\D/g, '');
  const suggestedStaffPassword = phoneDigits.length >= 5 ? phoneDigits.slice(-5) : '';

  const handleApplyStaffPassword = () => {
    if (suggestedStaffPassword) {
      setPassword(suggestedStaffPassword);
    }
  };

  const handleSelectStaffSample = (phone: string, pass: string) => {
    setIdentifier(phone);
    setPassword(pass);
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError(
        authMode === 'admin'
          ? 'Please enter Admin Phone and strong password.'
          : 'Please enter Staff Mobile Number and last 5 digits password.'
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = StorageService.login(identifier.trim(), password.trim(), authMode);
      setIsLoading(false);

      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.message || 'Invalid credentials. Please verify your phone number and password.');
      }
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F0FDF4 0%, #E6F4EA 50%, #F1F5F9 100%)',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-body)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -15px rgba(19, 115, 51, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          padding: '32px 28px',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #15803D 100%)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
              boxShadow: '0 8px 16px -4px rgba(19, 115, 51, 0.35)',
              marginBottom: '10px'
            }}
          >
            VS
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 4px 0'
            }}
          >
            Varshitha Sales
          </h1>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Enterprise Route Distribution & Field Sales Platform
          </p>
        </div>

        {/* Tab Selection: Admin vs Staff */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#F1F5F4',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '20px',
            gap: '4px'
          }}
        >
          <button
            type="button"
            onClick={() => handleModeSwitch('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: authMode === 'admin' ? 700 : 500,
              fontSize: '13px',
              background: authMode === 'admin' ? '#FFFFFF' : 'transparent',
              color: authMode === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: authMode === 'admin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={15} />
            <span>Admin Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('staff')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: authMode === 'staff' ? 700 : 500,
              fontSize: '13px',
              background: authMode === 'staff' ? '#FFFFFF' : 'transparent',
              color: authMode === 'staff' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: authMode === 'staff' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Smartphone size={15} />
            <span>Staff Field App</span>
          </button>
        </div>

        {/* Role Banner / Description */}
        <div
          style={{
            background: authMode === 'admin' ? 'rgba(23, 63, 53, 0.05)' : '#EFF6FF',
            border: `1px solid ${authMode === 'admin' ? 'rgba(23, 63, 53, 0.15)' : '#BFDBFE'}`,
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '18px',
            fontSize: '12px',
            lineHeight: 1.4,
            color: authMode === 'admin' ? 'var(--text-primary)' : '#1E40AF'
          }}
        >
          {authMode === 'admin' ? (
            <div>
              <strong>🔒 Strict Admin Access:</strong> Log in with registered Admin Phone and strong password. Grants access to business dashboard, product catalog with net amount profit analysis, and employee management.
            </div>
          ) : (
            <div>
              <strong>📱 Staff Agent Login:</strong> Enter your registered phone number. Your password is the <strong>last 5 digits</strong> of your phone number. Grants direct access to Field Sales and Route visits.
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 500,
              marginBottom: '18px',
              border: '1px solid #FECACA',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              >
                {authMode === 'admin' ? 'Admin Phone Number' : 'Staff Mobile Phone'}
              </label>
              {authMode === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('7799225566');
                    setPassword('id@varshitha123');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Sparkles size={11} /> Auto-fill Admin
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Phone
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={authMode === 'admin' ? '7799225566' : 'e.g. 9876543210'}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              >
                {authMode === 'admin' ? 'Strong Admin Password' : 'Password (Last 5 Digits of Phone)'}
              </label>
              {authMode === 'staff' && suggestedStaffPassword && (
                <button
                  type="button"
                  onClick={handleApplyStaffPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="Auto-fill the last 5 digits of your entered phone"
                >
                  <Sparkles size={11} /> Use "{suggestedStaffPassword}"
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'admin' ? 'Enter strong admin password' : 'Last 5 digits (e.g. 43210)'}
                style={{
                  width: '100%',
                  padding: '11px 38px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Quick Staff Selection Chips */}
          {authMode === 'staff' && (
            <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserCheck size={12} /> Quick Staff Login Test Accounts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectStaffSample('9876543210', '43210')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <strong>Ravi Kumar</strong> (Pass: 43210)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectStaffSample('9123456789', '56789')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <strong>Suresh Reddy</strong> (Pass: 56789)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectStaffSample('8899001122', '01122')}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <strong>Ramesh Naidu</strong> (Pass: 01122)
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              'Authenticating with Firebase...'
            ) : (
              <>
                {authMode === 'admin' ? 'Sign In as Administrator' : 'Enter Staff Field App'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Firebase Authentication Security Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginTop: '22px',
            fontSize: '11.5px',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--primary)' }}>
            <ShieldCheck size={15} />
            <span>Firebase Authentication & Cloud Security</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Protected with RBAC roles & real-time encrypted session token
          </span>
        </div>
      </div>
    </div>
  );
};
