import React, { useState } from 'react';
import { User } from '../types';
import { KeyRound, User as UserIcon, LogIn, ShieldCheck } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function Login({ users, onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = username.trim().toLowerCase();
    const matchedUser = users.find(u => u.username.toLowerCase() === trimmedUser);

    if (!matchedUser) {
      setErrorMsg('Tài khoản không tồn tại trên hệ thống!');
      return;
    }

    if (matchedUser.password !== password) {
      setErrorMsg('Mật khẩu của tài khoản chưa chính xác!');
      return;
    }

    onLoginSuccess(matchedUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Immersive background glowing blur circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Logo and Brand Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600 rounded-2xl border border-blue-500 shadow-lg text-white mx-auto mb-2 animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white uppercase">THỊNH PHÁT COMPUTER</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Vui lòng đăng nhập bằng mã tài khoản nhân viên để tiếp quản hệ thống</p>
        </div>

        {/* Error Callout */}
        {errorMsg && (
          <div className="bg-rose-500/15 border border-rose-500/20 text-rose-400 text-xs font-bold px-4 py-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Traditional Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tên Đăng Nhập</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="login-input-username"
                type="text"
                required
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full text-sm bg-slate-950 text-white border-2 border-slate-800 focus:border-blue-500 pl-10 pr-4 py-3 rounded-xl focus:outline-hidden transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mật Khẩu Hệ Thống</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="login-input-password"
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-sm bg-slate-950 text-white border-2 border-slate-800 focus:border-blue-500 pl-10 pr-4 py-3 rounded-xl focus:outline-hidden transition"
              />
            </div>
          </div>

          <button
            id="login-submit-button"
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-extrabold uppercase tracking-widest py-3.5 px-4 rounded-xl transition cursor-pointer shadow-md"
          >
            <LogIn className="w-4 h-4" /> Đăng Nhập Ngay
          </button>
        </form>

      </div>
    </div>
  );
}
