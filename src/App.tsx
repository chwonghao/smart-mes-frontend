import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <BrowserRouter>
      {/* Đã bỏ thẻ div bọc bên ngoài */}
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;