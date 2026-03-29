import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSystemSettings } from '../services/setting.service';

interface SettingContextType {
  settings: Record<string, string>;
  refreshSettings: () => Promise<void>;
}

const SettingContext = createContext<SettingContextType>({ settings: {}, refreshSettings: async () => {} });

export const SettingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});

  const refreshSettings = async () => {
    try {
      // Kiểm tra user đã đăng nhập bằng role (token được lưu ở HttpOnly cookie)
      if (localStorage.getItem('role')) {
        const data = await getSystemSettings();
        setSettings(data);
      }
    } catch (error) {
      console.error("Không thể tải cấu hình toàn cục", error);
    }
  };

  // Tải cấu hình ngay khi bọc Provider
  useEffect(() => { refreshSettings(); }, []);

  return (
    <SettingContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingContext.Provider>
  );
};

export const useSettings = () => useContext(SettingContext);