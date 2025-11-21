
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePremium?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requirePremium = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Carregando...</div>;

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requirePremium && user.plan !== 'premium') {
    // Se a rota exige premium e usuário é free, manda pra página de preços
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
