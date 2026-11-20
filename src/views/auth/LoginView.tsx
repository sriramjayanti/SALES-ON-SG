import React, { useState } from 'react';
import { StorageService } from '../../services/storage';
import { Employee } from '../../types';
import { Lock, Phone, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user?: Employee) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Empty initial inputs - user enters their details
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter both your Phone Number / Login ID and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = StorageService.login(cleanId, cleanPass);
      setIsLoading(false);

      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Invalid credentials. Please verify your phone number and password.');
      }
    }, 250);
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
          maxWidth: '430px',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px -15px rgba(19, 115, 51, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          padding: '36px 30px',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              marginBottom: '12px'
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
              margin: '0 0 6px 0'
            }}
          >
            Varshitha Sales
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Distribution & Route Sales Management System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '11px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 500,
              marginBottom: '20px',
              border: '1px solid #FECACA',
              lineHeight: 1.45
            }}
          >
            {error}
          </div>
        )}

        {/* Single Unified Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px'
              }}
            >
              Phone Number / Login ID
            </label>
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
                placeholder="Enter registered mobile number"
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
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
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
                placeholder="Enter password"
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
              marginTop: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              'Verifying Credentials...'
            ) : (
              <>
                Sign In to Portal <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '26px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}
        >
          <ShieldCheck size={15} color="var(--primary)" />
          <span>Secured with Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};
