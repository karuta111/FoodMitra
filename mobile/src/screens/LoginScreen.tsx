import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth';
import { ApiError, api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Btn, Input } from '../components/ui';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try { await login(phone, password); } catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <Screen style={s.container}>
      <View style={s.logoWrap}><View style={s.logo}><Text style={s.logoIcon}>{"\u{1F374}"}</Text></View><Text style={s.appName}>FoodMitra</Text></View>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.subtitle}>Sign in with your mobile number</Text>
      <View style={{ gap: 12, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={s.prefix}>+91</Text>
          <Input value={phone} onChangeText={(t: string) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" keyboardType="phone-pad" maxLength={10} />
        </View>
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="********" secureTextEntry />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Btn title={loading ? 'Signing in...' : 'Sign in'} onPress={handleLogin} loading={loading} />
        <Text style={s.demo}>Demo: 9800001000 / customer123</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { fontSize: 28 },
  appName: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  prefix: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginBottom: 22, marginRight: 8 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  demo: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
