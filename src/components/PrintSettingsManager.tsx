import React, { useState } from 'react';
import { PrintSettings } from '../types';
import { 
  Printer, 
  QrCode, 
  Save, 
  Type, 
  FileText, 
  Store, 
  Check, 
  RotateCcw, 
  Image, 
  Settings, 
  Eye, 
  AlignLeft, 
  BadgeHelp,
  Brush
} from 'lucide-react';

interface PrintSettingsManagerProps {
  printSettings: PrintSettings;
  onUpdatePrintSettings: (settings: PrintSettings) => void;
  currentUser: any;
}

const BANKS = [
  { id: "MB", name: "MBBank (Ngân hàng Quân Đội)" },
  { id: "VCB", name: "Vietcombank (Ngân hàng Ngoại thương)" },
  { id: "TCB", name: "Techcombank (Ngân hàng Kỹ thương)" },
  { id: "CTG", name: "VietinBank (Ngân hàng Công thương)" },
  { id: "BID", name: "BIDV (Ngân hàng Đầu tư & Phát triển)" },
  { id: "ACB", name: "ACB (Ngân hàng Á Châu)" },
  { id: "STB", name: "Sacombank (Ngân hàng Sài Gòn Thương Tín)" },
  { id: "TPB", name: "TPBank (Ngân hàng Tiên Phong)" },
  { id: "VBA", name: "Agribank (Ngân hàng Nông nghiệp)" },
  { id: "VPB", name: "VPBank (Ngân hàng Thịnh Vượng)" },
  { id: "VIB", name: "VIB (Ngân hàng Quốc tế)" },
  { id: "HDB", name: "HDBank (Ngân hàng Phát triển TP.HCM)" },
  { id: "SHB", name: "SHB (Ngân hàng Sài Gòn - Hà Nội)" }
];

export default function PrintSettingsManager({ 
  printSettings, 
  onUpdatePrintSettings,
  currentUser 
}: PrintSettingsManagerProps) {
  const [formState, setFormState] = useState<PrintSettings>({ ...printSettings });
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'layout' | 'payment' | 'quote'>('info');
  const [previewDocTab, setPreviewDocTab] = useState<'invoice' | 'quotation'>('invoice');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormState(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit check
        alert('File logo quá lớn, vui lòng chọn file dưới 1MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, storeLogoImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImageLogo = () => {
    setFormState(prev => ({ ...prev, storeLogoImage: undefined }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePrintSettings(formState);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const resetToDefault = () => {
    const fresh: PrintSettings = {
      storeName: "THỊNH PHÁT COMPUTER",
      storeSlogan: "HỆ THỐNG MÁY TÍNH & THIẾT BỊ VĂN PHÒNG CHUYÊN NGHIỆP",
      storeAddress: "126 Hồ Tùng Mậu - Hòa Minh - Liên Chiểu - Đà Nẵng",
      storePhone: "0935024002 (Zalo) - 0971682684 - Mr Thịnh",
      storeWebsite: "Hathanhthinh.dspn@gmail.com",
      storeNote: "Báo giá trên chưa bao gồm phí VAT. Có hiệu lực 3 ngày kể từ ngày báo.",
      storeLogoText: "TP",
      primaryColor: "#2e4a88",
      fontSize: "md",
      showLogoSymbol: true,
      paperSize: "a4",
      bankId: "MB",
      bankAccountNo: "1234567890",
      bankAccountName: "NGUYEN VAN THINH",
      qrCompact: true
    };
    setFormState(fresh);
  };

  // Generate public VietQR link safely
  const getVietQrUrl = (amount: number, memo: string) => {
    const bank = formState.bankId || 'MB';
    const acc = formState.bankAccountNo || '1234567890';
    const name = encodeURIComponent(formState.bankAccountName || 'NGUYEN VAN THINH');
    const note = encodeURIComponent(memo);
    const template = formState.qrCompact ? 'compact2' : 'qr_only';
    
    return `https://img.vietqr.io/image/${bank}-${acc}-${template}.png?amount=${amount}&addInfo=${note}&accountName=${name}`;
  };

  // Sample data for Mockup previews
  const sampleInvoiceItems = [
    { name: "CPU Intel Core i5-13400F Tray (Bh 36T)", qty: 1, sPrice: 4250000 },
    { name: "Mainboard MSI H610M Bomber DDR4 (Bh 36T)", qty: 1, sPrice: 1950000 },
    { name: "VGA ASUS Dual RTX 3060 12GB OC GDDR6 (Bh 36T)", qty: 1, sPrice: 7650000 },
    { name: "RAM Adata XPG Spectrix D50 RGB 16GB (Bh 36T)", qty: 1, sPrice: 1150000 }
  ];
  const sampleSubtotal = sampleInvoiceItems.reduce((sum, item) => sum + (item.sPrice * item.qty), 0);
  const sampleDiscount = 200000;
  const sampleTotal = sampleSubtotal - sampleDiscount;

  return (
    <div id="print-settings-manager-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: CONTROLS & FORM */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Cấu Hình Cá Nhân Hóa</h3>
              <p className="text-[11px] text-slate-500 font-medium">Tùy chỉnh thông tin hóa đơn, kích thước in và QR thanh toán</p>
            </div>
          </div>

          {/* Sub-tabs layout config */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab('info')}
              className={`py-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeSubTab === 'info' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <Store className="w-3.5 h-3.5" />
                Cửa Hàng
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('layout')}
              className={`py-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeSubTab === 'layout' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <AlignLeft className="w-3.5 h-3.5" />
                Bố Cục In
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('payment')}
              className={`py-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeSubTab === 'payment' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                VietQR
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('quote')}
              className={`py-2 text-center rounded-lg transition cursor-pointer select-none ${
                activeSubTab === 'quote' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Mẫu Báo Giá
              </span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            
            {/* SUB-TAB 1: STORE INFO PROPERTIES */}
            {activeSubTab === 'info' && (
              <div className="space-y-3.5 transition-all">
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Tên cửa hàng thương hiệu</label>
                    <div className="flex gap-2 items-center">
                      {/* Logo Image Upload / Preview */}
                      <div className="relative group shrink-0">
                        {formState.storeLogoImage ? (
                           <div className="relative w-12 h-12 rounded overflow-hidden border-2 border-slate-200">
                             <img src={formState.storeLogoImage} alt="logo" className="w-full h-full object-cover" />
                             <button type="button" onClick={handleRemoveImageLogo} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">X</button>
                           </div>
                        ) : (
                          <div className="relative w-12 h-12 rounded border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition">
                            <span className="text-[9px] font-bold text-slate-400 text-center uppercase">Upload<br/>Logo</span>
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                          </div>
                        )}
                      </div>
                      
                      <input
                        type="text"
                        name="storeLogoText"
                        value={formState.storeLogoText || ''}
                        onChange={handleInputChange}
                        placeholder="Icon (TP)"
                        className="w-16 shrink-0 text-center text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        name="storeName"
                        value={formState.storeName}
                        onChange={handleInputChange}
                        placeholder="VD: THỊNH PHÁT COMPUTER"
                        className="flex-1 w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Slider to adjust logo width */}
                  {formState.showLogoSymbol && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Kích thước Logo (Độ rộng)</label>
                        <span className="text-xs font-bold text-indigo-600">{formState.storeLogoWidth || 120}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="40" 
                        max="400" 
                        step="5"
                        value={formState.storeLogoWidth || 120}
                        onChange={(e) => setFormState(prev => ({ ...prev, storeLogoWidth: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Kéo để điều chỉnh độ lớn của Logo trên các mẫu in ấn.</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Khẩu hiệu / Slogan kinh doanh</label>
                  <input
                    type="text"
                    name="storeSlogan"
                    value={formState.storeSlogan}
                    onChange={handleInputChange}
                    placeholder="VD: Uy tín tạo niềm tìn"
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Điện thoại Hotline</label>
                    <input
                      type="text"
                      name="storePhone"
                      value={formState.storePhone}
                      onChange={handleInputChange}
                      placeholder="Số hotline"
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Trang web / Địa chỉ URL</label>
                    <input
                      type="text"
                      name="storeWebsite"
                      value={formState.storeWebsite}
                      onChange={handleInputChange}
                      placeholder="www.cua-hang.com"
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Địa chỉ cửa hàng vật lý</label>
                  <input
                    type="text"
                    name="storeAddress"
                    value={formState.storeAddress}
                    onChange={handleInputChange}
                    placeholder="Số nhà, phố, quận..."
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Ghi chú chân trang in / Cam kết bảo hành</label>
                  <textarea
                    rows={3}
                    name="storeNote"
                    value={formState.storeNote}
                    onChange={handleInputChange}
                    placeholder="Nội dung cảm ơn, lưu ý bảo hành hoặc kiểm hàng..."
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 leading-normal"
                  />
                </div>
              </div>
            )}

            {/* SUB-TAB 2: PRINT STYLE CONFIG */}
            {activeSubTab === 'layout' && (
              <div className="space-y-4 transition-all">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Khổ giấy in ấn đầu ra</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'a4', label: 'Khổ A4 / A5', desc: 'Máy in Văn phòng' },
                      { id: 'k80', label: 'Nhiệt K80 (80mm)', desc: 'Siêu thị, Bill nhanh' },
                      { id: 'k57', label: 'Nhiệt K57 (57mm)', desc: 'Máy in cầm tay' }
                    ].map(paper => (
                      <button
                        type="button"
                        key={paper.id}
                        onClick={() => setFormState(prev => ({ ...prev, paperSize: paper.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                          formState.paperSize === paper.id
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 ring-1 ring-indigo-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-[10px] font-extrabold">{paper.label}</span>
                        <span className="text-[8px] text-slate-400 mt-1 font-bold leading-tight">{paper.desc}</span>
                        {formState.paperSize === paper.id && (
                          <span className="absolute top-1 right-1 bg-indigo-600 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">Cỡ chữ văn bản trên hóa đơn</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sm', label: 'Nhỏ gọn' },
                      { id: 'md', label: 'Tiêu chuẩn (Vừa)' },
                      { id: 'lg', label: 'Cỡ lớn dễ đọc' }
                    ].map(fSize => (
                      <button
                        type="button"
                        key={fSize.id}
                        onClick={() => setFormState(prev => ({ ...prev, fontSize: fSize.id as any }))}
                        className={`py-2 text-center text-[10px] font-bold rounded-xl border transition cursor-pointer ${
                          formState.fontSize === fSize.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-extrabold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {fSize.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Màu chủ đạo brand hóa đơn</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formState.primaryColor}
                        onChange={handleInputChange}
                        className="w-10 h-9 p-0.5 rounded-xl border border-slate-200 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        name="primaryColor"
                        value={formState.primaryColor}
                        onChange={handleInputChange}
                        className="w-24 text-[11px] font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer select-none py-1.5">
                      <input
                        type="checkbox"
                        name="showLogoSymbol"
                        checked={formState.showLogoSymbol}
                        onChange={handleInputChange}
                        className="rounded-md text-indigo-650 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-slate-700 block uppercase">In Biểu tượng</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Hiển thị icon hệ thống</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: VIETQR INTEGRATION SETTING */}
            {activeSubTab === 'payment' && (
              <div className="space-y-3.5 transition-all">
                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-2.5">
                  <QrCode className="w-4 h-4 text-indigo-605 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed text-indigo-850 font-medium">
                    Tải mã QR động từ VietQR giúp người mua chuyển khoản 1 chạm. Quá trình tạo QR chứa đúng số tiền, số tài khoản và kèm ghi chú giao dịch hoàn toàn tự động.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Hãy chọn Ngân Hàng nhận tiền</label>
                  <select
                    name="bankId"
                    value={formState.bankId}
                    onChange={handleInputChange}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Không sử dụng QR hoặc chọn dưới --</option>
                    {BANKS.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.name}</option>
                    ))}
                  </select>
                </div>

                {formState.bankId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Số tài khoản nhận</label>
                        <input
                          type="text"
                          name="bankAccountNo"
                          value={formState.bankAccountNo}
                          onChange={handleInputChange}
                          placeholder="Số tài khoản ngân hàng"
                          className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Tên chủ tài khoản (Không dấu)</label>
                        <input
                          type="text"
                          name="bankAccountName"
                          value={formState.bankAccountName}
                          onChange={handleInputChange}
                          placeholder="VD: NGUYEN VAN THINH"
                          className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase"
                          required
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-slate-700 block">Chế độ QR nhỏ gọn (Compact)</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Ẩn bớt khung ngoài để vừa hóa đơn nhỏ</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="qrCompact"
                          checked={formState.qrCompact}
                          onChange={handleInputChange}
                          className="rounded-md text-indigo-650 border-slate-300 focus:ring-indigo-500 w-4 h-4"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SUB-TAB 4: QUOTATION & WARRANTY PRINT TEMPLATE SETTINGS */}
            {activeSubTab === 'quote' && (
              <div className="space-y-3.5 transition-all text-xs">
                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Tiêu đề phiếu báo giá kiêm bảo hành</label>
                  <input
                    type="text"
                    name="quoteTitle"
                    value={formState.quoteTitle || 'BẢNG BÁO GIÁ KIÊM PHIẾU BẢO HÀNH'}
                    onChange={handleInputChange}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Cột Tình Trạng Hàng</label>
                    <input
                      type="text"
                      name="quoteStockStatusText"
                      value={formState.quoteStockStatusText || 'SẴN HÀNG'}
                      onChange={handleInputChange}
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      placeholder="VD: SẴN HÀNG"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Thời hạn báo giá</label>
                    <input
                      type="text"
                      name="quoteValidityNote"
                      value={formState.quoteValidityNote || 'Bảng báo giá có hiệu lực 3 ngày kể từ ngày báo'}
                      onChange={handleInputChange}
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">Ghi chú phí VAT</label>
                  <input
                    type="text"
                    name="quoteVatNote"
                    value={formState.quoteVatNote || 'Lưu ý : Bảng giá trên chưa bao gồm phí VAT'}
                    onChange={handleInputChange}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">Tùy chỉnh tiêu đề cột & các nhãn</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột STT</span>
                      <input type="text" name="quoteColSttLabel" value={formState.quoteColSttLabel || 'STT'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Sản Phẩm</span>
                      <input type="text" name="quoteColProductLabel" value={formState.quoteColProductLabel || 'TÊN SẢN PHẨM'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Số Lượng</span>
                      <input type="text" name="quoteColQtyLabel" value={formState.quoteColQtyLabel || 'SL'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Đơn Giá</span>
                      <input type="text" name="quoteColUnitPriceLabel" value={formState.quoteColUnitPriceLabel || 'ĐƠN GIÁ'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Thành Tiền</span>
                      <input type="text" name="quoteColAmountLabel" value={formState.quoteColAmountLabel || 'THÀNH TIỀN'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Bảo Hành</span>
                      <input type="text" name="quoteColWarrantyLabel" value={formState.quoteColWarrantyLabel || 'BẢO HÀNH'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Cột Tình Trạng</span>
                      <input type="text" name="quoteColStockLabel" value={formState.quoteColStockLabel || 'TÌNH TRẠNG HÀNG'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold">Tên Dòng Tổng Tiền</span>
                      <input type="text" name="quoteTotalLabel" value={formState.quoteTotalLabel || 'TỔNG CỘNG CẤU HÌNH BAO GỒM VAT:'} onChange={handleInputChange} className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">Bật / Tắt thành phần báo giá</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteWarrantyColumn"
                        checked={formState.showQuoteWarrantyColumn !== false}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị cột Cấp bảo hành</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteStockColumn"
                        checked={formState.showQuoteStockColumn !== false}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị cột Tình trạng hàng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteWarrantyTerms"
                        checked={formState.showQuoteWarrantyTerms !== false}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị khối Quy định bảo hành</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteBankInfo"
                        checked={formState.showQuoteBankInfo !== false}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị Thông tin tài khoản ngân hàng</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteQrCode"
                        checked={!!formState.showQuoteQrCode}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị Mã QR VietQR (Mặc định Tắt)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showQuoteSignatures"
                        checked={formState.showQuoteSignatures !== false}
                        onChange={handleInputChange}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-semibold text-slate-700 text-xs">Hiển thị khối Chữ ký xác nhận</span>
                    </label>
                  </div>
                </div>

                {/* Quy định bảo hành array editor */}
                {(formState.showQuoteWarrantyTerms !== false) && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">Danh sách quy định bảo hành</label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentTerms = formState.quoteWarrantyTerms || [];
                          setFormState(prev => ({ ...prev, quoteWarrantyTerms: [...currentTerms, ""] }));
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        + Thêm dòng
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(formState.quoteWarrantyTerms || []).map((term, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">{idx + 1}.</span>
                          <input
                            type="text"
                            value={term}
                            onChange={e => {
                              const updated = [...(formState.quoteWarrantyTerms || [])];
                              updated[idx] = e.target.value;
                              setFormState(prev => ({ ...prev, quoteWarrantyTerms: updated }));
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (formState.quoteWarrantyTerms || []).filter((_, i) => i !== idx);
                              setFormState(prev => ({ ...prev, quoteWarrantyTerms: updated }));
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTION FOOTERS IN THE CONTROL CARD */}
            <div className="pt-4 border-t border-slate-100 flex gap-3 justify-between items-center bg-transparent mt-2">
              <button
                type="button"
                onClick={resetToDefault}
                className="px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Khôi phục thông số chuẩn của hãng"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Mặc Định
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black tracking-wide transition flex items-center gap-1.5 self-end shadow-xs cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Đã Lưu Thành Công
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu Thay Đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE VISUAL LIVE PREVIEW MOCKUPS */}
      <div className="lg:col-span-7 space-y-4">
        
        {/* Preview header tab switches */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-rose-50 text-rose-505 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-100">Live Preview</span>
            <span className="text-xs font-bold text-slate-800">Trực quan hóa bản in thực tế</span>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setPreviewDocTab('invoice')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewDocTab === 'invoice' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mẫu In Hóa Đơn
            </button>
            <button
              onClick={() => setPreviewDocTab('quotation')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewDocTab === 'quotation' 
                  ? 'bg-white text-indigo-700 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mẫu Bản Báo Giá PC
            </button>
          </div>
        </div>

        {/* CONTAINER SHEART DYNAMIC DESIGN CANVAS */}
        <div 
          className="bg-slate-400/10 border-2 border-dashed border-slate-300 rounded-3xl p-6 md:p-8 flex items-center justify-center min-h-[500px]"
          style={{ transition: 'all 0.3s ease' }}
        >
          {/* THE PAPER SHEET MOCKUP WRAPPER */}
          <div 
            className={`bg-white text-slate-800 shadow-xl border border-slate-200 relative p-6 font-sans mx-auto transition-all duration-300 leading-normal ${
              formState.paperSize === 'k80' 
                ? 'w-full max-w-[320px] rounded-lg' 
                : formState.paperSize === 'k57'
                  ? 'w-full max-w-[260px] rounded-sm'
                  : 'w-full max-w-[580px] rounded-2xl min-h-[640px]'
            }`}
            style={{ 
              fontSize: formState.fontSize === 'sm' ? '11px' : formState.fontSize === 'lg' ? '15px' : '13px' 
            }}
          >
            {/* BRANDING TOP HIGHLIGHT LINE */}
            <div className="h-1.5 w-full rounded-t" style={{ backgroundColor: formState.primaryColor }}></div>
            
            {/* MOCK DOCUMENT CONTENT */}
            <div className="mt-4 space-y-4">
              
              {/* BRAND HEADER MODULE */}
              <div className={`flex ${formState.paperSize !== 'a4' ? 'flex-col items-center text-center gap-2' : 'flex-row items-center justify-start gap-4'}`}>
                
                {formState.showLogoSymbol && (
                  <div className={`flex-shrink-0 flex items-center justify-center`}>
                    {formState.storeLogoImage ? (
                       <img src={formState.storeLogoImage} style={{ width: formState.paperSize === 'a4' ? `${formState.storeLogoWidth || 120}px` : `${(formState.storeLogoWidth || 120)*0.5}px`, objectFit: 'contain' }} alt="Logo" />
                    ) : (
                      <div 
                        className={`rounded-full flex items-center justify-center font-bold text-white ring-4 ring-slate-100 ${formState.paperSize === 'a4' ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-sm'}`}
                        style={{ backgroundColor: formState.primaryColor, width: formState.paperSize === 'a4' ? `${formState.storeLogoWidth || 120}px` : `${(formState.storeLogoWidth || 120) * 0.5}px`, height: formState.paperSize === 'a4' ? `${formState.storeLogoWidth || 120}px` : `${(formState.storeLogoWidth || 120) * 0.5}px` }}
                      >
                        {formState.storeLogoText || 'TP'}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`flex-1 font-serif ${formState.paperSize !== 'a4' ? 'text-center' : 'text-left'}`} style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                  <h4 className={`font-bold uppercase tracking-tight leading-tight ${formState.paperSize === 'a4' ? 'text-lg' : 'text-[12px]'}`} style={{ color: formState.primaryColor }}>
                    {formState.storeName || 'THỊNH PHÁT COMPUTER'}
                  </h4>
                  
                  {formState.storeSlogan && (
                    <p className={`text-slate-600 font-bold italic tracking-wide mt-0.5 ${formState.paperSize === 'a4' ? 'text-[0.6rem]' : 'text-[7px]'}`}>{formState.storeSlogan}</p>
                  )}

                  <div className={`text-slate-800 font-medium ${formState.paperSize === 'a4' ? 'text-[0.75rem]' : 'text-[8.5px]'} mt-1 space-y-0.5 leading-snug`}>
                    <p><span className="font-bold">Địa chỉ:</span> {formState.storeAddress || 'Đang cập nhật địa chỉ...'}</p>
                    <p><span className="font-bold">Tel:</span> {formState.storePhone || 'Đang cập nhật số ĐT...'}</p>
                    {formState.storeWebsite && <p><span className="font-bold">Email:</span> {formState.storeWebsite}</p>}
                  </div>
                </div>
              </div>

              {/* DASHED HORIZONTAL SPLITTER */}
              <div className="border-t border-dashed border-slate-300 my-3" />

              {/* DOCUMENT CONTENT OR METADATA HEADER */}
              {previewDocTab === 'invoice' ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <h5 className="font-black tracking-normal uppercase text-sm" style={{ color: formState.primaryColor }}>
                      HÓA ĐƠN BÁN HÀNG
                    </h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Số: HDN2026_MOCK_889</p>
                  </div>

                  {/* Customer Information Block */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] font-semibold space-y-1 block leading-normal">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Khách hàng nhận hàng:</p>
                    <p>Họ và tên: <span className="font-bold text-slate-900">Bùi Huy Hoàng</span></p>
                    <p>Số điện thoại: <span className="font-bold text-slate-900">0982.888.xxx</span></p>
                    <p>Nhân viên xử lý: <span className="font-bold text-slate-600">Lê Thị Bán Hàng</span></p>
                  </div>

                  {/* Products purchased loop */}
                  <div>
                    <h6 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Sản phẩm bàn giao:</h6>
                    <div className="space-y-1.5">
                      {sampleInvoiceItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs font-semibold">
                          <div className="pr-2 leading-tight">
                            <span className="text-slate-900">{item.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">SL: {item.qty} x {formatVND(item.sPrice)}</span>
                          </div>
                          <span className="font-bold text-slate-900 shrink-0">{formatVND(item.sPrice * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2" />

                  {/* Calculations invoice */}
                  <div className="text-xs font-semibold text-slate-705 space-y-1">
                    <div className="flex justify-between">
                      <span>Cộng tiền hàng:</span>
                      <span className="font-bold">{formatVND(sampleSubtotal)}</span>
                    </div>
                    {sampleDiscount > 0 && (
                      <div className="flex justify-between text-rose-650">
                        <span>Giảm giá / Ưu đãi:</span>
                        <span>-{formatVND(sampleDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-black border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                      <span className="uppercase" style={{ color: formState.primaryColor }}>Tổng thanh toán:</span>
                      <span className="text-indigo-650 font-black text-base">{formatVND(sampleTotal)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <h5 className="font-black tracking-normal uppercase text-sm" style={{ color: formState.primaryColor }}>
                      {formState.quoteTitle || 'BẢNG BÁO GIÁ KIÊM PHIẾU BẢO HÀNH'}
                    </h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Ngày lập báo giá: {new Date().toLocaleDateString('vi-VN')}</p>
                  </div>

                  {/* Customer Quote metadata info */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] font-semibold space-y-1 leading-normal block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thông tin người nhận báo giá:</p>
                    <p>Khách hàng: <span className="font-bold text-slate-900">Anh Minh Tuấn</span></p>
                    <p>Yêu cầu: <span className="text-slate-605">Dàn PC Thiết Kế Đồ Họa 3D / Render Video</span></p>
                  </div>

                  {/* Quotation items mock matrix */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse border border-slate-300 text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="border border-slate-300 py-1 px-1 text-center">STT</th>
                          <th className="border border-slate-300 py-1 px-1 text-left">SẢN PHẨM</th>
                          <th className="border border-slate-300 py-1 px-1 text-center">SL</th>
                          <th className="border border-slate-300 py-1 px-1 text-right">ĐƠN GIÁ</th>
                          {formState.showQuoteWarrantyColumn !== false && (
                            <th className="border border-slate-300 py-1 px-1 text-center">BH</th>
                          )}
                          {formState.showQuoteStockColumn !== false && (
                            <th className="border border-slate-300 py-1 px-1 text-center text-blue-700">TÌNH TRẠNG</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: "CPU Intel Core i7-14700F", qty: 1, price: 9850000, bh: "36T" },
                          { name: "Mainboard MSI B760M Mortar Wifi", qty: 1, price: 3850000, bh: "36T" },
                          { name: "RAM Corsair Vengeance 32GB", qty: 2, price: 2150000, bh: "36T" },
                          { name: "VGA Giga RTX 4060 WindForce 8G", qty: 1, price: 8250000, bh: "36T" }
                        ].map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="border border-slate-300 py-1 text-center font-bold">{idx + 1}</td>
                            <td className="border border-slate-300 py-1 px-1.5 font-semibold text-slate-900">{item.name}</td>
                            <td className="border border-slate-300 py-1 text-center font-bold">{item.qty}</td>
                            <td className="border border-slate-300 py-1 text-right px-1 font-semibold">{formatVND(item.price)}</td>
                            {formState.showQuoteWarrantyColumn !== false && (
                              <td className="border border-slate-300 py-1 text-center text-slate-600 font-bold">{item.bh}</td>
                            )}
                            {formState.showQuoteStockColumn !== false && (
                              <td className="border border-slate-300 py-1 text-center font-extrabold text-blue-700 uppercase text-[9px]">{formState.quoteStockStatusText || 'SẴN HÀNG'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2" />

                  {/* Calculations quotation */}
                  <div className="text-xs font-semibold text-slate-705 space-y-1">
                    <div className="flex justify-between items-center text-xs font-black border-t border-dashed border-slate-205 pt-1.5 mt-1.5">
                      <span className="uppercase" style={{ color: formState.primaryColor }}>TỔNG CỘNG CẤU HÌNH BAO GỒM VAT:</span>
                      <span className="text-indigo-655 font-black text-sm">{formatVND(26250000)}</span>
                    </div>
                  </div>

                  {/* Warranty Terms preview */}
                  {formState.showQuoteWarrantyTerms !== false && (formState.quoteWarrantyTerms?.length || 0) > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-700 space-y-0.5">
                      <p className="font-bold uppercase text-slate-800" style={{ color: formState.primaryColor }}>MỘT SỐ QUY ĐỊNH BẢO HÀNH:</p>
                      <ul className="list-decimal pl-3 space-y-0.5 font-medium">
                        {(formState.quoteWarrantyTerms || []).filter(t => t.trim()).slice(0, 3).map((term, i) => (
                          <li key={i}>{term}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Vat & Validity notes preview */}
                  {(formState.quoteVatNote || formState.quoteValidityNote) && (
                    <div className="text-[9px] font-bold text-slate-500 italic space-y-0.5">
                      {formState.quoteVatNote && <p>{formState.quoteVatNote}</p>}
                      {formState.quoteValidityNote && <p>{formState.quoteValidityNote}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* INTERACTIVE QR PAY SERVICE ACCORDING TO FORM STATE */}
              {formState.bankId && formState.bankAccountNo && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 block text-center space-y-2 mt-4 max-w-[280px] mx-auto">
                  <span className="inline-flex text-[9px] font-black uppercase text-indigo-705 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-lg">
                    Quét Chuyển Khoản 1 Chạm
                  </span>
                  
                  {/* Dynamic VietQR download image loader inside preview */}
                  <div className="relative group bg-white p-2 rounded-xl inline-block border border-slate-200/80 transition shadow-sm">
                    <img 
                      src={getVietQrUrl(
                        previewDocTab === 'invoice' ? sampleTotal : 28300000, 
                        previewDocTab === 'invoice' ? 'HDN2026_MOCK_889' : 'BAO GIA PC TUAN'
                      )}
                      alt="VietQR Payment Dynamic Code"
                      className="w-36 h-36 mx-auto object-contain transition group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="text-[10px] space-y-0.5 font-bold text-slate-700 leading-normal">
                    <p className="text-slate-900">🏦 {BANKS.find(b => b.id === formState.bankId)?.name?.split(' (')[0] || formState.bankId}</p>
                    <p>Số tài khoản: <span className="font-extrabold text-indigo-650 underline">{formState.bankAccountNo}</span></p>
                    <p className="uppercase leading-tight text-slate-500 mt-1">Chủ tài khoản: {formState.bankAccountName || 'NGUYEN VAN THINH'}</p>
                  </div>
                </div>
              )}

              {/* DASHED HORIZONTAL SPLITTER */}
              <div className="border-t border-dashed border-slate-300 my-3" />

              {/* DYNAMIC COMPREHENSIVE NOTE OR TERMS */}
              <div className="text-center text-[10px] leading-relaxed text-slate-500 italic max-w-sm mx-auto">
                <p className="font-semibold text-slate-650">{formState.storeNote || 'Cảm ơn quý khách đã tin dùng!'}</p>
                
                {formState.storeWebsite && (
                  <p className="text-[9px] text-slate-405 font-bold mt-1 uppercase tracking-wide">Trang web hỗ trợ: {formState.storeWebsite}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tip section */}
        <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 flex gap-2.5 text-amber-900">
          <BadgeHelp className="w-4 h-4 shrink-0 mt-0.5 text-amber-605" />
          <div className="text-[11px] leading-relaxed font-semibold">
            <span className="font-extrabold text-amber-950 block mb-0.5">💡 Mẹo In Ấn Tối Ưu:</span>
            Khi in biểu mẫu, trình duyệt của bạn sẽ tự động đồng bộ hóa màu sắc chủ đạo và định dạng. Bạn nên tick chọn <span className="underline">"In hình nền / Background graphics"</span> trong hộp thoại Print cài đặt của máy tính để nhận diện đúng tông màu thương hiệu.
          </div>
        </div>
      </div>
    </div>
  );
}
