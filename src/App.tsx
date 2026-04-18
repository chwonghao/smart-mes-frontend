import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { SettingProvider } from './contexts/SettingContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingProvider>
          <AppRoutes />
        </SettingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;