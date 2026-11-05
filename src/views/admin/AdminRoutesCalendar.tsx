import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  Store,
  Clock,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Trash2,
  Edit2,
  Route as RouteIcon,
  Check,
  RotateCcw
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Route, Shop, Holiday, Employee } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

export const AdminRoutesCalendar: React.FC = () => {
  const db = StorageService.getDb();
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'routes'>('routes');
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const todayDateStr = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(db.routes[0]?.id || '');

  // In-App Deletion & Restoration Modals
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [routeToRestore, setRouteToRestore] = useState<Route | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [holidayToRestore, setHolidayToRestore] = useState<Holiday | null>(null);

  // Holiday Modals
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayDate, setHolidayDate] = useState(todayDateStr);
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayType, setHolidayType] = useState<Holiday['type']>('public');

  // Assign Route Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignRouteId, setAssignRouteId] = useState(db.routes[0]?.id || '');
  const [assignEmpId, setAssignEmpId] = useState(db.employees[0]?.id || '');
  const [routeStatusFilter, setRouteStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // CREATE / EDIT CUSTOM ROUTE MODAL
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [customRouteName, setCustomRouteName] = useState('');
  const [customRouteCode, setCustomRouteCode] = useState('');
  const [customRouteArea, setCustomRouteArea] = useState('');
  const [customAssignedEmpIds, setCustomAssignedEmpIds] = useState<string[]>(db.employees[0]?.id ? [db.employees[0].id] : []);
  const [selectedShopIdsForRoute, setSelectedShopIdsForRoute] = useState<string[]>([]);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  const filteredRoutes = db.routes.filter((route) => {
    const isRouteDeleted = route.isDeleted || route.active === false;
    if (routeStatusFilter === 'active') return !isRouteDeleted;
    if (routeStatusFilter === 'inactive') return isRouteDeleted;
    return true;
  });

  const activeRoute = db.routes.find((r) => r.id === selectedRouteId) || db.routes[0];
  const activeRouteEmpIds = activeRoute?.assignedEmployeeIds && activeRoute.assignedEmployeeIds.length > 0
    ? activeRoute.assignedEmployeeIds
    : activeRoute?.assignedEmployeeId ? [activeRoute.assignedEmployeeId] : [];
  const activeRouteTeam = db.employees.filter((e) => activeRouteEmpIds.includes(e.id));
  const assignedEmployee = activeRouteTeam[0] || db.employees.find((e) => e.id === activeRoute?.assignedEmployeeId);

  // Ordered shops in route
  const routeShops: Shop[] = (activeRoute?.orderedShopIds || [])
    .map((sid) => db.shops.find((s) => s.id === sid))
    .filter(Boolean) as Shop[];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const monthDays = Array.from({ length: daysInMonthCount }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const holiday = db.holidays.find((h) => h.dateString === dateStr && !h.isDeleted && h.active !== false);
    return {
      day: dayNum,
      dateStr,
      isHoliday: Boolean(holiday),
      holidayTitle: holiday?.title
    };
  });

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCreateHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayTitle.trim()) return;
    StorageService.addHoliday(holidayDate, holidayTitle.trim(), holidayType);
    setHolidayTitle('');
    setIsHolidayModalOpen(false);
  };

  const handleAssignRoute = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateRoute(assignRouteId, { assignedEmployeeId: assignEmpId });
    setIsAssignModalOpen(false);
  };

  // Open Create Route Modal
  const openCreateRoute = () => {
    setEditingRoute(null);
    setCustomRouteName('');
    setCustomRouteCode(`R-${String.fromCharCode(65 + db.routes.length)}`);
    setCustomRouteArea('');
    setCustomAssignedEmpIds([db.employees[0]?.id || '']);
    setSelectedShopIdsForRoute([]);
    setSelectedWeekdays([1, 2, 3, 4, 5, 6]);
    setIsRouteModalOpen(true);
  };

  const openEditRoute = (r: Route) => {
    setEditingRoute(r);
    setCustomRouteName(r.name);
    setCustomRouteCode(r.code);
    setCustomRouteArea(r.area);
    const existingEmpIds = r.assignedEmployeeIds && r.assignedEmployeeIds.length > 0
      ? r.assignedEmployeeIds
      : r.assignedEmployeeId ? [r.assignedEmployeeId] : [db.employees[0]?.id || ''];
    setCustomAssignedEmpIds(existingEmpIds);
    setSelectedShopIdsForRoute([...r.orderedShopIds]);
    setSelectedWeekdays(r.defaultWeekdays || [1, 2, 3, 4, 5, 6]);
    setIsRouteModalOpen(true);
  };

  const handleSaveCustomRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRouteName.trim()) return alert('Please enter a customized route name');

    const primaryEmpId = customAssignedEmpIds[0] || '';

    if (editingRoute) {
      StorageService.updateRoute(editingRoute.id, {
        name: customRouteName.trim(),
        code: customRouteCode.trim() || customRouteName.slice(0, 4).toUpperCase(),
        area: customRouteArea.trim(),
        assignedEmployeeId: primaryEmpId,
        assignedEmployeeIds: customAssignedEmpIds,
        orderedShopIds: selectedShopIdsForRoute,
        defaultWeekdays: selectedWeekdays
      });
    } else {
      StorageService.addRoute({
        name: customRouteName.trim(),
        code: customRouteCode.trim() || customRouteName.slice(0, 4).toUpperCase(),
        area: customRouteArea.trim(),
        assignedEmployeeId: primaryEmpId,
        assignedEmployeeIds: customAssignedEmpIds,
        orderedShopIds: selectedShopIdsForRoute,
        defaultWeekdays: selectedWeekdays,
        active: true
      });
    }

    setIsRouteModalOpen(false);
  };

  const toggleShopInRoute = (shopId: string) => {
    setSelectedShopIdsForRoute((prev) => {
      if (prev.includes(shopId)) {
        return prev.filter((id) => id !== shopId);
      } else {
        return [...prev, shopId];
      }
    });
  };

  return (
    <div>
      {/* Sub-tabs: Route Master vs Monthly Calendar */}
      <div className="subtab-scroll-container">
        <button
          onClick={() => setActiveSubTab('routes')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: '14px',
            color: activeSubTab === 'routes' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'routes' ? '3px solid var(--primary)' : '3px solid transparent'
          }}
        >
          Custom Routes Master ({db.routes.length})
        </button>

        <button
          onClick={() => setActiveSubTab('calendar')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: '14px',
            color: activeSubTab === 'calendar' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'calendar' ? '3px solid var(--primary)' : '3px solid transparent'
          }}
        >
          Calendar & Daily Scheduling
        </button>
      </div>

      {activeSubTab === 'routes' ? (
        /* CUSTOM ROUTE MANAGEMENT TABLE */
        <div className="table-card">
          <div className="table-header-toolbar">
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>
                Delivery Routes Management
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Create and organize custom sales routes with specific store assignments
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={routeStatusFilter}
                onChange={(e) => setRouteStatusFilter(e.target.value as any)}
                style={{ fontSize: '13px' }}
              >
                <option value="all">All Routes</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deleted / Inactive</option>
              </select>

              <button className="btn-primary" onClick={openCreateRoute}>
                <Plus size={16} /> Create Custom Route
              </button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Route Code</th>
                <th>Customized Route Name</th>
                <th>Area / Locality</th>
                <th>Assigned Sales Team</th>
                <th>Shops Count</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => {
                const assignedAgents = (route.assignedEmployeeIds && route.assignedEmployeeIds.length > 0
                  ? route.assignedEmployeeIds
                  : route.assignedEmployeeId ? [route.assignedEmployeeId] : []
                ).map((id) => db.employees.find((e) => e.id === id)).filter(Boolean) as Employee[];

                const isRouteDeleted = route.isDeleted || route.active === false;

                return (
                  <tr key={route.id}>
                    <td>
                      <span className="badge-brand">{route.code}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>
                        {route.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{route.area}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {assignedAgents.length > 0 ? (
                          assignedAgents.map((agent) => (
                            <span
                              key={agent.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: '#F1F5F4',
                                color: 'var(--primary)',
                                padding: '3px 7px',
                                borderRadius: '4px'
                              }}
                            >
                              <User size={11} /> {agent.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                        {route.orderedShopIds.length} Shops
                      </span>
                    </td>
                    <td>
                      <span className={`status-chip ${isRouteDeleted ? 'inactive' : 'active'}`}>
                        {isRouteDeleted ? 'Deleted (Soft)' : 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => openEditRoute(route)}
                          style={{ padding: '6px 12px', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--primary)', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit2 size={13} /> Edit Route
                        </button>
                        {isRouteDeleted ? (
                          <button
                            onClick={() => setRouteToRestore(route)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '4px',
                              background: '#e6f4ea',
                              color: '#137333',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Restore Route"
                          >
                            <RotateCcw size={13} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => setRouteToDelete(route)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '4px',
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            title="Delete Route (Soft Delete)"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* CALENDAR & SCHEDULING VIEW (Showcase Screen 10) */
        <div className="admin-grid-2-1">
          {/* Left Column: Interactive Month Calendar */}
          <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={handlePrevMonth}
                    style={{ padding: '6px', borderRadius: '4px', background: 'var(--bg-main)', cursor: 'pointer' }}
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    style={{ padding: '6px', borderRadius: '4px', background: 'var(--bg-main)', cursor: 'pointer' }}
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700 }}>
                  {monthNames[currentMonth]} {currentYear}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setIsHolidayModalOpen(true)}>
                  <CalendarIcon size={14} /> Set Holiday
                </button>
                <button className="btn-primary" onClick={() => setIsAssignModalOpen(true)}>
                  <Plus size={14} /> Assign Route
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Day Tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-start-${idx}`} />
              ))}

              {monthDays.map((d) => {
                const isSelected = selectedDate === d.dateStr;

                return (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDate(d.dateStr)}
                    style={{
                      height: '52px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-light)' : '#FFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                      {d.day}
                    </span>

                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: d.isHoliday ? 'var(--danger)' : 'var(--success)',
                        marginTop: '3px'
                      }}
                      title={d.isHoliday ? d.holidayTitle : 'Working Day'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Color Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                Working Day
              </span>

              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
                Holiday ({db.holidays.length})
              </span>

              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }} />
                Special Event
              </span>
            </div>

            {/* Configured Company Holidays List with Delete / Restore */}
            {db.holidays.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Configured Company Holidays:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {db.holidays.map((h) => {
                    const isHolidayDeleted = h.isDeleted || h.active === false;
                    return (
                      <div
                        key={h.id}
                        style={{
                          background: isHolidayDeleted ? '#f1f5f9' : 'var(--danger-light)',
                          color: isHolidayDeleted ? '#64748b' : 'var(--danger)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{h.title} ({h.dateString}){isHolidayDeleted ? ' [Deleted]' : ''}</span>
                        {isHolidayDeleted ? (
                          <button
                            onClick={() => setHolidayToRestore(h)}
                            style={{ color: '#137333', padding: 0, cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex' }}
                            title="Restore Holiday"
                          >
                            <RotateCcw size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setHolidayToDelete(h)}
                            style={{ color: 'var(--danger)', padding: 0, cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex' }}
                            title="Delete Holiday (Soft Delete)"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Route Details & Ordered Sequence */}
          <div style={{ background: '#FFF', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            {activeRoute ? (
              <>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Route Details
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {selectedDate}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <select
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                  style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '15px' }}
                >
                  {db.routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <span className="status-chip active" style={{ fontSize: '11px' }}>Active</span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <User size={13} />
                <span>Team ({activeRouteTeam.length} Reps):</span>
                {activeRouteTeam.map((emp) => (
                  <span key={emp.id} style={{ background: '#F1F5F4', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>
                    {emp.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Ordered Shops Sequence */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ordered Shops ({routeShops.length})
                </div>
                {activeRouteTeam.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      StorageService.rebalanceRouteShops(activeRoute.id, activeRouteTeam.map((e) => e.id));
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'var(--primary-light)',
                      border: '1px solid #A7F3D0',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      cursor: 'pointer'
                    }}
                    title="Evenly distribute shops across all assigned agents in this route"
                  >
                    ⚡ Auto-Distribute Shops
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {routeShops.map((shop, idx) => (
                  <div
                    key={shop.id}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {idx + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {shop.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px', flexWrap: 'wrap', gap: '4px' }}>
                        <span>ID: {shop.shopCode} • {shop.ownerName}</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>Agent:</span>
                          <select
                            value={shop.assignedEmployeeId || ''}
                            onChange={(e) => {
                              StorageService.assignShopToAgent(shop.id, e.target.value);
                            }}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)',
                              background: '#FFF',
                              fontWeight: 600,
                              color: shop.assignedEmployeeId ? 'var(--primary)' : 'var(--text-secondary)'
                            }}
                          >
                            <option value="">Unassigned</option>
                            {activeRouteTeam.map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
            <RouteIcon size={32} color="var(--primary)" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              No Delivery Routes Found
            </div>
            <div style={{ fontSize: '12.5px', marginBottom: '16px' }}>
              Create your first route to configure schedules and map stores.
            </div>
            <button className="btn-primary" onClick={openCreateRoute} style={{ margin: '0 auto' }}>
              <Plus size={15} /> Create First Route
            </button>
          </div>
        )}
      </div>
    </div>
  )}

      {/* CREATE / EDIT CUSTOM ROUTE MODAL */}
      <Modal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        title={editingRoute ? `Edit Route: ${editingRoute.name}` : 'Create Custom Route'}
        maxWidth="640px"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsRouteModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveCustomRoute}>Save Route</button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomRoute} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Customized Route Name *</label>
              <input
                type="text"
                required
                value={customRouteName}
                onChange={(e) => setCustomRouteName(e.target.value)}
                placeholder="e.g. Ring Road Van Express Route"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Route Code *</label>
              <input
                type="text"
                required
                value={customRouteCode}
                onChange={(e) => setCustomRouteCode(e.target.value)}
                placeholder="e.g. R-RR"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Area / Territory Description</label>
              <input
                type="text"
                value={customRouteArea}
                onChange={(e) => setCustomRouteArea(e.target.value)}
                placeholder="e.g. Surat West / Adajan"
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600 }}>
                Assigned Sales Team ({customAssignedEmpIds.length} Reps)
              </label>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Select multiple agents to share the route workload
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {db.employees.map((emp) => {
                  const isSelected = customAssignedEmpIds.includes(emp.id);
                  return (
                    <button
                      type="button"
                      key={emp.id}
                      onClick={() => {
                        setCustomAssignedEmpIds((prev) =>
                          prev.includes(emp.id)
                            ? (prev.length > 1 ? prev.filter((id) => id !== emp.id) : prev)
                            : [...prev, emp.id]
                        );
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '16px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--primary-light)' : '#FFF',
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)'
                      }}
                    >
                      <User size={12} />
                      <span>{emp.name}</span>
                      {isSelected && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shop Selection Checkboxes */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span>Assign Shops to this Route ({selectedShopIdsForRoute.length} selected)</span>
              <span style={{ fontSize: '11px', color: 'var(--primary)' }}>Click to toggle</span>
            </label>

            <div
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              {db.shops.map((shop) => {
                const isSelected = selectedShopIdsForRoute.includes(shop.id);

                return (
                  <div
                    key={shop.id}
                    onClick={() => toggleShopInRoute(shop.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-main)',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #A7F3D0' : '1px solid transparent'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {shop.name}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        ID: {shop.shopCode} • {shop.ownerName}
                      </span>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        background: isSelected ? 'var(--primary)' : '#FFF',
                        border: isSelected ? 'none' : '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF'
                      }}
                    >
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      {/* Set Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Declare Calendar Holiday"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsHolidayModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreateHoliday}>Save Holiday</button>
          </>
        }
      >
        <form onSubmit={handleCreateHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Holiday Date *</label>
            <input
              type="date"
              required
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Holiday Title *</label>
            <input
              type="text"
              required
              value={holidayTitle}
              onChange={(e) => setHolidayTitle(e.target.value)}
              placeholder="e.g. Labour Day"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Holiday Type</label>
            <select
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as any)}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="public">Public Holiday</option>
              <option value="festival">Festival</option>
              <option value="company">Company Off</option>
              <option value="emergency">Emergency Closure</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Assign Route Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Route to Employee"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAssignRoute}>Save Assignment</button>
          </>
        }
      >
        <form onSubmit={handleAssignRoute} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Select Route</label>
            <select
              value={assignRouteId}
              onChange={(e) => setAssignRouteId(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {db.routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Assign to Sales Employee</label>
            <select
              value={assignEmpId}
              onChange={(e) => setAssignEmpId(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            >
              {db.employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.employeeCode})</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* In-App Route & Holiday Deletion Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(routeToDelete)}
        title="Delete Route"
        itemName={routeToDelete?.name}
        message="This route will be soft-deleted. Assigned shops will remain safe in the database. You can restore this route at any time."
        confirmLabel="Soft Delete Route"
        onConfirm={() => {
          if (routeToDelete) {
            StorageService.deleteRoute(routeToDelete.id);
            setRouteToDelete(null);
          }
        }}
        onClose={() => setRouteToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(routeToRestore)}
        title="Restore Route"
        itemName={routeToRestore?.name}
        message="This will reactivate this delivery route and bring it back to active routes."
        confirmLabel="Restore Route"
        onConfirm={() => {
          if (routeToRestore) {
            StorageService.restoreRoute(routeToRestore.id);
            setRouteToRestore(null);
          }
        }}
        onClose={() => setRouteToRestore(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(holidayToDelete)}
        title="Delete Holiday"
        itemName={holidayToDelete?.title}
        message="This holiday will be soft-deleted and removed from the active calendar."
        confirmLabel="Delete Holiday"
        onConfirm={() => {
          if (holidayToDelete) {
            StorageService.deleteHoliday(holidayToDelete.id);
            setHolidayToDelete(null);
          }
        }}
        onClose={() => setHolidayToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(holidayToRestore)}
        title="Restore Holiday"
        itemName={holidayToRestore?.title}
        message="This will reactivate this holiday on the calendar."
        confirmLabel="Restore Holiday"
        onConfirm={() => {
          if (holidayToRestore) {
            StorageService.restoreHoliday(holidayToRestore.id);
            setHolidayToRestore(null);
          }
        }}
        onClose={() => setHolidayToRestore(null)}
      />
    </div>
  );
};
