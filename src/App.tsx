import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <BrowserRouter>
      {/* Toàn bộ các trang (AppRoutes) sẽ được render vào phần {children} của MainLayout */}
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;