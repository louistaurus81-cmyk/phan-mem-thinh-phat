import React, { useState } from 'react';
import { User, UserRole, UserPermissions, getUserPermissions } from '../types';
import { UserPlus, Edit, Trash2, Key, Shield, Smartphone, ToggleLeft, Sparkles, X, Check, Lock, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AccountManagerProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

const PERMISSION_CONFIG_LIST: { key: keyof UserPermissions; label: string; desc: string }[] = [
  { key: 'canManageInventory', label: 'Quản lý tồn kho & Sản phẩm', desc: 'Quyền thêm mới và sửa thông tin sản phẩm, linh kiện hoặc danh mục' },
  { key: 'canEditStock', label: 'Chỉnh sửa số lượng & Xóa SP/Danh mục', desc: 'Tăng/giảm số lượng tồn kho, xóa vĩnh viễn sản phẩm hoặc danh mục' },
  { key: 'canManageSales', label: 'Bán hàng & Tạo hóa đơn POS', desc: 'Tạo hóa đơn thanh toán, bán linh kiện & xuất file báo giá' },
  { key: 'canEditInvoices', label: 'Chỉnh sửa hóa đơn bán hàng', desc: 'Cho phép thay đổi thông tin, khách hàng, mặt hàng trên hóa đơn đã lập' },
  { key: 'canDeleteInvoices', label: 'Xóa hóa đơn bán hàng', desc: 'Cho phép xóa vĩnh viễn hóa đơn đã lập và hoàn trả tồn kho sản phẩm' },
  { key: 'canManageRepairs', label: 'Tiếp nhận & Sửa chữa', desc: 'Ghi phiếu nhận máy hỏng, cập nhật tiến độ & hoàn thành sửa' },
  { key: 'canManageWarranty', label: 'Quản lý thẻ bảo hành', desc: 'Cấp mới & tra cứu thẻ bảo hành cho khách hàng' },
  { key: 'canManageCustomers', label: 'Quản lý thông tin khách hàng', desc: 'Thêm, sửa & xem lịch sử mua sắm khách hàng CRM' },
  { key: 'canViewDebt', label: 'Xem & Thu hồi công nợ', desc: 'Theo dõi sổ nợ khách hàng và ghi nhận lịch sử trả nợ' },
  { key: 'canManageSuppliers', label: 'Quản lý nhà cung cấp', desc: 'Thêm & cập nhật nguồn hàng nhập từ các nhà phân phối' },
  { key: 'canViewReports', label: 'Xem báo cáo doanh thu & tài chính', desc: 'Quyền xem tổng doanh thu, lợi nhuận và bảng giám sát chủ shop' },
  { key: 'canManageSettings', label: 'Cài đặt mẫu in & Hệ thống', desc: 'Cấu hình thông tin cửa hàng, mẫu in A4/K80 và VietQR' }
];

export default function AccountManager({
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: AccountManagerProps) {
  const isAdmin = currentUser?.role === 'admin';

  // Form states for creating a new user
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'sales' as UserRole,
    phone: '',
    permissions: {
      canManageInventory: true,
      canEditStock: false,
      canManageSales: true,
      canManageRepairs: false,
      canManageWarranty: true,
      canManageCustomers: true,
      canViewDebt: false,
      canManageSuppliers: false,
      canViewReports: false,
      canManageSettings: false
    } as UserPermissions
  });

  // Editing existing user states
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleRolePresetChange = (role: UserRole, target: 'new' | 'edit') => {
    let defaultPerms: UserPermissions = {
      canManageInventory: true,
      canEditStock: false,
      canManageSales: true,
      canManageRepairs: false,
      canManageWarranty: true,
      canManageCustomers: true,
      canViewDebt: false,
      canManageSuppliers: false,
      canViewReports: false,
      canManageSettings: false
    };

    if (role === 'technician') {
      defaultPerms = {
        canManageInventory: false,
        canEditStock: false,
        canManageSales: false,
        canManageRepairs: true,
        canManageWarranty: true,
        canManageCustomers: true,
        canViewDebt: false,
        canManageSuppliers: false,
        canViewReports: false,
        canManageSettings: false
      };
    } else if (role === 'admin') {
      defaultPerms = {
        canManageInventory: true,
        canEditStock: true,
        canManageSales: true,
        canManageRepairs: true,
        canManageWarranty: true,
        canManageCustomers: true,
        canViewDebt: true,
        canManageSuppliers: true,
        canViewReports: true,
        canManageSettings: true
      };
    }

    if (target === 'new') {
      setNewUser(prev => ({ ...prev, role, permissions: defaultPerms }));
    } else if (editingUser) {
      setEditingUser(prev => prev ? ({ ...prev, role, permissions: defaultPerms }) : null);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.fullName.trim()) {
      alert('Vui lòng nhập đầy đủ các trường thông tin quy định!');
      return;
    }
    const usernameNorm = newUser.username.trim().toLowerCase();
    
    if (users.some(u => u.username.toLowerCase() === usernameNorm)) {
      alert('Tên đăng nhập này đã đăng ký trên hệ thống!');
      return;
    }

    onAddUser({
      username: usernameNorm,
      password: newUser.password,
      fullName: newUser.fullName.trim(),
      role: newUser.role,
      phone: newUser.phone.trim() || undefined,
      permissions: newUser.role === 'admin' ? undefined : newUser.permissions
    });

    setNewUser({
      username: '',
      password: '',
      fullName: '',
      role: 'sales',
      phone: '',
      permissions: {
        canManageInventory: true,
        canEditStock: false,
        canManageSales: true,
        canManageRepairs: false,
        canManageWarranty: true,
        canManageCustomers: true,
        canViewDebt: false,
        canManageSuppliers: false,
        canViewReports: false,
        canManageSettings: false
      }
    });

    setShowAddUserModal(false);
    alert('Thêm mới nhân viên và cấp quyền thành công!');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.fullName.trim()) {
      alert('Tên hiển thị không được bỏ trống!');
      return;
    }

    onUpdateUser(editingUser);
    setEditingUser(null);
    alert('Cập nhật thông tin & phân quyền nhân viên thành công!');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-slate-900 rounded-3xl border-2 border-slate-800 p-5 md:p-6 text-white relative overflow-hidden bento-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-400/10 border border-blue-500/20 px-3 py-1 rounded-full">
            QUẢN TRỊ VIÊN & PHÂN QUYỀN
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Quản Lý Nhân Viên & Phân Quyền Chi Tiết</h2>
          <p className="text-slate-400 text-xs max-w-xl">
            Tài khoản admin nắm toàn quyền cửa hàng. Các tài khoản nhân viên được admin trực tiếp bật/tắt từng quyền hạn thao tác (quản lý tồn kho, chỉnh sửa số lượng kho, xem nợ, v.v.).
          </p>
        </div>
        {isAdmin && (
          <button 
            id="btn-open-add-user"
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer relative z-10 shrink-0 uppercase tracking-wider"
          >
            <UserPlus className="w-4 h-4" /> Thêm Nhân Viên & Cấp Quyền
          </button>
        )}
      </div>

      {/* 2. MAIN SPLIT GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: My Current Session Profile */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-6">
          <h3 className="font-bold text-slate-950 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            Tài Khoản Đang Đăng Nhập
          </h3>

          <div className="space-y-4">
            <div className="flex justify-center flex-col items-center py-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center text-white text-lg font-bold">
                {currentUser?.fullName?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <h4 className="font-extrabold text-slate-900">{currentUser?.fullName || 'Người dùng'}</h4>
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-white bg-slate-900`}>
                {currentUser?.role === 'admin' && '👑 Chủ cửa hàng'}
                {currentUser?.role === 'sales' && '💸 Nhân viên bán hàng'}
                {currentUser?.role === 'technician' && '🛠️ Nhân viên kỹ thuật'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Tên người dùng:</span>
                <span className="text-slate-800 font-bold font-mono">{currentUser?.username || '---'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Số điện thoại:</span>
                <span className="text-slate-800 font-bold">{currentUser?.phone || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400 font-bold">Quyền hạn hệ thống:</span>
                <span className="text-emerald-600 font-bold">
                  {currentUser?.role === 'admin' ? 'Toàn quyền Admin' : 'Đã phân quyền cụ thể'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Master System Accounts & Permissions List */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-950 text-base">
              📋 Danh Sách Tài Khoản & Bảng Phân Quyền
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {users.length} tài khoản
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map(u => {
              const isCurrentUser = currentUser ? u.id === currentUser.id : false;
              const perms = getUserPermissions(u);

              return (
                <div key={u.id} className="py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        u.role === 'admin' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : u.role === 'sales' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {u.fullName.split(' ').pop()?.charAt(0) || 'U'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{u.fullName}</h4>
                          {isCurrentUser && (
                            <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-sm uppercase">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-0.5 text-xs text-slate-500">
                          <span className="font-mono font-semibold">@{u.username}</span>
                          {u.phone && (
                            <span className="flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-slate-400" />
                              {u.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Role badge display */}
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : u.role === 'sales' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {u.role === 'admin' && '👑 Admin (Toàn quyền)'}
                        {u.role === 'sales' && '💸 Bán hàng'}
                        {u.role === 'technician' && '🛠️ Kỹ thuật'}
                      </span>

                      {/* Admin modifiers controls */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`btn-edit-user-${u.id}`}
                            onClick={() => setEditingUser({ ...u })}
                            className="px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                            title="Chỉnh sửa thông tin & phân quyền"
                          >
                            <Edit className="w-3.5 h-3.5" /> Phân quyền
                          </button>
                          
                          {!isCurrentUser && (
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 border border-slate-200 rounded-lg transition cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Permissions Badges Row */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-500 uppercase mr-1">Quyền đang cấp:</span>
                    {u.role === 'admin' ? (
                      <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        ✓ Nắm toàn quyền quản trị hệ thống
                      </span>
                    ) : (
                      <>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${perms.canManageInventory ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                          {perms.canManageInventory ? '✓ Quản lý danh mục/SP' : '✕ Quản lý danh mục/SP'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${perms.canEditStock ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-600 line-through'}`}>
                          {perms.canEditStock ? '✓ Sửa số lượng kho' : '✕ Không cho sửa tồn kho'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${perms.canManageSales ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                          {perms.canManageSales ? '✓ Bán hàng POS' : '✕ Bán hàng POS'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${perms.canManageRepairs ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                          {perms.canManageRepairs ? '✓ Sửa chữa' : '✕ Sửa chữa'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold ${perms.canViewDebt ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-400 line-through'}`}>
                          {perms.canViewDebt ? '✓ Xem công nợ' : '✕ Xem công nợ'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* CREATE NEW USER MODAL OVERLAY */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddUserModal(false)}
              className="fixed inset-0 bg-black"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-xl z-10 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900">Tạo Tài Khoản Nhân Viên Mới & Phân Quyền</h3>
                <button onClick={() => setShowAddUserModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tên Hiển Thị (Họ & Tên) *</label>
                  <input
                    id="add-user-fullname"
                    type="text"
                    required
                    placeholder="e.g. Nguyễn Hoàng Linh"
                    value={newUser.fullName}
                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Tên Đăng Nhập *</label>
                    <input
                      id="add-user-username"
                      type="text"
                      required
                      placeholder="e.g. linhnh"
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Mật Khẩu *</label>
                    <input
                      id="add-user-password"
                      type="password"
                      required
                      placeholder="••••••"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Vai Trò Chính</label>
                    <select
                      id="add-user-role"
                      value={newUser.role}
                      onChange={e => handleRolePresetChange(e.target.value as UserRole, 'new')}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer font-bold text-indigo-600"
                    >
                      <option value="sales">💸 Nhân viên bán hàng</option>
                      <option value="technician">🛠️ Nhân viên kỹ thuật</option>
                      <option value="admin">👑 Chủ cửa hàng (Admin - Toàn quyền)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Số Điện Thoại</label>
                    <input
                      id="add-user-phone"
                      type="text"
                      placeholder="e.g. 0912345678"
                      value={newUser.phone}
                      onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Detailed Permissions Checkbox Matrix */}
                {newUser.role !== 'admin' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Bảng Phân Quyền Chi Tiết Cho Tài Khoản</span>
                      <span className="text-[10px] text-indigo-600 lowercase font-normal">(Tick chọn quyền được phép thực hiện)</span>
                    </label>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 max-h-60 overflow-y-auto">
                      {PERMISSION_CONFIG_LIST.map((p) => {
                        const isChecked = !!newUser.permissions[p.key];
                        return (
                          <label key={p.key} className="flex items-start gap-3 p-2 hover:bg-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                setNewUser(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [p.key]: e.target.checked
                                  }
                                }));
                              }}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <p className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                                {p.label}
                                {p.key === 'canEditStock' && (
                                  <span className="ml-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                                    ★ Quan trọng
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400">{p.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    id="add-user-submit-btn"
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    Tạo & Cấp Quyền
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITING USER DETAILS & PERMISSIONS MODAL OVERLAY */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-55 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="fixed inset-0 bg-black"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-xl z-10 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900">Sửa Quyền Hạn Nhân Viên: {editingUser.fullName}</h3>
                <button onClick={() => setEditingUser(null)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tên Hiển Thị (Họ & Tên) *</label>
                  <input
                    id="edit-user-fullname"
                    type="text"
                    required
                    placeholder="e.g. Nguyễn Hoàng Linh"
                    value={editingUser.fullName}
                    onChange={e => setEditingUser({ ...editingUser, fullName: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Đổi Mật Khẩu</label>
                    <input
                      id="edit-user-password"
                      type="password"
                      placeholder="Mật khẩu mới (hoặc giữ nguyên)"
                      value={editingUser.password || ''}
                      onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Số Điện Thoại</label>
                    <input
                      id="edit-user-phone"
                      type="text"
                      placeholder="e.g. 0912345678"
                      value={editingUser.phone || ''}
                      onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Vai Trò</label>
                  <select
                    id="edit-user-role"
                    value={editingUser.role}
                    onChange={e => handleRolePresetChange(e.target.value as UserRole, 'edit')}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer font-bold text-indigo-600"
                  >
                    <option value="sales">💸 Nhân viên bán hàng</option>
                    <option value="technician">🛠️ Nhân viên kỹ thuật</option>
                    <option value="admin">👑 Chủ cửa hàng (Admin - Toàn quyền)</option>
                  </select>
                </div>

                {/* Detailed Permissions Checkbox Matrix */}
                {editingUser.role !== 'admin' && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Bảng Cấu Hình Phân Quyền Chi Tiết</span>
                      <span className="text-[10px] text-indigo-600 lowercase font-normal">(Cấp hoặc thu hồi quyền)</span>
                    </label>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 max-h-60 overflow-y-auto">
                      {PERMISSION_CONFIG_LIST.map((p) => {
                        const curPerms = getUserPermissions(editingUser);
                        const isChecked = !!curPerms[p.key];
                        return (
                          <label key={p.key} className="flex items-start gap-3 p-2 hover:bg-white rounded-xl transition cursor-pointer border border-transparent hover:border-slate-200">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                const newVal = e.target.checked;
                                setEditingUser(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    permissions: {
                                      ...(prev.permissions || {}),
                                      [p.key]: newVal
                                    }
                                  };
                                });
                              }}
                              className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <p className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                                {p.label}
                                {p.key === 'canEditStock' && (
                                  <span className="ml-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-sm">
                                    ★ Quan trọng
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400">{p.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    id="edit-user-submit-btn"
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer shadow-sm uppercase tracking-wider"
                  >
                    Lưu Quyền Hạn
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Modal */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingUser(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xóa Tài Khoản Nhân Viên</h3>
                  <p className="text-xs text-slate-500 font-medium">{deletingUser.fullName} (@{deletingUser.username})</p>
                </div>
              </div>

              <p className="text-xs text-slate-600">
                Bạn có chắc chắn muốn xóa tài khoản nhân viên <span className="font-bold text-slate-900">"{deletingUser.fullName}"</span> khỏi hệ thống cửa hàng không?
              </p>

              <div className="pt-2 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="button" 
                  id="btn-confirm-delete-user"
                  onClick={() => {
                    onDeleteUser(deletingUser.id);
                    setDeletingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-2xs transition"
                >
                  Xóa tài khoản
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

