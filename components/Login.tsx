
import React, { useState } from 'react';
import { User } from '../types';
import * as DataService from '../services/dataService';
import Modal from './Modal';

interface LoginProps {
    onLoginSuccess: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Quản lý cấu hình URL ngay tại Login
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tempUrl, setTempUrl] = useState(DataService.getApiUrl());
    const [testMessage, setTestMessage] = useState<{s: boolean, m: string} | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Fetch dữ liệu mới nhất
            const result = await DataService.fetchData();
            const users = result.data.users || [];

            if (users.length === 0) {
                setError('Không tìm thấy danh sách người dùng. Vui lòng kiểm tra lại URL App Script trong phần Cài đặt (biểu tượng bánh răng).');
                setLoading(false);
                return;
            }

            const user = users.find(u => {
                const sheetUser = String(u.username || '').trim();
                const sheetPass = String(u.password || '').trim();
                return sheetUser.toLowerCase() === username.trim().toLowerCase() && 
                       sheetPass === password.trim();
            });

            if (user) {
                const userSession = { ...user };
                delete userSession.password;
                DataService.setCurrentUser(userSession);
                onLoginSuccess(userSession);
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
            }
        } catch (err) {
            setError('Lỗi kết nối: Không thể truy cập máy chủ. Hãy kiểm tra URL App Script và kết nối mạng.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUrl = () => {
        if (tempUrl.includes('/exec')) {
            DataService.saveApiUrl(tempUrl);
            setIsSettingsOpen(false);
            setTestMessage(null);
            setError(null);
        } else {
            setTestMessage({s: false, m: 'URL phải kết thúc bằng /exec'});
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6 z-[100]">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-8 animate-slide-up relative">
                {/* Nút cài đặt URL cho người dùng chưa đăng nhập */}
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-primary transition-colors bg-slate-50 rounded-full"
                    title="Cấu hình kết nối"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Khoa Nội</h1>
                    <p className="text-slate-500 text-sm mt-1">Hệ thống quản lý công việc</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Tên đăng nhập</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </span>
                            <input 
                                required 
                                type="text" 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Nhập username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Mật khẩu</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </span>
                            <input 
                                required 
                                type="password" 
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl flex items-start border border-red-100 animate-fade-in">
                            <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="leading-tight">{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Đang xác thực...</span>
                            </>
                        ) : (
                            <span>Đăng nhập</span>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Phiên bản 2.0.1</p>
                </div>
            </div>

            {/* Modal cài đặt URL */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Cấu hình kết nối">
                <div className="space-y-4">
                    <p className="text-xs text-slate-500 italic">Nhập URL Google Apps Script của bạn để kết nối dữ liệu.</p>
                    <input 
                        type="url" 
                        className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={tempUrl}
                        onChange={e => setTempUrl(e.target.value)}
                    />
                    {testMessage && (
                        <p className={`text-xs font-medium ${testMessage.s ? 'text-green-600' : 'text-red-600'}`}>
                            {testMessage.m}
                        </p>
                    )}
                    <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500">Hủy</button>
                        <button onClick={handleSaveUrl} className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg shadow-md">Lưu cấu hình</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Login;
