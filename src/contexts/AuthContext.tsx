import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../services/apiClient';
import type { ApiResponse } from '../types/api.type';

export interface AuthUser {
  username: string;
  fullName: string;
  role: string;
  tenantId: string;
  workCenterId?: number | null;
  workCenterName?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (user: AuthUser | null) => void;
  refreshSession: () => Promise<AuthUser | null>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setSession: () => {},
  refreshSession: async () => null,
  clearSession: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await apiClient.get<ApiResponse<AuthUser>>('/users/me');
      setUser(response.data);
      return response.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSession = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    setIsLoading(false);
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setSession,
      refreshSession,
      clearSession,
    }),
    [user, isLoading, setSession, refreshSession, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
