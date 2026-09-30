'use client';

import { useAuth } from '@/hooks/use-auth';
import { LoginPage } from '@/components/screens/login-page';
import { CustomerApp } from '@/components/customer/customer-app';
import { AdminApp } from '@/components/admin/admin-app';
import { LoadingScreen } from '@/components/shared/loading-screen';

export default function Home() {
 const { user, loading } = useAuth();

 if (loading) return <LoadingScreen label="Loading your workspace…" />;
 if (!user) return <LoginPage />;

 if (user.role === 'ADMIN') return <AdminApp />;
 if (user.role === 'CUSTOMER') return <CustomerApp />;
 // RESTAURANT / RIDER roles are admin-managed now (no login)
 return <div className="p-8 text-center">Unsupported role. Please contact admin.</div>;
}
