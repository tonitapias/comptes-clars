import React from 'react';
import { Navigate } from 'react-router-dom';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
  redirectPath?: string;
}

export default function ProtectedRoute({ user, children, redirectPath = '/' }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}