import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, Edit, Trash2, Key, Shield, Smartphone, ToggleLeft, Sparkles, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AccountManagerProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export default function AccountManager({
  currentUser,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}: AccountManagerProps) {
  const isAdmin = currentUser.role === 'admin';

  // Form states for creating a new user
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'sales' as UserRole,
    phone: ''
  });

  // Editing existing user states
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.fullName.trim()) {
      alert('Vui lòng nhập đầy đủ các trường thông tin quy định!');
      return;
    }
    const usernameNorm = newUser.username.trim().toLowerCase();
    
    if (users.some(u => u.username.toLowerCase() === usernameNorm)) {
      alert('Phím đăng nhập này đã đăng ký trên hệ thống!');
      return;
    }

    onAddUser({
      username: usernameNorm,
      password: newUser.password,
      fullName: newUser.fullName.trim(),
      role: newUser.role,
      phone: newUser.phone.trim() || undefined
    });

    setNewUser({
      username: '',
      password: '',
      fullName: '',
      role: 'sales',
      phone: ''
    });

    setShowAddUserModal(false);
    alert('Thêm mới nhân viên thành công!');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.fullName.trim()) {
      alert('Tên hiển thị không được bỏ trống!');
      return;
    }

    onUpdateUser(editingUser);
    setEditingUser(null);
    alert('Cập nhật nhân viên thành công!');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 text-white relative overflow-hidden bento-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-blue-400/10 border border-blue-500/20 px-3 py-1 rounded-full">
            QUẢN TRỊ VIÊN & PHÂN QUYỀN
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Quản Lý Nhân Viên & Phân Quyền</h2>
          <p className="text-slate-400 text-xs max-w-xl">
            Tài khoản admin có quyền thiết lập thành viên mới, phân phối công việc theo vai trò và cập nhật mã thông hành bảo vệ hệ thống.
          </p>
        </div>
        {isAdmin && (
          <button 
            id="btn-open-add-user"
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer relative z-10 shrink-0 uppercase tracking-wider"
          >
            <UserPlus className="w-4 h-4" /> Thêm Tài Khoản Nhân Viên
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
                {currentUser.fullName.split(' ').pop()?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <h4 className="font-extrabold text-slate-900">{currentUser.fullName}</h4>
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider text-white bg-slate-900`}>
                {currentUser.role === 'admin' && '👑 Chủ cửa hàng'}
                {currentUser.role === 'sales' && '💸 Nhân viên bán hàng'}
                {currentUser.role === 'technician' && '🛠️ Nhân viên kỹ thuật'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Tên người dùng:</span>
                <span className="text-slate-800 font-bold font-mono">{currentUser.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-400 font-bold">Số điện thoại:</span>
                <span className="text-slate-800 font-bold">{currentUser.phone || 'Chưa cung cấp'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400 font-bold">Ngày gia nhập:</span>
                <span className="text-slate-800 font-bold">{currentUser.createdAt.slice(0, 10)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns: Master System Accounts (Needs Admin level, otherwise masked/read-only) */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-950 text-base">
              📋 Danh Sách Tài Khoản Trong Hệ Thống
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {users.length} tài khoản
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {users.map(u => {
              const isCurrentUser = u.id === currentUser.id;
              
              return (
                <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        <span className="font-mono font-semibold">@ {u.username}</span>
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
                        ? 'bg-amber-550/10 text-amber-700 border border-amber-550/20' 
                        : u.role === 'sales' 
                        ? 'bg-emerald-550/10 text-emerald-700 border border-emerald-550/20' 
                        : 'bg-indigo-550/10 text-indigo-700 border border-indigo-550/20'
                    }`}>
                      {u.role === 'admin' && 'Chủ cửa hàng'}
                      {u.role === 'sales' && 'Bán hàng'}
                      {u.role === 'technician' && 'Kỹ thuật'}
                    </span>

                    {/* Admin modifiers controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => setEditingUser({ ...u })}
                          className="p-1.5 text-blue-600 hover:bg-slate-50 border border-slate-150 rounded-lg transition cursor-pointer"
                          title="Sửa tài khoản"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {!isCurrentUser && (
                          <button
                            id={`btn-delete-user-${u.id}`}
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${u.fullName}" không? Mọi dịch vụ liên kết sẽ mất người quản lí.`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-slate-150 rounded-lg transition cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900">Tạo Tài Khoản Nhân Viên Mới</h3>
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phân Quyền Vai Trò</label>
                    <select
                      id="add-user-role"
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                    >
                      <option value="sales">💸 Nhân viên bán hàng</option>
                      <option value="technician">🛠️ Nhân viên kỹ thuật</option>
                      <option value="admin">👑 Chủ cửa hàng (Admin)</option>
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
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Tạo Tài Khoản
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITING USER DETAILS MODAL OVERLAY */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900">Sửa Quyền Hạn: {editingUser.username}</h3>
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
                      placeholder="Để trống nếu giữ nguyên"
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
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phân Quyền Vai Trò</label>
                  <select
                    id="edit-user-role"
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                  >
                    <option value="sales">💸 Nhân viên bán hàng</option>
                    <option value="technician">🛠️ Nhân viên kỹ thuật</option>
                    <option value="admin">👑 Chủ cửa hàng (Admin)</option>
                  </select>
                </div>

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
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Cập Nhật Lại
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
