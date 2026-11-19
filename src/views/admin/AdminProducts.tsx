import React, { useState, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle2,
  Filter,
  Tag,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  X,
  AlertTriangle,
  Calendar,
  Zap,
  TrendingUp,
  Shield
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Product, Category, Employee } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal';

const PRESET_UNITS = ['Bottle', 'Jar', 'Pack', 'Box', 'Piece', 'Can', 'Pouch', 'Kg'];

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface AdminProductsProps {
  currentUser: Employee;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({ currentUser }) => {
  const db = StorageService.getDb();
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories'>('products');
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('active');

  // In-App Deletion & Restoration State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToRestore, setProductToRestore] = useState<Product | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [catToRestore, setCatToRestore] = useState<Category | null>(null);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState(db.categories[0]?.id || '');
  const [unit, setUnit] = useState('Bottle');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('Bottle');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [stock, setStock] = useState<string>(''); // Quantity available (No default stock!)
  const [expiryDate, setExpiryDate] = useState<string>(''); // Optional expiry date
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('15');
  const [sellPrice, setSellPrice] = useState(40);
  const [mrp, setMrp] = useState(40);
  const [netAmount, setNetAmount] = useState<string>(''); // Net Cost / Purchase Price (Admin Only)
  const [taxRate, setTaxRate] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);

  // Filter by stock
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  // Quick Stock Adjustment Modal State (Admin can update stock anytime)
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockInput, setQuickStockInput] = useState<string>('');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    try {
      setIsUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      console.error('Error reading image file:', err);
      alert('Could not process the selected image. Please try another.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setCategoryId(db.categories[0]?.id || '');
    setUnit('Bottle');
    setSelectedUnitType('Bottle');
    setCustomUnit('');
    setStock(''); // strictly empty string, NO default stock!
    setExpiryDate('');
    setLowStockThreshold('15');
    setSellPrice(40);
    setMrp(40);
    setNetAmount('');
    setTaxRate(0);
    setImageUrl('');
    setShowUrlInput(false);
    setActive(true);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.categoryId);
    setUnit(p.unit);
    if (PRESET_UNITS.includes(p.unit)) {
      setSelectedUnitType(p.unit);
      setCustomUnit('');
    } else {
      setSelectedUnitType('custom');
      setCustomUnit(p.unit || '');
    }
    setStock(p.stock !== undefined ? String(p.stock) : '');
    setExpiryDate(p.expiryDate || '');
    setLowStockThreshold(String(p.lowStockThreshold || 15));
    setSellPrice(p.sellPrice);
    setMrp(p.mrp);
    setNetAmount(p.netAmount !== undefined ? String(p.netAmount) : '');
    setTaxRate(p.taxRate);
    setImageUrl(p.imageUrl || '');
    setShowUrlInput(Boolean(p.imageUrl && !p.imageUrl.startsWith('data:')));
    setActive(p.active);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Product name is required');
    if (stock.trim() === '' || isNaN(Number(stock)) || Number(stock) < 0) {
      return alert('Please enter the available stock quantity (must be 0 or higher).');
    }

    const finalUnit = selectedUnitType === 'custom' ? (customUnit.trim() || 'Unit') : selectedUnitType;
    const parsedNet = netAmount.trim() !== '' && !isNaN(Number(netAmount)) ? Number(netAmount) : undefined;

    if (editingProduct) {
      StorageService.updateProduct(editingProduct.id, {
        name,
        sku,
        categoryId,
        unit: finalUnit,
        stock: Number(stock),
        expiryDate: expiryDate.trim() || undefined,
        lowStockThreshold: Number(lowStockThreshold) || 15,
        sellPrice: Number(sellPrice),
        mrp: Number(mrp),
        netAmount: parsedNet,
        taxRate: Number(taxRate),
        imageUrl,
        active
      });
    } else {
      StorageService.addProduct({
        name,
        sku,
        categoryId,
        unit: finalUnit,
        stock: Number(stock),
        expiryDate: expiryDate.trim() || undefined,
        lowStockThreshold: Number(lowStockThreshold) || 15,
        sellPrice: Number(sellPrice),
        mrp: Number(mrp),
        netAmount: parsedNet,
        taxRate: Number(taxRate),
        imageUrl,
        active
      });
    }
    setIsProductModalOpen(false);
  };

  const handleQuickStockSave = () => {
    if (!quickStockProduct) return;
    const parsed = Number(quickStockInput);
    if (quickStockInput.trim() === '' || isNaN(parsed) || parsed < 0) {
      return alert('Please enter a valid stock quantity (0 or higher).');
    }
    StorageService.updateProductStock(quickStockProduct.id, parsed);
    setQuickStockProduct(null);
  };

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      StorageService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleConfirmRestoreProduct = () => {
    if (productToRestore) {
      StorageService.restoreProduct(productToRestore.id);
      setProductToRestore(null);
    }
  };

  const handleConfirmDeleteCat = () => {
    if (catToDelete) {
      StorageService.deleteCategory(catToDelete.id);
      setCatToDelete(null);
    }
  };

  const handleConfirmRestoreCat = () => {
    if (catToRestore) {
      StorageService.restoreCategory(catToRestore.id);
      setCatToRestore(null);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    StorageService.addCategory(newCatName.trim(), newCatCode.trim() || newCatName.slice(0, 3).toUpperCase());
    setNewCatName('');
    setNewCatCode('');
    setIsCatModalOpen(false);
  };

  // Low stock products list
  const lowStockProductsList = db.products.filter(
    (p) => !p.isDeleted && p.active && (p.stock !== undefined && p.stock <= (p.lowStockThreshold || 15))
  );

  // Filter products
  const filteredProducts = db.products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || p.categoryId === selectedCat;
    const isSoftDeleted = p.isDeleted || !p.active;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && !isSoftDeleted) ||
      (selectedStatus === 'inactive' && isSoftDeleted);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low_stock' && (p.stock !== undefined && p.stock <= (p.lowStockThreshold || 15))) ||
      (stockFilter === 'out_of_stock' && (p.stock === 0 || p.stock === undefined));
    return matchesSearch && matchesCat && matchesStatus && matchesStock;
  });

  return (
    <div>
      {/* Sub-tab Navigation (Showcase Screen 9 Top) */}
      <div className="subtab-scroll-container">
        <button
          onClick={() => setActiveSubTab('products')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: '14px',
            color: activeSubTab === 'products' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'products' ? '3px solid var(--primary)' : '3px solid transparent'
          }}
        >
          Products ({db.products.length})
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          style={{
            padding: '10px 18px',
            fontWeight: 600,
            fontSize: '14px',
            color: activeSubTab === 'categories' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'categories' ? '3px solid var(--primary)' : '3px solid transparent'
          }}
        >
          Categories ({db.categories.length})
        </button>
      </div>

      {activeSubTab === 'products' ? (
        <div className="table-card">
          {/* Toolbar */}
          <div className="table-header-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', paddingLeft: '32px' }}
                />
              </div>

              {/* Category Filter */}
              <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                <option value="all">All Categories</option>
                {db.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)}>
                <option value="active">Active Only</option>
                <option value="all">All Status</option>
                <option value="inactive">Deleted / Inactive</option>
              </select>

              {/* Stock Filter */}
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)}>
                <option value="all">All Stock Levels</option>
                <option value="low_stock">⚠️ Low Stock (≤15)</option>
                <option value="out_of_stock">❌ Out of Stock (0)</option>
              </select>
            </div>

            <button className="btn-primary" onClick={openAddProduct}>
              <Plus size={16} /> Add Product
            </button>
          </div>

          {/* Low Stock Warning Banner */}
          {lowStockProductsList.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '13px',
                color: '#92400E'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#D97706" />
                <span>
                  <strong>Inventory Notice:</strong> {lowStockProductsList.length} product(s) are low in stock (available quantity ≤ 15).
                </span>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
                style={{ padding: '4px 10px', fontSize: '11.5px', background: '#FFF' }}
              >
                {stockFilter === 'low_stock' ? 'Show All Products' : 'Filter Low Stock'}
              </button>
            </div>
          )}

          {/* Data Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit / Pack</th>
                <th>Available Stock</th>
                <th>Expiry Date</th>
                {isAdmin && <th>Net Cost (Admin)</th>}
                {isAdmin && <th>Profit / Loss</th>}
                <th>Sell Price</th>
                <th>MRP</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const cat = db.categories.find((c) => c.id === p.categoryId);
                const isLow = p.stock !== undefined && p.stock <= (p.lowStockThreshold || 15);
                const isOut = p.stock === 0 || p.stock === undefined;

                return (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                          }}
                        >
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>SKU: {p.sku}</div>
                    </td>
                    <td>
                      <span style={{ background: '#F1F5F4', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                        {cat?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td>{p.unit}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isOut ? (
                          <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            Out of Stock (0)
                          </span>
                        ) : isLow ? (
                          <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                            ⚠️ Low ({p.stock})
                          </span>
                        ) : (
                          <span style={{ background: '#ECFDF5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600 }}>
                            {p.stock} in stock
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setQuickStockProduct(p);
                            setQuickStockInput(String(p.stock ?? 0));
                          }}
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            background: '#F1F5F9',
                            border: '1px solid var(--border)',
                            fontSize: '11px',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: 600
                          }}
                          title="Quick Update Stock"
                        >
                          <Zap size={11} /> Stock
                        </button>
                      </div>
                    </td>
                    <td>
                      {p.expiryDate ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--text-secondary)" /> {p.expiryDate}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* Net Cost (Admin Only) */}
                    {isAdmin && (
                      <td style={{ fontWeight: 600, color: '#334155', fontSize: '13.5px' }}>
                        {p.netAmount !== undefined ? `₹${p.netAmount}` : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                      </td>
                    )}

                    {/* Profit / Loss Analysis (Admin Only) */}
                    {isAdmin && (
                      <td>
                        {p.netAmount !== undefined ? (() => {
                          const profit = p.sellPrice - p.netAmount;
                          const margin = p.sellPrice > 0 ? (profit / p.sellPrice) * 100 : 0;
                          const isLoss = profit < 0;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: isLoss ? '#DC2626' : '#16A34A',
                                background: isLoss ? '#FEF2F2' : '#F0FDF4',
                                border: isLoss ? '1px solid #FECACA' : '1px solid #BBF7D0',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                width: 'fit-content'
                              }}>
                                {isLoss ? `-₹${Math.abs(profit)} (${margin.toFixed(0)}%)` : `+₹${profit} (${margin.toFixed(0)}%)`}
                              </span>
                              <span style={{ fontSize: '10px', color: isLoss ? '#DC2626' : 'var(--text-secondary)', fontWeight: 600 }}>
                                {isLoss ? 'Loss Factor' : 'Profit Margin'}
                              </span>
                            </div>
                          );
                        })() : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    )}

                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14.5px' }}>
                      ₹{p.sellPrice}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>₹{p.mrp}</td>
                    <td>
                      <span className={`status-chip ${p.isDeleted || !p.active ? 'inactive' : 'active'}`}>
                        {p.isDeleted ? 'Deleted (Soft)' : p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {/* Action buttons stacked vertically - NOT side by side */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                        <button
                          onClick={() => openEditProduct(p)}
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
                          title="Edit Product"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        {p.isDeleted || !p.active ? (
                          <button
                            onClick={() => setProductToRestore(p)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: '#e6f4ea',
                              color: '#137333',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none'
                            }}
                            title="Restore Product"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => setProductToDelete(p)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none'
                            }}
                            title="Delete Product (Soft Delete)"
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
        </div>
      ) : (
        /* Categories Subtab */
        <div className="table-card">
          <div className="table-header-toolbar">
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 700 }}>
              Master Product Categories
            </h3>
            <button className="btn-primary" onClick={() => setIsCatModalOpen(true)}>
              <Plus size={16} /> Add Category
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Code</th>
                <th>Products Count</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {db.categories.map((c) => {
                const count = db.products.filter((p) => p.categoryId === c.id).length;
                const isCatDeleted = c.isDeleted || c.status === 'inactive' || c.active === false;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className="badge-brand">{c.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{count} items</td>
                    <td>
                      <span className={`status-chip ${isCatDeleted ? 'inactive' : 'active'}`}>
                        {isCatDeleted ? 'Deleted (Soft)' : 'Active'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                        {isCatDeleted ? (
                          <button
                            onClick={() => setCatToRestore(c)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: '#e6f4ea',
                              color: '#137333',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none'
                            }}
                            title="Restore Category"
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => setCatToDelete(c)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none'
                            }}
                            title="Delete Category (Soft Delete)"
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
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveProduct}>Save Product</button>
          </>
        }
      >
        <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coca Cola 750ml"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div className="form-grid-2">
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>SKU Code *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {db.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Section with Net Amount (Admin Only) and Profit/Loss Analysis */}
          <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={16} color="var(--primary)" /> Pricing & Profit/Loss Structure
              </div>
              {isAdmin && (
                <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Shield size={11} /> Admin Only View
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
              {isAdmin && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>Net Amount (Cost ₹)</label>
                    <span style={{ fontSize: '9.5px', background: '#FEF3C7', color: '#B45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>CONFIDENTIAL</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={netAmount}
                    onChange={(e) => setNetAmount(e.target.value)}
                    placeholder="e.g. 30"
                    style={{ width: '100%', marginTop: '4px', fontWeight: 600, borderColor: '#CBD5E1' }}
                  />
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Purchase / factory cost (hidden from sales staff)
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sell Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px', fontWeight: 700, color: 'var(--primary)' }}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Selling price to retail stores
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>MRP (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={mrp}
                  onChange={(e) => setMrp(Number(e.target.value))}
                  style={{ width: '100%', marginTop: '4px' }}
                />
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Maximum retail price on pack
                </div>
              </div>
            </div>

            {/* LIVE PROFIT & LOSS ANALYSIS CARD (ADMIN ONLY) */}
            {isAdmin && netAmount.trim() !== '' && !isNaN(Number(netAmount)) && (
              (() => {
                const cost = Number(netAmount);
                const selling = Number(sellPrice);
                const unitProfit = selling - cost;
                const marginPercent = selling > 0 ? (unitProfit / selling) * 100 : 0;
                const markupPercent = cost > 0 ? (unitProfit / cost) * 100 : 0;
                const isLoss = unitProfit < 0;

                return (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: isLoss ? '#FEF2F2' : '#F0FDF4',
                      border: isLoss ? '1.5px solid #FCA5A5' : '1.5px solid #86EFAC',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isLoss ? (
                          <div style={{ background: '#DC2626', color: '#FFF', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <AlertTriangle size={15} />
                          </div>
                        ) : (
                          <div style={{ background: '#16A34A', color: '#FFF', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={15} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isLoss ? '#DC2626' : '#15803D' }}>
                            {isLoss ? 'Loss Factor Alert (Negative Margin)' : 'Profit & Margin Analysis'}
                          </div>
                          <div style={{ fontSize: '11px', color: isLoss ? '#991B1B' : '#166534' }}>
                            {isLoss
                              ? 'Selling price is lower than purchase cost! Every sale will incur a loss.'
                              : 'Healthy profit margin based on net purchase amount.'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: isLoss ? '#DC2626' : '#15803D' }}>
                          {isLoss ? `-₹${Math.abs(unitProfit).toFixed(2)}` : `+₹${unitProfit.toFixed(2)}`}
                          <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px' }}>/ unit</span>
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: isLoss ? '#DC2626' : '#15803D' }}>
                          {marginPercent.toFixed(1)}% margin ({markupPercent.toFixed(1)}% markup)
                        </div>
                      </div>
                    </div>

                    {isLoss && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #FCA5A5', fontSize: '11.5px', color: '#7F1D1D' }}>
                        <strong>Loss Factor:</strong> Net Cost is ₹{cost.toFixed(2)} but Selling Price is ₹{selling.toFixed(2)}. Adjust Selling Price to at least ₹{cost.toFixed(2)} to avoid loss.
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>

          {/* Inventory Stock & Expiry Tracking (Required Stock with NO default, Optional Expiry) */}
          <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={16} /> Available Stock Quantity & Expiry Tracking
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Type the exact number of units currently available. No default stock is used. Admin can update stock anytime. Expiry date is optional.
            </div>

            <div className="form-grid-2">
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Available Quantity (Type Available Number) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="Type available quantity (e.g. 50)"
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    fontWeight: 700,
                    fontSize: '14px',
                    borderColor: stock.trim() === '' ? '#EF4444' : 'var(--border)'
                  }}
                />
                {stock.trim() === '' && (
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '2px' }}>
                    Required: Please type the available number of quantities.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Low Stock Alert Threshold (Warns when stock falls to or below this quantity)
              </label>
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="Default 15"
                style={{ width: '130px', marginTop: '4px', display: 'block' }}
              />
            </div>
          </div>

          {/* Packaging Unit Section with Preset & Custom Options */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Packaging Unit / Type *
              </label>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                Selected: {selectedUnitType === 'custom' ? (customUnit || 'Custom (typing...)') : selectedUnitType}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_UNITS.map((u) => {
                const isSelected = selectedUnitType === u;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => {
                      setSelectedUnitType(u);
                      setUnit(u);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--primary)' : '#FFF',
                      color: isSelected ? '#FFF' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {u}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSelectedUnitType('custom');
                  setUnit(customUnit || '');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedUnitType === 'custom' ? '1.5px solid var(--primary)' : '1px dashed var(--primary)',
                  background: selectedUnitType === 'custom' ? 'var(--primary)' : 'var(--primary-light)',
                  color: selectedUnitType === 'custom' ? '#FFF' : 'var(--primary)',
                  transition: 'all 0.15s ease'
                }}
              >
                + Custom Unit
              </button>
            </div>

            {selectedUnitType === 'custom' && (
              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  required
                  value={customUnit}
                  onChange={(e) => {
                    setCustomUnit(e.target.value);
                    setUnit(e.target.value);
                  }}
                  placeholder="Type any custom unit (e.g. Jar, Bottle, Crate, Carton, Tin, Dozen, Strip)..."
                  style={{ width: '100%', borderColor: 'var(--primary)' }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Photo Upload Section from Gallery / Files */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Product Photo (Upload from Gallery or Link)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileChange}
            />

            {imageUrl ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'var(--bg-main)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)'
                }}
              >
                <img
                  src={imageUrl}
                  alt="Product preview"
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                    border: '1px solid var(--border)'
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Photo attached
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: '#FFF',
                        border: '1px solid var(--border)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--primary)'
                      }}
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'var(--danger-light)',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: 'var(--danger)'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={15} />
                    {isUploadingImage ? 'Processing photo...' : 'Upload from Gallery / Files'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '12px',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '4px'
                    }}
                  >
                    {showUrlInput ? 'Hide link field' : 'Or enter image link URL'}
                  </button>
                </div>

                {showUrlInput && (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/product.jpg"
                    style={{ width: '100%', marginTop: '4px' }}
                  />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="activeToggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="activeToggle" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Active in Product Catalog
            </label>
          </div>
        </form>
      </Modal>

      {/* Quick Stock Update Modal (Admin can update stock anytime) */}
      <Modal
        isOpen={Boolean(quickStockProduct)}
        onClose={() => setQuickStockProduct(null)}
        title={`Update Stock: ${quickStockProduct?.name || ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setQuickStockProduct(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleQuickStockSave}>Save Stock</button>
          </>
        }
      >
        {quickStockProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {quickStockProduct.name} ({quickStockProduct.sku})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Unit: {quickStockProduct.unit} | Current Available Stock: <strong>{quickStockProduct.stock ?? 0}</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                New Available Stock Quantity
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '15px', fontWeight: 700 }}
                  onClick={() => {
                    const current = Number(quickStockInput) || 0;
                    setQuickStockInput(String(Math.max(0, current - 5)));
                  }}
                >
                  -5
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '15px', fontWeight: 700 }}
                  onClick={() => {
                    const current = Number(quickStockInput) || 0;
                    setQuickStockInput(String(Math.max(0, current - 1)));
                  }}
                >
                  -1
                </button>
                <input
                  type="number"
                  min={0}
                  value={quickStockInput}
                  onChange={(e) => setQuickStockInput(e.target.value)}
                  style={{ flex: 1, padding: '10px', fontSize: '16px', fontWeight: 700, textAlign: 'center' }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '15px', fontWeight: 700 }}
                  onClick={() => {
                    const current = Number(quickStockInput) || 0;
                    setQuickStockInput(String(current + 1));
                  }}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '15px', fontWeight: 700 }}
                  onClick={() => {
                    const current = Number(quickStockInput) || 0;
                    setQuickStockInput(String(current + 10));
                  }}
                >
                  +10
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Quick Presets:</span>
              {[0, 10, 20, 50, 100, 250, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuickStockInput(String(val))}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: '#FFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title="Add Product Category"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsCatModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleAddCategory}>Save Category</button>
          </>
        }
      >
        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category Name *</label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Biscuits & Cookies"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category Code</label>
            <input
              type="text"
              value={newCatCode}
              onChange={(e) => setNewCatCode(e.target.value)}
              placeholder="e.g. BSC"
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </form>
      </Modal>

      {/* In-App Delete & Restore Modals for Products and Categories */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        title="Delete Product"
        itemName={productToDelete?.name}
        message="This product will be soft-deleted and removed from the active catalog. You can restore it anytime in the 'Inactive' status filter."
        confirmLabel="Soft Delete Product"
        onConfirm={handleConfirmDeleteProduct}
        onClose={() => setProductToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(productToRestore)}
        title="Restore Product"
        itemName={productToRestore?.name}
        message="This will reactivate this product and return it to the active sales catalog."
        confirmLabel="Restore Product"
        onConfirm={handleConfirmRestoreProduct}
        onClose={() => setProductToRestore(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(catToDelete)}
        title="Delete Category"
        itemName={catToDelete?.name}
        message="This category will be soft-deleted. Existing products will retain their classification."
        confirmLabel="Soft Delete Category"
        onConfirm={handleConfirmDeleteCat}
        onClose={() => setCatToDelete(null)}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(catToRestore)}
        title="Restore Category"
        itemName={catToRestore?.name}
        message="This will reactivate this category."
        confirmLabel="Restore Category"
        onConfirm={handleConfirmRestoreCat}
        onClose={() => setCatToRestore(null)}
      />
    </div>
  );
};
