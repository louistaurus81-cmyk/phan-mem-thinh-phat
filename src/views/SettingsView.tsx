import React, { useState } from 'react';
import { PrintSettings, User } from '../types';
import { 
  Building2, 
  CreditCard, 
  QrCode, 
  Save, 
  Store, 
  Phone, 
  MapPin, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsViewProps {
  printSettings: PrintSettings;
  onUpdatePrintSettings: (settings: PrintSettings) => void;
  currentUser: User;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  printSettings,
  onUpdatePrintSettings,
  currentUser
}) => {
  const [formState, setFormState] = useState<PrintSettings>({ ...printSettings });
  const [isSaved, setIsSaved] = useState(false);

  // Live VietQR Image URL
  const vietQrUrl = `https://img.vietqr.io/image/${formState.bankId || 'MB'}-${formState.bankAccountNo || '123456789'}-compact2.png?amount=100000&addInfo=Thanh toán Thịnh Phát&accountName=${encodeURIComponent(formState.bankAccountName || 'CỬA HÀNG')}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrintSettings(formState);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    alert('✅ Đã lưu cấu hình thông tin cửa hàng & tài khoản ngân hàng thành công!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            Cấu Hình Thông Tin Cửa Hàng & Thanh Toán VietQR
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Thông tin sẽ tự động hiển thị trên mẫu in hóa đơn, phiếu bảo hành và mã QR chuyển khoản.
          </p>
        </div>

        {isSaved && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã lưu cài đặt!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* AREA 1: STORE INFORMATION */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 bento-shadow space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            1. Thông Tin Thương Hiệu Cửa Hàng
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên cửa hàng *</label>
              <input 
                type="text"
                required
                value={formState.storeName}
                onChange={e => setFormState({ ...formState, storeName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-black text-slate-900 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Slogan / Khẩu hiệu</label>
              <input 
                type="text"
                value={formState.storeSlogan}
                onChange={e => setFormState({ ...formState, storeSlogan: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Địa chỉ cửa hàng *</label>
              <input 
                type="text"
                required
                value={formState.storeAddress}
                onChange={e => setFormState({ ...formState, storeAddress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Số điện thoại Hotline *</label>
                <input 
                  type="text"
                  required
                  value={formState.storePhone}
                  onChange={e => setFormState({ ...formState, storePhone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Website / Email</label>
                <input 
                  type="text"
                  value={formState.storeWebsite}
                  onChange={e => setFormState({ ...formState, storeWebsite: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Ghi chú chân trang hóa đơn</label>
              <textarea 
                rows={2}
                value={formState.storeNote}
                onChange={e => setFormState({ ...formState, storeNote: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>
        </div>

        {/* AREA 2: BANKING & LIVE VIETQR PREVIEW */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 bento-shadow space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              2. Tài Khoản Ngân Hàng & Mã VietQR
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mã Ngân Hàng (Bank ID) *</label>
                <select
                  value={formState.bankId}
                  onChange={e => setFormState({ ...formState, bankId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold cursor-pointer"
                >
                  <option value="MB">MBBank - Ngân hàng Quân Đội</option>
                  <option value="TPB">TPBank - Ngân hàng Tiên Phong</option>
                  <option value="VCB">Vietcombank - Ngoại Thương VN</option>
                  <option value="TCB">Techcombank - Kỹ Thương VN</option>
                  <option value="CTG">VietinBank - Công Thương VN</option>
                  <option value="ACB">ACB - Ngân hàng Á Châu</option>
                  <option value="STB">Sacombank</option>
                  <option value="VPB">VPBank</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng *</label>
                <input 
                  type="text"
                  required
                  value={formState.bankAccountNo}
                  onChange={e => setFormState({ ...formState, bankAccountNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-black text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Chủ Tài Khoản (In Hoa) *</label>
                <input 
                  type="text"
                  required
                  value={formState.bankAccountName}
                  onChange={e => setFormState({ ...formState, bankAccountName: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 uppercase"
                />
              </div>
            </div>

            {/* Live VietQR Preview Box */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <img 
                src={vietQrUrl} 
                alt="VietQR Preview" 
                className="w-20 h-20 rounded-lg border border-slate-200 object-contain bg-white shrink-0"
              />
              <div className="text-[11px] space-y-1">
                <p className="font-extrabold text-indigo-600 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" /> Xem trước Mã VietQR
                </p>
                <p className="text-slate-600 font-bold">NH: {formState.bankId} | STK: {formState.bankAccountNo}</p>
                <p className="text-slate-500 font-medium">Tên: {formState.bankAccountName}</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Thay Đổi Cấu Hình</span>
          </button>
        </div>

      </form>

    </div>
  );
};

export default SettingsView;
