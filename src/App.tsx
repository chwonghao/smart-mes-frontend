import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { SettingProvider } from './contexts/SettingContext';

function App() {
  return (
    <BrowserRouter>
      <SettingProvider>
        <AppRoutes />
      </SettingProvider>
    </BrowserRouter>
  );
}

export default App;