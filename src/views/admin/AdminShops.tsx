import React, { useState, useRef } from 'react';
import {
  Store,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  User,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  X,
  Users
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Shop, Employee } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';
import { compressImageFile } from '../../utils/imageCompressor';

interface AdminShopsProps {
  currentUser: Employee;
}

export const AdminShops: React.FC<AdminShopsProps> = ({ currentUser }) => {
  const db = StorageService.getDb();
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  // In-app Delete & Restore Confirmation
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [shopToRestore, setShopToRestore] = useState<Shop | null>(null);

  // Form Fields
  const [shopCode, setShopCode] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Andhra Pradesh');
  const [routeId, setRouteId] = useState(db.routes[0]?.id || 'route_a');
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [preferredVisitDate, setPreferredVisitDate] = useState('');
  const [preferredVisitTime, setPreferredVisitTime] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 600, 0.82);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      console.error('Error compressing shop image:', err);
      alert('Could not process the selected image. Please try another.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleAssignedAgent = (empId: string) => {
    setAssignedEmployeeIds((prev) => {
      if (prev.includes(empId)) {
        return prev.filter((id) => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  const openAddShop = () => {
    setEditingShop(null);
    setShopCode(`S${String(db.shops.length + 1).padStart(3, '0')}`);
    setName('');
    setOwnerName('');
    setPhone('+91 ');
    setAlternatePhone('');
    setAddress('');
    setLocality('');
    setCity('');
    setState('Andhra Pradesh');
    setRouteId(db.routes[0]?.id || '');
    setAssignedEmployeeIds(db.employees[0]?.id ? [db.employees[0].id] : []);
    setStatus('active');
    setNotes('');
    setDescription('');
    setPreferredVisitDate('');
    setPreferredVisitTime('');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const openEditShop = (s: Shop) => {
    setEditingShop(s);
    setShopCode(s.shopCode);
    setName(s.name);
    setOwnerName(s.ownerName);
    setPhone(s.phone);
    setAlternatePhone(s.alternatePhone || '');
    setAddress(s.address);
    setLocality(s.locality || '');
    setCity(s.city);
    setState(s.state);
    setRouteId(s.routeId);
    const existingAgents = s.assignedEmployeeIds && s.assignedEmployeeIds.length > 0
      ? s.assignedEmployeeIds
      : (s.assignedEmployeeId ? [s.assignedEmployeeId] : []);
    setAssignedEmployeeIds(existingAgents);
    setStatus(s.status);
    setNotes(s.notes || '');
    setDescription(s.description || '');
    setPreferredVisitDate(s.preferredVisitDate || '');
    setPreferredVisitTime(s.preferredVisitTime || '');
    setImageUrl(s.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return alert('Name and phone are required');

    const primaryAgentId = assignedEmployeeIds[0] || undefined;

    if (editingShop) {
      StorageService.updateShop(editingShop.id, {
        shopCode,
        name,
        ownerName,
        phone,
        alternatePhone,
        address,
        locality,
        city,
        state,
        routeId,
        assignedEmployeeId: primaryAgentId,
        assignedEmployeeIds,
        imageUrl: imageUrl || undefined,
        status,
        notes,
        description,
        preferredVisitDate: preferredVisitDate || undefined,
        preferredVisitTime: preferredVisitTime || undefined
      });
    } else {
      StorageService.addShop({
        shopCode,
        name,
        ownerName,
        phone,
        alternatePhone,
        address,
        locality,
        city,
        state,
        routeId,
        assignedEmployeeId: primaryAgentId,
        assignedEmployeeIds,
        imageUrl: imageUrl || undefined,
        status,
        notes,
        description,
        preferredVisitDate: preferredVisitDate || undefined,
        preferredVisitTime: preferredVisitTime || undefined
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (shopToDelete) {
      StorageService.deleteShop(shopToDelete.id);
      setShopToDelete(null);
    }
  };

  const handleConfirmRestore = () => {
    if (shopToRestore) {
      StorageService.restoreShop(shopToRestore.id);
      setShopToRestore(null);
    }
  };

  const filteredShops = db.shops.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.shopCode.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search);
    const matchesRoute = selectedRoute === 'all' || s.routeId === selectedRoute;
    
    const shopAgents = s.assignedEmployeeIds && s.assignedEmployeeIds.length > 0
      ? s.assignedEmployeeIds
      : (s.assignedEmployeeId ? [s.assignedEmployeeId] : []);

    const matchesEmployee =
      selectedEmployee === 'all'
        ? true
        : selectedEmployee === 'unassigned'
        ? shopAgents.length === 0
        : shopAgents.includes(selectedEmployee);

    const isShopDeleted = s.isDeleted || s.status === 'inactive' || s.active === false;
    const matchesStatus =
      selectedStatus === 'all'
        ? true
        : selectedStatus === 'active'
        ? !isShopDeleted
        : isShopDeleted;

    return matchesSearch && matchesRoute && matchesEmployee && matchesStatus;
  });

  return (
    <div className="table-card">
      {/* Header Toolbar */}
      <div className="table-header-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={15}
              color="var(--text-secondary)"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search shops or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
            <option value="all">All Routes</option>
            {db.routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
            ))}
          </select>

          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
            <option value="all">All Sales Agents</option>
            <option value="unassigned">Unassigned Shops</option>
            {db.employees.filter(e => e.role === 'sales_employee' || e.role === 'admin').map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
            <option value="active">Active Only</option>
            <option value="all">All Shops</option>
            <option value="inactive">Deleted / Inactive</option>
          </select>
        </div>

        <button className="btn-primary" onClick={openAddShop}>
          <Plus size={16} /> Add Retail Shop
        </button>
      </div>

      {/* Retail Store Records Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Store & Photo</th>
            <th>Owner & WhatsApp</th>
            <th>Location</th>
            <th>Route Assignment</th>
            <th>Assigned Agents</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredShops.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                No shops found matching filters ({selectedStatus === 'active' ? 'Active view' : selectedStatus}).
              </td>
            </tr>
          ) : filteredShops.map((shop) => {
            const route = db.routes.find((r) => r.id === shop.routeId);
            const shopAgents = shop.assignedEmployeeIds && shop.assignedEmployeeIds.length > 0
              ? shop.assignedEmployeeIds
              : (shop.assignedEmployeeId ? [shop.assignedEmployeeId] : []);
            const assignedEmps = db.employees.filter((e) => shopAgents.includes(e.id));
            const isShopDeleted = shop.isDeleted || shop.status === 'inactive' || shop.active === false;

            return (
              <tr key={shop.id} style={{ opacity: isShopDeleted ? 0.7 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {shop.imageUrl ? (
                      <img
                        src={shop.imageUrl}
                        alt={shop.name}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-md)',
                          objectFit: 'cover',
                          border: '1px solid var(--border)',
                          flexShrink: 0
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
                          flexShrink: 0
                        }}
                      >
                        <Store size={20} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {shop.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        ID: {shop.shopCode}
                      </div>
                      {shop.preferredVisitDate && (
                        <div style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                          Next Visit: {shop.preferredVisitDate} {shop.preferredVisitTime ? `@ ${shop.preferredVisitTime}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{shop.ownerName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} /> {shop.phone}
                  </div>
                </td>

                <td>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', maxWidth: '200px' }}>
                    {shop.address}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={11} /> {shop.locality ? `${shop.locality}, ` : ''}{shop.city}
                  </div>
                </td>

                <td>
                  {route ? (
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--primary)' }}>
                      {route.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unassigned</span>
                  )}
                </td>

                <td>
                  {assignedEmps.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {assignedEmps.map((emp) => (
                        <span
                          key={emp.id}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <User size={10} /> {emp.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None (Unassigned)</span>
                  )}
                </td>

                <td>
                  <span className={`status-chip ${isShopDeleted ? 'inactive' : 'active'}`}>
                    {isShopDeleted ? 'Deleted (Soft)' : 'Active'}
                  </span>
                </td>

                <td style={{ textAlign: 'right' }}>
                  {/* Action buttons stacked vertically - NOT side by side */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => openEditShop(shop)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'var(--bg-main)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title="Edit Shop Details & Photo"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {isShopDeleted ? (
                      <button
                        onClick={() => setShopToRestore(shop)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: '#e6f4ea',
                          color: '#137333',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                        title="Restore Shop"
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => setShopToDelete(shop)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: 'var(--danger-light)',
                          color: 'var(--danger)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                        title="Delete Shop"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add / Edit Shop Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingShop ? 'Edit Shop & Photo' : 'Add New Retail Shop'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveShop}>Save Shop</button>
          </>
        }
      >
        <form onSubmit={handleSaveShop} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Shop Storefront Photo Upload Section */}
          <div style={{ background: '#FAFDFB', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Shop Storefront Photo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {imageUrl ? (
                <div style={{ position: 'relative', width: '74px', height: '74px' }}>
                  <img
                    src={imageUrl}
                    alt="Shop storefront"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'var(--danger)',
                      color: '#FFF',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Remove Photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFF',
                    border: '2px dashed var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                  }}
                >
                  <ImageIcon size={24} />
                  <span style={{ fontSize: '10px', marginTop: '2px' }}>No Photo</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageFileChange}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={isUploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '7px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={14} />
                  {isUploadingImage ? 'Compressing...' : imageUrl ? 'Change Shop Photo' : 'Upload from Gallery / Camera'}
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Compressed automatically for fast offline loading. Can add or update anytime via Edit Shop.
                </span>
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Shop Code *</label>
              <input
                type="text"
                required
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Shop / Store Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. New Star Mart"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Owner Name *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Gupta"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Phone (WhatsApp) *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Address Line *</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123, Main Bazaar Road"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div className="form-grid-3">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Locality</label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="MG Road"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>City (Optional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder=""
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Andhra Pradesh"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Assigned Route</label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="">-- No Route (Unassigned) --</option>
                {db.routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Multiple Agents Assigned for this Shop (for multiple product lines) */}
          <div style={{ background: '#FAFDFB', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Users size={16} color="var(--primary)" />
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Multiple Assigned Sales Agents (Product Specialization)
              </label>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Assign multiple sales reps to this single shop if different agents service different product categories (e.g., drinks, snacks, dairy).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
              {db.employees
                .filter(e => e.role === 'sales_employee' || e.role === 'admin' || e.role === 'supervisor')
                .map((emp) => {
                  const isChecked = assignedEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
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
                        onChange={() => toggleAssignedAgent(emp.id)}
                      />
                      <span>{emp.name} ({emp.employeeCode})</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Shop Description & Details</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Retail grocery, supermarket, or snacks distributor. Sells FMCG."
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          {/* Owner Requested Visit Appointment (Optional - No Default Time) */}
          <div style={{ background: '#F8FAF9', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
              Owner Requested Next Visit Appointment (Optional)
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              No default time is set. Add date and time ONLY if the shop owner requested an appointment.
            </div>
            <div className="form-grid-2">
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Requested Date</label>
                <input
                  type="date"
                  value={preferredVisitDate}
                  onChange={(e) => setPreferredVisitDate(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600 }}>Requested Time</label>
                <input
                  type="time"
                  value={preferredVisitTime}
                  onChange={(e) => setPreferredVisitTime(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Delivery / Field Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Key landmark near Metro gate"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </form>
      </Modal>

      {/* In-App Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(shopToDelete)}
        title="Delete Shop"
        itemName={shopToDelete?.name}
        message="This shop will be soft-deleted and kept in the database. You can view or restore it anytime from the 'Deleted / Inactive' filter."
        confirmLabel="Soft Delete Shop"
        onConfirm={handleConfirmDelete}
        onClose={() => setShopToDelete(null)}
      />

      {/* In-App Restore Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(shopToRestore)}
        title="Restore Shop"
        itemName={shopToRestore?.name}
        message="This will reactivate this shop and return it to the active stores list."
        confirmLabel="Restore Shop"
        onConfirm={handleConfirmRestore}
        onClose={() => setShopToRestore(null)}
      />
    </div>
  );
};
