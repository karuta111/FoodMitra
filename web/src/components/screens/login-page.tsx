'use client';

import { useState } from 'react';
import { useAuth, ApiError } from '@/hooks/use-auth';
import { toastApiError } from '@/lib/toast-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User as UserIcon, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { triggerMsg91OtpWidget, isMsg91WidgetConfigured } from '@/lib/msg91-widget';
import { BrandLogo } from '@/components/shared/brand-logo';
import { PhoneInput } from '@/components/ui/phone-input';

// Customer customer-mode sub-states
type CustomerScreen =
 | 'login' // phone + password (works for both customer AND admin — role is determined by the user record)
 | 'register_details' // name + phone + password (step 1 of register)
 | 'register_otp' // OTP entry (step 2 of register)
 | 'forgot_phone' // phone entry (step 1 of forgot password)
 | 'forgot_reset'; // OTP + new password (step 2 of forgot password)

// Demo credentials for the login screen
const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE || '+919999999999';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
const DEMO_CUSTOMER_PHONE = '+919800001000';
const DEMO_CUSTOMER_PASSWORD = 'customer123';

export function LoginPage() {
 const { login, register } = useAuth();
 const [screen, setScreen] = useState<CustomerScreen>('login');
 const [loading, setLoading] = useState(false);
 const [showPassword, setShowPassword] = useState(false);

 // Shared form state
 const [fullName, setFullName] = useState('');
 const [phone, setPhone] = useState('');
 const [password, setPassword] = useState('');
 const [otp, setOtp] = useState('');
 const [demoOtp, setDemoOtp] = useState<string | null>(null); // shown in demo mode only
 const [otpCooldown, setOtpCooldown] = useState(0);
 const [dateOfBirth, setDateOfBirth] = useState('');
 const [anniversaryDate, setAnniversaryDate] = useState('');

 // OTP cooldown timer
 const startCooldown = () => {
 setOtpCooldown(60);
 const t = setInterval(() => {
 setOtpCooldown((c) => {
 if (c <= 1) { clearInterval(t); return 0; }
 return c - 1;
 });
 }, 1000);
 };

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 // Login works for BOTH customer and admin — the backend returns the user's actual role,
 // and the frontend routes to the admin dashboard or customer app based on that role.
 // The "fixed admin mobile number" is just the admin user's phone in the DB
 // (seeded as +919999999999 / admin123 by default).
 const user = await login(phone, password);
 toast.success(`Welcome back${user.fullName ? `, ${user.fullName}` : ''}!`);
 } catch (err) {
 toastApiError(err, 'Login failed');
 } finally {
 setLoading(false);
 }
 };

 // Step 1 of register: send OTP via MSG91 widget (if configured) OR demo mode.
 const sendRegisterOtp = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setDemoOtp(null);
 try {
 if (isMsg91WidgetConfigured()) {
 const widgetResult = await triggerMsg91OtpWidget(phone);
 await api.post<{ verified: boolean; verifiedPhone: string; message: string }>(
 '/api/v1/auth/verify-widget-token',
 { accessToken: widgetResult.accessToken, phone, purpose: 'SIGNUP' },
 );
 const user = await register({ fullName, phone, password, dateOfBirth, anniversaryDate });
 toast.success(`Welcome to FoodMitra, ${user.fullName || ''}!`);
 } else {
 const res = await api.post<{ message: string; otp?: string; expiresInSec: number; provider: string }>(
 '/api/v1/auth/send-otp',
 { phone, purpose: 'SIGNUP' },
 );
 setDemoOtp(res.otp ?? null);
 startCooldown();
 setScreen('register_otp');
 toast.success('OTP sent to your mobile number');
 }
 } catch (err) {
 if (err instanceof Error && !('code' in err)) {
 toast.error(err.message || 'OTP verification failed');
 } else {
 toastApiError(err, 'Failed to send OTP');
 }
 } finally {
 setLoading(false);
 }
 };

 // Step 2 of register: verify OTP + create account (demo mode only)
 const handleRegister = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const user = await register({ fullName, phone, password, otp, dateOfBirth, anniversaryDate });
 toast.success(`Welcome to FoodMitra, ${user.fullName || ''}!`);
 } catch (err) {
 toastApiError(err, 'Registration failed');
 } finally {
 setLoading(false);
 }
 };

 // Forgot password — step 1: trigger MSG91 widget (if configured) OR send demo OTP
 const sendForgotOtp = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setDemoOtp(null);
 try {
 if (isMsg91WidgetConfigured()) {
 const widgetResult = await triggerMsg91OtpWidget(phone);
 await api.post<{ verified: boolean; verifiedPhone: string; message: string }>(
 '/api/v1/auth/verify-widget-token',
 { accessToken: widgetResult.accessToken, phone, purpose: 'FORGOT_PASSWORD' },
 );
 startCooldown();
 setScreen('forgot_reset');
 toast.success('Phone verified. Set your new password.');
 } else {
 const res = await api.post<{ message: string; otp?: string; expiresInSec: number }>(
 '/api/v1/auth/forgot-password',
 { phone },
 );
 setDemoOtp(res.otp ?? null);
 startCooldown();
 setScreen('forgot_reset');
 toast.success('OTP sent to your mobile number');
 }
 } catch (err) {
 if (err instanceof Error && !('code' in err)) {
 toast.error(err.message || 'OTP verification failed');
 } else {
 toastApiError(err, 'Failed to send OTP');
 }
 } finally {
 setLoading(false);
 }
 };

 // Forgot password — step 2: set new password (phone already verified via widget) OR verify OTP + set password (demo)
 const handleResetPassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 await api.post<{ message: string }>('/api/v1/auth/reset-password', {
 phone, password, ...(otp ? { otp } : {}),
 });
 toast.success('Password reset successful. You can now log in.');
 setOtp(''); setPassword(''); setDemoOtp(null);
 setScreen('login');
 } catch (err) {
 toastApiError(err, 'Password reset failed');
 } finally {
 setLoading(false);
 }
 };

 const resetState = () => {
 setFullName(''); setPhone(''); setPassword(''); setOtp(''); setDemoOtp(null);
 setDateOfBirth(''); setAnniversaryDate('');
 setScreen('login');
 };

 return (
 <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-white ">
 <header className="px-6 py-5 flex items-center justify-between border-b border-slate-200 bg-white/60 backdrop-blur">
 <BrandLogo size="md" />
 </header>

 <div className="flex-1 flex items-center justify-center px-4 py-12">
 <div className="w-full max-w-md">
 <Card className="shadow-xl shadow-orange-100/50 border-orange-100 ">
 <CardHeader className="space-y-1">
 {screen !== 'login' && (
 <button
 type="button"
 onClick={resetState}
 className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-2"
 >
 <ArrowLeft className="w-3 h-3" /> Back to login
 </button>
 )}
 <CardTitle className="text-2xl text-slate-800 ">
 {screen === 'login'
 ? 'Welcome back'
 : screen === 'register_details'
 ? 'Create your account'
 : screen === 'register_otp'
 ? 'Verify your mobile'
 : screen === 'forgot_phone'
 ? 'Forgot password'
 : 'Reset password'}
 </CardTitle>
 <CardDescription>
 {screen === 'login'
 ? 'Sign in with your mobile number to continue ordering.'
 : screen === 'register_details'
 ? 'Enter your details — we\u2019ll send an OTP to verify your mobile.'
 : screen === 'register_otp'
 ? `Enter the 6-digit OTP sent to ${phone}${demoOtp ? ` (demo: ${demoOtp})` : ''}.`
 : screen === 'forgot_phone'
 ? 'Enter your registered mobile number — we\u2019ll send an OTP.'
 : `Enter the OTP sent to ${phone}${demoOtp ? ` (demo: ${demoOtp})` : ''} + your new password.`}
 </CardDescription>
 </CardHeader>

 <CardContent className="space-y-4">
 {screen === 'login' ? (
 // ============ LOGIN (works for both customer + admin) ============
 <form onSubmit={handleLogin} className="space-y-3">
 <div className="space-y-1.5">
 <Label htmlFor="phone">Mobile number</Label>
 <PhoneInput id="phone" required value={phone} onChange={setPhone} />
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label htmlFor="password">Password</Label>
 <button type="button" onClick={() => setScreen('forgot_phone')} className="text-xs text-orange-600 hover:underline">
 Forgot?
 </button>
 </div>
 <div className="relative">
 <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-9 pr-10"
 value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
 />
 <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
 {loading ? 'Signing in…' : 'Sign in'}
 </Button>
 <p className="text-center text-sm text-slate-600 ">
 Don&apos;t have an account?{' '}
 <button type="button" onClick={() => setScreen('register_details')} className="font-medium text-orange-600 hover:underline">
 Sign up
 </button>
 </p>

 {/* Demo credentials — both admin + customer use the same form */}
 <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
 <p className="text-xs font-medium text-slate-500 text-center">Demo credentials</p>
 <div className="grid grid-cols-1 gap-1.5 text-xs">
 <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded">
 <span className="text-slate-600 ">Admin</span>
 <code className="font-mono text-slate-700 ">{ADMIN_PHONE} / {ADMIN_PASSWORD}</code>
 </div>
 <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded">
 <span className="text-slate-600 ">Customer</span>
 <code className="font-mono text-slate-700 ">{DEMO_CUSTOMER_PHONE} / {DEMO_CUSTOMER_PASSWORD}</code>
 </div>
 </div>
 </div>
 </form>
 ) : screen === 'register_details' ? (
 // ============ REGISTER STEP 1: details ============
 <form onSubmit={sendRegisterOtp} className="space-y-3">
 <div className="space-y-1.5">
 <Label htmlFor="fullName">Full name</Label>
 <div className="relative">
 <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="fullName" placeholder="John Doe" className="pl-9"
 value={fullName} onChange={(e) => setFullName(e.target.value)} required
 />
 </div>
 </div>
 <div className="space-y-1.5">
 <Label htmlFor="reg-phone">Mobile number</Label>
 <PhoneInput id="reg-phone" required value={phone} onChange={setPhone} />
 </div>
 <div className="space-y-1.5">
 <Label htmlFor="reg-password">Password</Label>
 <div className="relative">
 <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="min 8 characters" className="pl-9 pr-10"
 value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
 />
 <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 {/* Date of birth — used by admin to see today's birthdays */}
 <div className="space-y-1.5">
 <Label htmlFor="reg-dob">Date of birth <span className="text-slate-400 text-xs">(optional)</span></Label>
 <Input
 id="reg-dob" type="date" className="pl-3"
 value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
 max={new Date().toISOString().slice(0, 10)}
 />
 </div>
 {/* Wedding anniversary — used by admin to see today's anniversaries */}
 <div className="space-y-1.5">
 <Label htmlFor="reg-anniv">Anniversary date <span className="text-slate-400 text-xs">(optional)</span></Label>
 <Input
 id="reg-anniv" type="date" className="pl-3"
 value={anniversaryDate} onChange={(e) => setAnniversaryDate(e.target.value)}
 max={new Date().toISOString().slice(0, 10)}
 />
 </div>
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
 {loading ? 'Verifying phone…' : 'Verify phone & Sign up'}
 </Button>
 <p className="text-center text-sm text-slate-600 ">
 Already have an account?{' '}
 <button type="button" onClick={() => setScreen('login')} className="font-medium text-orange-600 hover:underline">
 Sign in
 </button>
 </p>
 </form>
 ) : screen === 'register_otp' ? (
 // ============ REGISTER STEP 2: OTP ============
 <form onSubmit={handleRegister} className="space-y-3">
 {demoOtp && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 text-center">
 <strong>Demo OTP:</strong> <code className="font-mono text-lg tracking-wider">{demoOtp}</code>
 <p className="text-xs mt-1 opacity-80">In production, this would be sent via MSG91 SMS.</p>
 </div>
 )}
 <div className="space-y-1.5">
 <Label htmlFor="otp">Enter 6-digit OTP</Label>
 <div className="relative">
 <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="otp" inputMode="numeric" maxLength={6} placeholder="123456" className="pl-9 text-lg tracking-[0.5em] font-mono"
 value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required
 />
 </div>
 </div>
 <Button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-orange-500 hover:bg-orange-600">
 {loading ? 'Verifying…' : 'Verify & create account'}
 </Button>
 <div className="flex items-center justify-between text-xs">
 <button
 type="button"
 onClick={async () => {
 if (otpCooldown > 0) return;
 setLoading(true);
 try {
 const res = await api.post<{ otp?: string }>('/api/v1/auth/send-otp', { phone, purpose: 'SIGNUP' });
 setDemoOtp(res.otp ?? null);
 startCooldown();
 toast.success('OTP resent');
 } catch (err) { toastApiError(err, 'Failed to resend OTP'); }
 finally { setLoading(false); }
 }}
 disabled={otpCooldown > 0}
 className="text-orange-600 hover:underline disabled:text-slate-400 disabled:no-underline"
 >
 {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
 </button>
 <button type="button" onClick={() => setScreen('register_details')} className="text-slate-500 hover:underline">
 Change number
 </button>
 </div>
 </form>
 ) : screen === 'forgot_phone' ? (
 // ============ FORGOT PASSWORD STEP 1: phone ============
 <form onSubmit={sendForgotOtp} className="space-y-3">
 <div className="space-y-1.5">
 <Label htmlFor="forgot-phone">Registered mobile number</Label>
 <PhoneInput id="forgot-phone" required value={phone} onChange={setPhone} />
 </div>
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
 {loading ? 'Verifying phone…' : 'Verify phone'}
 </Button>
 </form>
 ) : screen === 'forgot_reset' ? (
 // ============ FORGOT PASSWORD STEP 2: OTP + new password (demo) OR set new password (widget) ============
 <form onSubmit={handleResetPassword} className="space-y-3">
 {demoOtp && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 text-center">
 <strong>Demo OTP:</strong> <code className="font-mono text-lg tracking-wider">{demoOtp}</code>
 <p className="text-xs mt-1 opacity-80">In production, this would be sent via MSG91 SMS.</p>
 </div>
 )}
 {!demoOtp && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 text-center">
 ✓ Phone verified. Set your new password below.
 </div>
 )}
 {demoOtp && (
 <div className="space-y-1.5">
 <Label htmlFor="forgot-otp">Enter 6-digit OTP</Label>
 <div className="relative">
 <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="forgot-otp" inputMode="numeric" maxLength={6} placeholder="123456" className="pl-9 text-lg tracking-[0.5em] font-mono"
 value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required
 />
 </div>
 </div>
 )}
 <div className="space-y-1.5">
 <Label htmlFor="forgot-password">New password</Label>
 <div className="relative">
 <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 id="forgot-password" type={showPassword ? 'text' : 'password'} placeholder="min 8 characters" className="pl-9 pr-10"
 value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
 />
 <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <Button type="submit" disabled={loading || password.length < 8 || (demoOtp ? otp.length !== 6 : false)} className="w-full bg-orange-500 hover:bg-orange-600">
 {loading ? 'Resetting…' : 'Reset password'}
 </Button>
 {demoOtp && (
 <button
 type="button"
 onClick={async () => {
 if (otpCooldown > 0) return;
 setLoading(true);
 try {
 const res = await api.post<{ otp?: string }>('/api/v1/auth/forgot-password', { phone });
 setDemoOtp(res.otp ?? null);
 startCooldown();
 toast.success('OTP resent');
 } catch (err) { toastApiError(err, 'Failed to resend OTP'); }
 finally { setLoading(false); }
 }}
 disabled={otpCooldown > 0}
 className="w-full text-xs text-orange-600 hover:underline disabled:text-slate-400 disabled:no-underline"
 >
 {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
 </button>
 )}
 </form>
 ) : null}
 </CardContent>
 </Card>

 <p className="mt-6 text-center text-xs text-slate-500 ">
 By continuing, you agree to FoodMitra&apos;s Terms of Service and Privacy Policy.
 </p>
 </div>
 </div>
 </div>
 );
}
