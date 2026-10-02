import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { ApiError, api } from '../api/client';
import { colors, radius, shadow } from '../theme/colors';
import { OTPWidget } from '@msg91comm/sendotp-react-native';
import { useEffect } from 'react';

type Screen = 'login' | 'register_details' | 'register_otp' | 'forgot_phone' | 'forgot_reset';

export default function LoginScreen() {
  const { login, register } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState('');
  const [otpReqId, setOtpReqId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const widgetId = "36697a71494b353338303634";
  const tokenAuth = "575533Tzsl0DbrFc6ab802dfP1";

  useEffect(() => {
    OTPWidget.initializeWidget(widgetId, tokenAuth); //Widget initialization
  }, [])

  const startCooldown = () => {
    setOtpCooldown(60);
    const t = setInterval(() => {
      setOtpCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const resetState = () => {
    setFullName(''); setPhone(''); setPassword(''); setOtp('');
    setDateOfBirth(''); setAnniversaryDate('');
    setDemoOtp(null); setError(''); setScreen('login');
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!phone || !password) { setError('Please fill all fields'); return; }
    if (phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    setLoading(true); setError('');
    try { await login(phone, password); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  // ── Register step 1: send OTP ──────────────────────────────────────────────
  const sendRegisterOtp = async () => {
    if (!fullName.trim()) {
      setError('Enter your full name');
      return;
    }

    if (phone.length !== 10) {
      setError('Enter a valid 10-digit number');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // MSG91 expects country code WITHOUT +
      const identifier = `91${phone}`;

      const response = await OTPWidget.sendOTP({
        identifier,
      });

      console.log('MSG91 sendOTP:', response);

      if (response?.type !== 'success') {
        setError(response?.message || 'Failed to send OTP');
        return;
      }

      // MSG91 returns the request ID in `message`
      const reqId = response.message;

      if (!reqId) {
        setError('OTP request ID was not returned');
        return;
      }

      setOtpReqId(reqId);
      setOtp('');
      setOtpSent(true);
      startCooldown();

    } catch (e) {
      console.error('MSG91 send OTP error:', e);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }

    if (!otpReqId) {
      setError('OTP session expired. Please request a new OTP.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await OTPWidget.verifyOTP({
        reqId: otpReqId,
        otp,
      });

      console.log('MSG91 verifyOTP:', response);

      if (response?.type !== 'success') {
        setError(response?.message || 'Invalid OTP');
        return;
      }

      // OTP verified successfully on client with MSG91
      console.log('OTP VERIFIED');

      // Complete registration on backend & update auth store (auto-navigates to Home)
      await register({
        fullName,
        phone,
        password,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        ...(anniversaryDate ? { anniversaryDate } : {}),
      });

    } catch (e: any) {
      console.error('MSG91 verify OTP / registration error:', e);
      setError(e instanceof ApiError ? e.message : (e?.message || 'Invalid OTP or verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  // ── Register step 2: verify OTP ───────────────────────────────────────────
  const handleRegister = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError('');
    try { await register({ fullName, phone, password, otp, dateOfBirth, anniversaryDate }); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Registration failed'); }
    finally { setLoading(false); }
  };

  // ── Forgot: send OTP ──────────────────────────────────────────────────────
  const sendForgotOtp = async () => {
    if (phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    setLoading(true); setError(''); setDemoOtp(null);
    try {
      const norm = `+91${phone.replace(/\D/g, '').slice(-10)}`;
      const res = await api.post<{ message: string; otp?: string }>('/auth/forgot-password', { phone: norm });
      setDemoOtp(res.otp ?? null);
      startCooldown();
      setScreen('forgot_reset');
    }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  // ── Forgot: reset password ────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const norm = `+91${phone.replace(/\D/g, '').slice(-10)}`;
      await api.post('/auth/reset-password', { phone: norm, password, ...(otp ? { otp } : {}) });
      setOtp(''); setPassword(''); setDemoOtp(null);
      setError('');
      setScreen('login');
    }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Password reset failed'); }
    finally { setLoading(false); }
  };

  const getTitle = () => ({
    login: 'Login',
    register_details: 'Create account',
    register_otp: 'Verify mobile',
    forgot_phone: 'Forgot password',
    forgot_reset: 'Reset password',
  }[screen]);

  const getSubtitle = () => ({
    login: 'Get access to your Orders, Wishlist and Recommendations',
    register_details: 'Create a new FoodMitra account',
    register_otp: `Enter the OTP sent to +91 ${phone}`,
    forgot_phone: 'Enter your registered mobile number',
    forgot_reset: `Enter the OTP sent to +91 ${phone} and your new password`,
  }[screen]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top illustration */}
      <View style={s.illustrationWrap}>
        <View style={s.illustrationBg} />
        <View style={s.logoContainer}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>🍽️</Text>
          </View>
          <Text style={s.appName}>FoodMitra</Text>
          <Text style={s.tagline}>Order food you love</Text>
        </View>
      </View>

      {/* Form */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">

          {/* Back button for sub-screens */}
          {screen !== 'login' && (
            <TouchableOpacity style={s.backBtn} onPress={resetState}>
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={s.backText}>Back to login</Text>
            </TouchableOpacity>
          )}

          <Text style={s.cardTitle}>{getTitle()}</Text>
          <Text style={s.cardSubtitle}>{getSubtitle()}</Text>

          {/* ── LOGIN ─────────────────────────────────────────────────── */}
          {screen === 'login' && (
            <>
              <PhoneField value={phone} onChange={setPhone} />
              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                rightLabel="Forgot?"
                onRightPress={() => { setError(''); setScreen('forgot_phone'); }}
              />
              {error ? <ErrorBox msg={error} /> : null}
              <PrimaryBtn title="LOGIN" loading={loading} onPress={handleLogin} />
              <View style={s.switchRow}>
                <Text style={s.switchText}>New to FoodMitra? </Text>
                <TouchableOpacity onPress={() => { setError(''); setScreen('register_details'); }}>
                  <Text style={s.switchLink}>Sign up</Text>
                </TouchableOpacity>
              </View>

              {/* Demo credentials */}
              <View style={s.demoBox}>
                <Text style={s.demoBoxTitle}>Demo credentials</Text>
                <TouchableOpacity
                  style={s.demoRow}
                  onPress={() => { setPhone('9800001000'); setPassword('customer123'); }}
                >
                  <Text style={s.demoRowLabel}>Customer</Text>
                  <Text style={s.demoRowValue}>9800001000 / customer123</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.demoRow}
                  onPress={() => { setPhone('9999999999'); setPassword('admin123'); }}
                >
                  <Text style={s.demoRowLabel}>Admin</Text>
                  <Text style={s.demoRowValue}>9999999999 / admin123</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── REGISTER STEP 1 ───────────────────────────────────────── */}
          {/* {screen === 'register_details' && (
            <>
              <LabeledInput
                label="Full name"
                value={fullName}
                onChange={setFullName}
                placeholder="John Doe"
              />
              <PhoneField value={phone} onChange={setPhone} />
              <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                placeholder="min 8 characters"
              />
              <DateField
                label="Date of birth (optional)"
                value={dateOfBirth}
                onChange={setDateOfBirth}
              />
              <DateField
                label="Anniversary date (optional)"
                value={anniversaryDate}
                onChange={setAnniversaryDate}
              />
              {error ? <ErrorBox msg={error} /> : null}
              <PrimaryBtn title="VERIFY PHONE & SIGN UP" loading={loading} onPress={sendRegisterOtp} />
              <View style={s.switchRow}>
                <Text style={s.switchText}>Already have an account? </Text>
                <TouchableOpacity onPress={resetState}>
                  <Text style={s.switchLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </>
          )} */}

          {/* ── REGISTER STEP 2: OTP ──────────────────────────────────── */}
          {/* {screen === 'register_otp' && (
            <>
              {demoOtp && (
                <View style={s.otpBox}>
                  <Text style={s.otpBoxLabel}>Demo OTP</Text>
                  <Text style={s.otpBoxCode}>{demoOtp}</Text>
                  <Text style={s.otpBoxNote}>In production this would be sent via SMS</Text>
                </View>
              )}
              <LabeledInput
                label="Enter 4-digit OTP"
                value={otp}
                onChange={(t: string) => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="123456"
                keyboardType="numeric"
                maxLength={4}
                style={{ letterSpacing: 8, fontSize: 20, fontWeight: '700' }}
              />
              {error ? <ErrorBox msg={error} /> : null}
              <PrimaryBtn title="VERIFY & CREATE ACCOUNT" loading={loading} onPress={handleRegister} disabled={otp.length !== 4} />
              <View style={s.otpActions}>
                <TouchableOpacity disabled={otpCooldown > 0} onPress={async () => {
                  setLoading(true);
                  try {
                    const norm = `+91${phone.replace(/\D/g, '').slice(-10)}`;
                    const res = await api.post<{ otp?: string }>('/auth/send-otp', { phone: norm, purpose: 'SIGNUP' });
                    setDemoOtp(res.otp ?? null); startCooldown();
                  } finally { setLoading(false); }
                }}>
                  <Text style={[s.otpResend, otpCooldown > 0 && s.otpResendDisabled]}>
                    {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScreen('register_details')}>
                  <Text style={s.otpChange}>Change number</Text>
                </TouchableOpacity>
              </View>
            </>
          )} */}
          {screen === 'register_details' && (
            <>
              {!otpSent ? (
                <>
                  <LabeledInput
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="John Doe"
                  />

                  <PhoneField
                    value={phone}
                    onChange={setPhone}
                  />

                  <PasswordField
                    label="Password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword(v => !v)}
                    placeholder="min 8 characters"
                  />

                  <DateField
                    label="Date of birth (optional)"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                  />

                  <DateField
                    label="Anniversary date (optional)"
                    value={anniversaryDate}
                    onChange={setAnniversaryDate}
                  />

                  {error ? <ErrorBox msg={error} /> : null}

                  <PrimaryBtn
                    title="SEND OTP"
                    loading={loading}
                    onPress={sendRegisterOtp}
                  />
                </>
              ) : (
                <>
                  <Text style={s.cardSubtitle}>
                    Enter the 4-digit OTP sent to +91 {phone}
                  </Text>

                  <LabeledInput
                    label="Enter OTP"
                    value={otp}
                    onChange={(t: string) =>
                      setOtp(t.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="1234"
                    keyboardType="numeric"
                    maxLength={4}
                    style={{
                      letterSpacing: 8,
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  />

                  {error ? <ErrorBox msg={error} /> : null}

                  <PrimaryBtn
                    title="VERIFY OTP"
                    loading={loading}
                    onPress={handleVerifyOtp}
                    disabled={otp.length !== 4}
                  />

                  <View style={s.otpActions}>
                    <TouchableOpacity
                      disabled={otpCooldown > 0 || loading}
                      onPress={sendRegisterOtp}
                    >
                      <Text
                        style={[
                          s.otpResend,
                          otpCooldown > 0 && s.otpResendDisabled,
                        ]}
                      >
                        {otpCooldown > 0
                          ? `Resend OTP in ${otpCooldown}s`
                          : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtp('');
                        setOtpReqId(null);
                        setError('');
                      }}
                    >
                      <Text style={s.otpChange}>
                        Change number
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          {/* ── FORGOT STEP 1: phone ──────────────────────────────────── */}
          {screen === 'forgot_phone' && (
            <>
              <PhoneField value={phone} onChange={setPhone} label="Registered mobile number" />
              {error ? <ErrorBox msg={error} /> : null}
              <PrimaryBtn title="SEND OTP" loading={loading} onPress={sendForgotOtp} />
            </>
          )}

          {/* ── FORGOT STEP 2: OTP + new password ────────────────────── */}
          {screen === 'forgot_reset' && (
            <>
              {demoOtp && (
                <View style={s.otpBox}>
                  <Text style={s.otpBoxLabel}>Demo OTP</Text>
                  <Text style={s.otpBoxCode}>{demoOtp}</Text>
                  <Text style={s.otpBoxNote}>In production this would be sent via SMS</Text>
                </View>
              )}
              {!demoOtp && (
                <View style={s.successBox}>
                  <Text style={s.successText}>✓ Phone verified. Set your new password below.</Text>
                </View>
              )}
              {demoOtp && (
                <LabeledInput
                  label="Enter 4-digit OTP"
                  value={otp}
                  onChange={(t: string) => setOtp(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123456"
                  keyboardType="numeric"
                  maxLength={4}
                  style={{ letterSpacing: 8, fontSize: 20, fontWeight: '700' }}
                />
              )}
              <PasswordField
                label="New password"
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword(v => !v)}
                placeholder="min 8 characters"
              />
              {error ? <ErrorBox msg={error} /> : null}
              <PrimaryBtn title="RESET PASSWORD" loading={loading} onPress={handleResetPassword} disabled={password.length < 8} />
            </>
          )}

          {/* Terms */}
          <Text style={s.terms}>
            By continuing, you agree to our{' '}
            <Text style={s.termsLink}>Terms of Service</Text>
            {' & '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PhoneField({ value, onChange, label }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={sf.wrap}>
      <Text style={sf.label}>{label || 'Mobile number'}</Text>
      <View style={[sf.row, focused && sf.focused]}>
        <View style={sf.prefix}>
          <Text style={sf.flag}>🇮🇳</Text>
          <Text style={sf.prefixText}>+91</Text>
          <View style={sf.divider} />
        </View>
        <TextInput
          style={sf.input}
          value={value}
          onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 10))}
          placeholder="98765 43210"
          placeholderTextColor={colors.textLight}
          keyboardType="phone-pad"
          maxLength={10}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

function PasswordField({ value, onChange, show, onToggle, label, placeholder, rightLabel, onRightPress }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={sf.wrap}>
      <View style={sf.labelRow}>
        <Text style={sf.label}>{label || 'Password'}</Text>
        {rightLabel && (
          <TouchableOpacity onPress={onRightPress}>
            <Text style={sf.forgot}>{rightLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[sf.row, focused && sf.focused]}>
        <TextInput
          style={[sf.input, { paddingLeft: 14 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || '••••••••'}
          placeholderTextColor={colors.textLight}
          secureTextEntry={!show}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity onPress={onToggle} style={sf.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LabeledInput({ label, value, onChange, placeholder, keyboardType, maxLength, style }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={sf.wrap}>
      {label ? <Text style={sf.label}>{label}</Text> : null}
      <TextInput
        style={[sf.plainInput, focused && sf.focused, style]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

function DateField({ label, value, onChange }: any) {
  const [show, setShow] = useState(false);

  const handleConfirm = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      onChange(formatted);
    }
  };

  return (
    <View style={sf.wrap}>
      <Text style={sf.label}>{label}</Text>
      <TouchableOpacity
        style={sf.plainInput}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={{ color: value ? colors.text : colors.textLight, marginTop: 14 }}>
          {value || 'YYYY-MM-DD'}
        </Text>
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={handleConfirm}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

function PrimaryBtn({ title, loading, onPress, disabled }: any) {
  return (
    <TouchableOpacity
      style={[sf.btn, (loading || disabled) && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={sf.btnText}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

function ErrorBox({ msg }: any) {
  return (
    <View style={sf.errorWrap}>
      <Text style={sf.errorText}>⚠ {msg}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Illustration top
  illustrationWrap: { height: 220, overflow: 'hidden', position: 'relative' },
  illustrationBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
  },
  logoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 30 },
  logoBox: {
    width: 70, height: 70, borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...shadow.lg,
  },
  logoEmoji: { fontSize: 34 },
  appName: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 12, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  // Form scroll area
  formScroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  // Back button
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { fontSize: 13, color: colors.textSecondary },

  // Titles
  cardTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 20 },

  // Switch row (login / sign up)
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchLink: { fontSize: 14, fontWeight: '700', color: colors.primary },

  // Demo box
  demoBox: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 16,
    gap: 8,
  },
  demoBoxTitle: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginBottom: 4 },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceGrey,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoRowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  demoRowValue: { fontSize: 12, color: colors.text, fontFamily: 'monospace' },

  // OTP info box
  otpBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    gap: 2,
  },
  otpBoxLabel: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  otpBoxCode: { fontSize: 28, fontWeight: '800', color: '#92400E', letterSpacing: 6, fontFamily: 'monospace' },
  otpBoxNote: { fontSize: 10, color: '#B45309', marginTop: 2 },

  // Success box
  successBox: {
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 16,
  },
  successText: { fontSize: 13, color: colors.success, fontWeight: '500', textAlign: 'center' },

  // OTP action row
  otpActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  otpResend: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  otpResendDisabled: { color: colors.textMuted },
  otpChange: { fontSize: 13, color: colors.textSecondary },

  // Terms
  terms: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 16 },
  termsLink: { color: colors.primary, fontWeight: '500' },
});

// Field-level styles
const sf = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forgot: { fontSize: 13, color: colors.primary, fontWeight: '500' },

  // Phone row input
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.sm, height: 52, overflow: 'hidden',
    backgroundColor: colors.white,
  },
  focused: { borderColor: colors.primary },
  prefix: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 5 },
  flag: { fontSize: 16 },
  prefixText: { fontSize: 15, fontWeight: '600', color: colors.text },
  divider: { width: 1, height: 20, backgroundColor: colors.border, marginLeft: 6 },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingRight: 14 },

  // Eye toggle
  eyeBtn: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },

  // Plain input (name, OTP)
  plainInput: {
    height: 52,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontSize: 15, color: colors.text,
    backgroundColor: colors.white,
  },

  // Button
  btn: {
    height: 52, borderRadius: radius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 6,
    ...shadow.md,
  },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.white, letterSpacing: 1 },

  // Error
  errorWrap: {
    backgroundColor: colors.dangerLight, borderRadius: radius.xs,
    padding: 10, marginBottom: 10,
  },
  errorText: { fontSize: 13, color: colors.danger, fontWeight: '500' },
});
