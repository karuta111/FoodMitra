'use client';

import { useState } from 'react';
import { useAuth, ApiError } from '@/hooks/use-auth';
import { toastApiError } from '@/lib/toast-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, User as UserIcon, Eye, EyeOff, KeyRound, ArrowLeft, Smartphone, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { triggerMsg91OtpWidget, isMsg91WidgetConfigured } from '@/lib/msg91-widget';
import { PhoneInput } from '@/components/ui/phone-input';

// Customer customer-mode sub-states
type CustomerScreen =
 | 'login' // phone + password (works for both customer AND admin — role is determined by the user record)
 | 'register_details' // name + phone + password (step 1 of register)
 | 'register_otp' // OTP entry (step 2 of register)
 | 'forgot_phone' // phone entry (step 1 of forgot password)
 | 'forgot_reset'; // OTP + new password (step 2 of forgot password)

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

 // Map screen → which segmented tab is active (only login + register_details are "top-level"; the
 // OTP / forgot sub-screens inherit from their parent so the tab highlight stays sensible).
 const isLoginTab = screen === 'login' || screen === 'forgot_phone' || screen === 'forgot_reset';
 const isSignupTab = screen === 'register_details' || screen === 'register_otp';

 return (
 <div className="min-h-screen flex flex-col lg:flex-row bg-white">
 {/* ───────────────────── LEFT: Branding panel (orange→red gradient) ───────────────────── */}
 <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white p-10 flex-col justify-between relative overflow-hidden">
 {/* Subtle dot pattern overlay */}
 <div
 className="absolute inset-0 opacity-10 pointer-events-none"
 style={{
 backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
 backgroundSize: '22px 22px',
 }}
 />
 {/* Logo top-left */}
 <div className="flex items-center gap-2.5 relative">
 <div className="bg-white/20 backdrop-blur w-10 h-10 rounded-xl flex items-center justify-center">
 <UtensilsCrossed className="w-5 h-5" />
 </div>
 <span className="font-bold text-xl">FoodMitra</span>
 </div>
 {/* Hero copy center */}
 <div className="relative space-y-3 max-w-md">
 <h1 className="text-3xl xl:text-4xl font-bold leading-tight">Good food, delivered to your door.</h1>
 <p className="text-white/80 text-sm xl:text-base">
 Order from your favourite restaurants across the city. Fresh, hot, and on time — every single time.
 </p>
 </div>
 {/* Trust badges + footer */}
 <div className="relative space-y-4">
 <div className="space-y-1.5 text-sm">
 <div className="flex items-center gap-2">
 <UtensilsCrossed className="w-4 h-4 opacity-80" />
 <span>7+ restaurants</span>
 </div>
 <div className="flex items-center gap-2">
 <ShieldCheck className="w-4 h-4 opacity-80" />
 <span>Secure payments</span>
 </div>
 </div>
 <p className="text-xs text-white/60">© 2026 FoodMitra. All rights reserved.</p>
 </div>
 </div>

 {/* ───────────────────── RIGHT: Form panel (white) ───────────────────── */}
 <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
 <div className="w-full max-w-md">
 {/* Segmented tabs (Log in / Sign up) — only shown on the two top-level screens */}
 <div className="flex bg-slate-100 rounded-full p-1 mb-6">
 <button
 type="button"
 onClick={() => setScreen('login')}
 className={cn(
 'flex-1 py-2 text-sm font-medium rounded-full transition-colors',
 isLoginTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
 )}
 >
 Log in
 </button>
 <button
 type="button"
 onClick={() => setScreen('register_details')}
 className={cn(
 'flex-1 py-2 text-sm font-medium rounded-full transition-colors',
 isSignupTab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
 )}
 >
 Sign up
 </button>
 </div>

 {/* Back link for sub-screens */}
 {screen !== 'login' && screen !== 'register_details' && (
 <button
 type="button"
 onClick={resetState}
 className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 mb-3"
 >
 <ArrowLeft className="w-3 h-3" /> Back
 </button>
 )}

 {/* Header */}
 <div className="mb-6">
 <h2 className="text-2xl font-bold text-slate-900">
 {screen === 'login'
 ? 'Welcome back'
 : screen === 'register_details'
 ? 'Create your account'
 : screen === 'register_otp'
 ? 'Verify your mobile'
 : screen === 'forgot_phone'
 ? 'Forgot password'
 : 'Reset password'}
 </h2>
 <p className="text-sm text-slate-500 mt-1">
 {screen === 'login'
 ? 'Log in with your 10-digit mobile number.'
 : screen === 'register_details'
 ? 'Enter your details — we\u2019ll send an OTP to verify your mobile.'
 : screen === 'register_otp'
 ? `Enter the 6-digit OTP sent to ${phone}${demoOtp ? ` (demo: ${demoOtp})` : ''}.`
 : screen === 'forgot_phone'
 ? 'Enter your registered mobile number — we\u2019ll send an OTP.'
 : `Enter the OTP sent to ${phone}${demoOtp ? ` (demo: ${demoOtp})` : ''} + your new password.`}
 </p>
 </div>

 {/* ============ LOGIN (works for both customer + admin) ============ */}
 {screen === 'login' && (
 <form onSubmit={handleLogin} className="space-y-4">
 <div className="space-y-1.5">
 <Label htmlFor="phone">Phone number</Label>
 <div className="relative">
 <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <PhoneInput id="phone" required value={phone} onChange={setPhone} />
 </div>
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
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
 {loading ? 'Logging in…' : 'Log in'}
 </Button>
 </form>
 )}

 {/* ============ REGISTER STEP 1: details ============ */}
 {screen === 'register_details' && (
 <form onSubmit={sendRegisterOtp} className="space-y-4">
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
 id="reg-dob" type="date"
 value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
 max={new Date().toISOString().slice(0, 10)}
 />
 </div>
 {/* Wedding anniversary — used by admin to see today's anniversaries */}
 <div className="space-y-1.5">
 <Label htmlFor="reg-anniv">Anniversary date <span className="text-slate-400 text-xs">(optional)</span></Label>
 <Input
 id="reg-anniv" type="date"
 value={anniversaryDate} onChange={(e) => setAnniversaryDate(e.target.value)}
 max={new Date().toISOString().slice(0, 10)}
 />
 </div>
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
 {loading ? 'Verifying phone…' : 'Verify phone & Sign up'}
 </Button>
 </form>
 )}

 {/* ============ REGISTER STEP 2: OTP ============ */}
 {screen === 'register_otp' && (
 <form onSubmit={handleRegister} className="space-y-4">
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
 <Button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
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
 )}

 {/* ============ FORGOT PASSWORD STEP 1: phone ============ */}
 {screen === 'forgot_phone' && (
 <form onSubmit={sendForgotOtp} className="space-y-4">
 <div className="space-y-1.5">
 <Label htmlFor="forgot-phone">Registered mobile number</Label>
 <PhoneInput id="forgot-phone" required value={phone} onChange={setPhone} />
 </div>
 <Button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
 {loading ? 'Verifying phone…' : 'Verify phone'}
 </Button>
 </form>
 )}

 {/* ============ FORGOT PASSWORD STEP 2: OTP + new password ============ */}
 {screen === 'forgot_reset' && (
 <form onSubmit={handleResetPassword} className="space-y-4">
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
 <Button type="submit" disabled={loading || password.length < 8 || (demoOtp ? otp.length !== 6 : false)} className="w-full bg-orange-500 hover:bg-orange-600 h-10">
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
 )}

 <p className="mt-6 text-center text-xs text-slate-500">
 By continuing, you agree to FoodMitra&apos;s Terms of Service and Privacy Policy.
 </p>
 </div>
 </div>
 </div>
 );
}
