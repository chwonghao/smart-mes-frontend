import { useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { SettingProvider } from './contexts/SettingContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const themeValue = useMemo(
    () => ({
      isDarkMode,
      toggleTheme: () => setIsDarkMode((prev) => !prev),
    }),
    [isDarkMode]
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          borderRadius: 10,
          colorPrimary: '#2563eb',
        },
      }}
    >
      <ThemeProvider value={themeValue}>
        <div className={isDarkMode ? 'app-dark min-h-screen' : 'app-light min-h-screen'}>
          <BrowserRouter>
            <AuthProvider>
              <SettingProvider>
                <AppRoutes />
              </SettingProvider>
            </AuthProvider>
          </BrowserRouter>
        </div>
      </ThemeProvider>
    </ConfigProvider>
  );
}

export default App;