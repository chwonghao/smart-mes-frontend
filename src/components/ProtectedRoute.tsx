import type { JSX } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface Props {
  children: JSX.Element;
  requiredRole?: string;
  allowWorkerOnly?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, allowWorkerOnly = false }: Props) => {
  const location = useLocation();
  const role = localStorage.getItem('role');

  if (!role) {
    return <Navigate replace to="/login" state={{ from: location }} />;
  }

  if (allowWorkerOnly && role !== 'ROLE_WORKER') {
    return <Navigate replace to="/" />;
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