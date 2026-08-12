import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    try {
      localStorage.removeItem('thinhphat_v2_current_user');
      localStorage.removeItem('thinhphat_v2_last_activity');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400 text-3xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">THỊNH PHÁT COMPUTER</h2>
              <p className="text-sm font-bold text-slate-300">Đã xảy ra sự cố giao diện ngoài dự kiến</p>
              <p className="text-xs text-slate-400">Hệ thống đã tự động khôi phục an toàn để tránh mất dữ liệu. Vui lòng bấm nút bên dưới để quay lại màn hình đăng nhập.</p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto text-[11px] font-mono text-rose-300 max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl transition cursor-pointer shadow-md"
            >
              🔄 Tải Lại Hệ Thống & Đăng Nhập
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
