import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  ShieldCheck,
  Mail,
  Phone,
  Trash2,
  RotateCcw,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  Tag,
  Check
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Employee, UserRole, UserPermissions } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

export const AdminEmployees: React.FC = () => {
  const db = StorageService.getDb();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // In-App Delete & Restore
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [empToRestore, setEmpToRestore] = useState<Employee | null>(null);

  // Password Reset Modal State
  const [resetModalEmp, setResetModalEmp] = useState<Employee | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Form Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('sales_employee');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [assignedRouteIds, setAssignedRouteIds] = useState<string[]>([]);
  const [assignedCategoryIds, setAssignedCategoryIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddShop: true,
    canEditShop: false,
    canAddCategory: false,
    canAddProduct: false,
    canChangePrice: false,
    canCancelOrder: false,
    canViewTeamOrders: false,
    canManageRoutes: false,
    canManageHolidays: false,
    canManageUsers: false,
    canViewReports: false,
    canExportData: false,
    canViewAuditLogs: false
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'Varshitha@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmployeeCode(`E00${db.employees.length + 1}`);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setRole('sales_employee');
    setStatus('active');
    setAssignedRouteIds(db.routes[0]?.id ? [db.routes[0].id] : []);
    setAssignedCategoryIds([]);
    setPermissions({
      canAddShop: true,
      canEditShop: false,
      canAddCategory: false,
      canAddProduct: false,
      canChangePrice: false,
      canCancelOrder: false,
      canViewTeamOrders: false,
      canManageRoutes: false,
      canManageHolidays: false,
      canManageUsers: false,
      canViewReports: false,
      canExportData: false,
      canViewAuditLogs: false
    });
    setIsModalOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEmployeeCode(emp.employeeCode);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone);
    const digits = (emp.phone || '').replace(/\D/g, '');
    const defaultStaffPass = digits.length >= 5 ? digits.slice(-5) : '';
    setPassword(emp.password || defaultStaffPass || '');
    setShowPassword(false);
    setRole(emp.role);
    setStatus(emp.status);
    setAssignedRouteIds(emp.assignedRouteIds || []);
    setAssignedCategoryIds(emp.assignedCategoryIds || []);
    setPermissions(emp.permissions);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleCategoryAssignment = (catId: string) => {
    setAssignedCategoryIds((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return alert('Name and phone are required');

    const cleanPhone = phone.replace(/\D/g, '');
    const last5 = cleanPhone.length >= 5 ? cleanPhone.slice(-5) : '12345';
    let finalPass = password.trim();
    if (role !== 'super_admin' && role !== 'admin') {
      if (!finalPass || finalPass === 'id@varshitha123') {
        finalPass = last5;
      }
    } else {
      if (!finalPass) {
        finalPass = 'id@varshitha123';
      }
    }

    if (editingEmp) {
      StorageService.updateEmployee(editingEmp.id, {
        employeeCode,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: finalPass,
        role,
        status,
        assignedRouteIds,
        assignedCategoryIds,
        permissions
      });
    } else {
      StorageService.addEmployee({
        employeeCode,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: finalPass,
        role,
        status,
        assignedRouteIds,
        assignedCategoryIds,
        permissions
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (empToDelete) {
      StorageService.deleteEmployee(empToDelete.id);
      setEmpToDelete(null);
    }
  };

  const handleConfirmRestore = () => {
    if (empToRestore) {
      StorageService.restoreEmployee(empToRestore.id);
      setEmpToRestore(null);
    }
  };

  const openResetPasswordModal = (emp: Employee) => {
    setResetModalEmp(emp);
    const digits = (emp.phone || '').replace(/\D/g, '');
    const defaultPass = digits.length >= 5 ? digits.slice(-5) : '12345';
    setResetNewPassword(emp.password || defaultPass);
    setShowResetPassword(true);
  };

  const handleSavePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalEmp) return;
    if (!resetNewPassword.trim()) return alert('Password cannot be empty');

    const success = StorageService.resetEmployeePassword(resetModalEmp.id, resetNewPassword.trim());
    if (success) {
      alert(`Password successfully updated for ${resetModalEmp.name}!\n\nNew Login Credentials:\nPhone/ID: ${resetModalEmp.phone}\nPassword: ${resetNewPassword}`);
      setResetModalEmp(null);
    }
  };

  const filteredEmployees = db.employees.filter((e) => {
    const matchesRole = roleFilter === 'all' || e.role === roleFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search);
    const isEmpDeleted = e.isDeleted || e.status === 'inactive' || e.active === false;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? !isEmpDeleted
        : isEmpDeleted;
    return matchesRole && matchesSearch && matchesStatus;
  });

  return (
    <div className="table-card">
      {/* Toolbar */}
      <div className="table-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employees or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="sales_employee">Sales Executive</option>
            <option value="supervisor">Supervisor / Manager</option>
            <option value="admin">Admin</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="active">Active Only</option>
            <option value="all">All Status</option>
            <option value="inactive">Deleted / Inactive</option>
          </select>
        </div>

        <button className="btn-primary" onClick={openAddEmployee}>
          <Plus size={16} /> Add Employee & Login
        </button>
      </div>

      {/* Staff Roster Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee & Login</th>
            <th>Role</th>
            <th>Assigned Categories</th>
            <th>Assigned Routes</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                No employees found matching filters ({statusFilter === 'active' ? 'Active view' : statusFilter}).
              </td>
            </tr>
          ) : filteredEmployees.map((emp) => {
            const routeNames = (emp.assignedRouteIds || [])
              .map((rid) => db.routes.find((r) => r.id === rid)?.name)
              .filter(Boolean)
              .join(', ');

            const isEmpDeleted = emp.isDeleted || emp.status === 'inactive' || emp.active === false;

            const assignedCats = (emp.assignedCategoryIds || [])
              .map((cid) => db.categories.find((c) => c.id === cid)?.name)
              .filter(Boolean);

            return (
              <tr key={emp.id} style={{ opacity: isEmpDeleted ? 0.7 : 1 }}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Code: {emp.employeeCode}</span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Phone size={10} /> {emp.phone}
                    </span>
                    <span>•</span>
                    <span style={{ background: '#F0FDF4', color: '#15803D', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Pass: {emp.password || (emp.phone ? emp.phone.replace(/\D/g, '').slice(-5) : '—')}
                    </span>
                  </div>
                </td>

                <td>
                  <span style={{ background: '#F1F5F4', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                    {emp.role === 'super_admin' ? 'Super Admin' : emp.role === 'admin' ? 'Admin' : emp.role === 'supervisor' ? 'Manager' : 'Sales Executive'}
                  </span>
                </td>

                <td>
                  {assignedCats.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                      {assignedCats.map((cName, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 600,
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {cName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>All Categories (Full)</span>
                  )}
                </td>

                <td style={{ fontSize: '12.5px' }}>{routeNames || 'None'}</td>

                <td>
                  <span className={`status-chip ${isEmpDeleted ? 'inactive' : 'active'}`}>
                    {isEmpDeleted ? 'Deleted (Soft)' : 'Active'}
                  </span>
                </td>

                <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 10px' }}>
                  {/* Action buttons with generous safety space between actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <button
                      onClick={() => openResetPasswordModal(emp)}
                      style={{
                        minWidth: '92px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        border: '1px solid #C7D2FE',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Reset Employee Password"
                    >
                      <Key size={12} /> Reset Pass
                    </button>

                    <button
                      onClick={() => openEditEmployee(emp)}
                      style={{
                        minWidth: '92px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: '#F0FDF4',
                        color: 'var(--primary)',
                        border: '1.5px solid var(--primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Edit Profile, Categories & RBAC"
                    >
                      <Edit2 size={12} /> Edit Profile
                    </button>

                    {emp.id !== 'emp_admin' && (
                      isEmpDeleted ? (
                        <button
                          onClick={() => setEmpToRestore(emp)}
                          style={{
                            minWidth: '92px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: '#E6F4EA',
                            color: '#137333',
                            border: '1px solid #A7F3D0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Restore Employee"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => setEmpToDelete(emp)}
                          style={{
                            minWidth: '92px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Delete Employee"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add / Edit Employee Modal with Login & Category Assignment */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmp ? `Edit Profile & Login: ${editingEmp.name}` : 'Provision New Employee & Login Account'}
        maxWidth="680px"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveEmployee}>Save Employee & Login</button>
          </>
        }
      >
        <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Employee Code *</label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ravi Kumar"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Login ID / Mobile Phone *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  const digits = val.replace(/\D/g, '');
                  if (role !== 'super_admin' && role !== 'admin' && digits.length >= 5) {
                    setPassword(digits.slice(-5));
                  }
                }}
                placeholder="e.g. 9876543210"
                style={{ width: '100%', marginTop: '4px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Registered mobile phone for user login.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Email Address (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional email address"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Login Password Configuration Box */}
          <div style={{ background: '#FAFDFB', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={15} color="var(--primary)" />
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Login Password Setup
                </label>
              </div>
              {role !== 'super_admin' && role !== 'admin' ? (
                <button
                  type="button"
                  onClick={() => {
                    const digits = phone.replace(/\D/g, '');
                    if (digits.length >= 5) {
                      setPassword(digits.slice(-5));
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} /> Use Last 5 Digits ({phone.replace(/\D/g, '').slice(-5) || 'XXXXX'})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPassword('id@varshitha123')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={12} /> Set Default Admin Pass
                </button>
              )}
            </div>

            <div style={{ position: 'relative', marginTop: '4px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === 'super_admin' || role === 'admin' ? 'Enter strong admin password' : 'Last 5 digits of phone number'}
                style={{ width: '100%', paddingRight: '40px' }}
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
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              {role === 'super_admin' || role === 'admin'
                ? 'Admin login uses strong password (default: id@varshitha123).'
                : 'Staff agents log in using their phone number and the last 5 digits of their phone number.'}
            </span>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Role Assignment</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setRole(newRole);
                  if (newRole !== 'super_admin' && newRole !== 'admin') {
                    const digits = phone.replace(/\D/g, '');
                    if (digits.length >= 5) {
                      setPassword(digits.slice(-5));
                    }
                  } else {
                    if (!password || password.length === 5) {
                      setPassword('id@varshitha123');
                    }
                  }
                }}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="sales_employee">Sales Executive (Field Rep)</option>
                <option value="supervisor">Supervisor / Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Account Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Suspended</option>
              </select>
            </div>
          </div>

          {/* Assigned Product Categories (Field App Product Line Restriction) */}
          <div style={{ background: '#FAFDFB', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Tag size={15} color="var(--primary)" />
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Assigned Product Categories (Mobile Catalog Filter)
              </label>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              When assigned, this sales agent will <strong>ONLY see products</strong> belonging to these categories in their mobile field app. If none are selected, all product lines are shown.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
              {db.categories
                .filter(c => !c.isDeleted && c.status !== 'inactive' && c.active !== false)
                .map((cat) => {
                  const isChecked = assignedCategoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: isChecked ? 'var(--primary-light)' : '#FFF',
                        border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: isChecked ? 600 : 400
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategoryAssignment(cat.id)}
                      />
                      <span>{cat.name} ({cat.code})</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Assigned Routes</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {db.routes.map((r) => {
                const isAssigned = assignedRouteIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (isAssigned) {
                        setAssignedRouteIds(assignedRouteIds.filter((id) => id !== r.id));
                      } else {
                        setAssignedRouteIds([...assignedRouteIds, r.id]);
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: isAssigned ? 'var(--primary)' : 'var(--bg-main)',
                      color: isAssigned ? '#FFF' : 'var(--text-secondary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Permission Checkboxes */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)' }}>
              Granular Permission Flags (RBAC):
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canAddShop}
                  onChange={() => handleTogglePermission('canAddShop')}
                />
                <span>canAddShop (Onboard from field)</span>
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canEditShop}
                  onChange={() => handleTogglePermission('canEditShop')}
                />
                <span>canEditShop</span>
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canAddProduct}
                  onChange={() => handleTogglePermission('canAddProduct')}
                />
                <span>canAddProduct</span>
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canChangePrice}
                  onChange={() => handleTogglePermission('canChangePrice')}
                />
                <span>canChangePrice</span>
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canCancelOrder}
                  onChange={() => handleTogglePermission('canCancelOrder')}
                />
                <span>canCancelOrder</span>
              </label>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.canViewReports}
                  onChange={() => handleTogglePermission('canViewReports')}
                />
                <span>canViewReports</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={Boolean(resetModalEmp)}
        onClose={() => setResetModalEmp(null)}
        title={`Reset Password: ${resetModalEmp?.name}`}
        maxWidth="460px"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setResetModalEmp(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSavePasswordReset}>Update Password</button>
          </>
        }
      >
        <form onSubmit={handleSavePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Reset login credentials for <strong>{resetModalEmp?.name}</strong> (Login ID: <code>{resetModalEmp?.phone}</code>).
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>New Password *</label>
              <button
                type="button"
                onClick={() => {
                  const digits = (resetModalEmp?.phone || '').replace(/\D/g, '');
                  setResetNewPassword(digits.length >= 5 ? digits.slice(-5) : '12345');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={12} /> Set to Last 5 Digits
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* In-App Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(empToDelete)}
        title="Delete Employee"
        itemName={empToDelete?.name}
        message="This employee will be soft-deleted and kept in the database as inactive. You can restore their account at any time from the 'Deleted / Inactive' filter."
        confirmLabel="Soft Delete Employee"
        onConfirm={handleConfirmDelete}
        onClose={() => setEmpToDelete(null)}
      />

      {/* In-App Restore Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(empToRestore)}
        title="Restore Employee"
        itemName={empToRestore?.name}
        message="This will reactivate this employee's account and restore their access permissions."
        confirmLabel="Restore Employee"
        onConfirm={handleConfirmRestore}
        onClose={() => setEmpToRestore(null)}
      />
    </div>
  );
};
