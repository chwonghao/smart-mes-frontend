import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSystemSettings } from '../services/setting.service';
import { useAuth } from './AuthContext';

interface SettingContextType {
  settings: Record<string, string>;
  refreshSettings: () => Promise<void>;
}

const SettingContext = createContext<SettingContextType>({ settings: {}, refreshSettings: async () => {} });

export const SettingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { isAuthenticated, isLoading } = useAuth();

  const refreshSettings = async () => {
    try {
      // Chỉ tải settings khi session xác thực đã sẵn sàng
      if (!isAuthenticated) {
        setSettings({});
        return;
      }

      const data = await getSystemSettings();
      const normalizedSettings = Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, String(value ?? '')])
      ) as Record<string, string>;

      setSettings(normalizedSettings);
    } catch (error) {
      console.error("Không thể tải cấu hình toàn cục", error);
    }
  };

  // Tải cấu hình ngay khi bọc Provider
  useEffect(() => {
    if (!isLoading) {
      void refreshSettings();
    }
  }, [isLoading, isAuthenticated]);

  return (
    <SettingContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </SettingContext.Provider>
  );
};

export const useSettings = () => useContext(SettingContext);