import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: JSX.Element;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  // Kiểm tra role từ localStorage (được set khi đăng nhập)
  // Token được lưu ở HttpOnly cookie và tự động gửi bởi Axios
  const role = localStorage.getItem('role');

  if (!role) {
    // Chưa đăng nhập, redirect tới login
    return <Navigate replace to="/login" />;
  }
  
  if (role === 'ROLE_WORKER' && !location.pathname.startsWith('/mobile')) {
    // Worker chỉ được vào mobile flow
    return <Navigate replace to="/mobile/scan" />;
  }
  
  if (requiredRole && role !== requiredRole) {
    // Không đủ quyền truy cập
    return <Navigate replace to="/" />;
  }

  return children;
};

export default ProtectedRoute;