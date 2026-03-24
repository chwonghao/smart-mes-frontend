import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: JSX.Element;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate replace to="/login" />;
  }
  if (role === 'ROLE_WORKER' && !location.pathname.startsWith('/mobile')) {
    return <Navigate replace to="/mobile/scan" />;
  }
  if (requiredRole && role !== requiredRole) {
    return <Navigate replace to="/" />;
  }

  return children;
};

export default ProtectedRoute;