import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { colors, radius } from '../theme/colors';

export const Screen = ({ children, style }: any) => <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</SafeAreaView>;
export const Header = ({ title, onBack }: any) => (
  <View style={s.header}>
    {onBack ? <TouchableOpacity onPress={onBack} style={{ padding: 8 }}><Text style={{ fontSize: 22 }}>{"<-"}</Text></TouchableOpacity> : <View style={{ width: 32 }} />}
    <Text style={s.htitle} numberOfLines={1}>{title}</Text><View style={{ width: 32 }} />
  </View>
);
export const Btn = ({ title, onPress, loading, disabled, style }: any) => (
  <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[s.btn, { opacity: disabled ? 0.5 : 1 }, style]}>
    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnText}>{title}</Text>}
  </TouchableOpacity>
);
export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, maxLength }: any) => (
  <View><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} secureTextEntry={secureTextEntry} keyboardType={keyboardType} maxLength={maxLength} style={s.input} placeholderTextColor={colors.textMuted} /></View>
);
export const EmptyState = ({ title, message }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}><Text style={{ fontSize: 15, fontWeight: '500', color: colors.text, marginTop: 12 }}>{title}</Text>{message ? <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{message}</Text> : null}</View>
);

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  htitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1, textAlign: 'center' },
  btn: { height: 48, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 15, color: colors.text, backgroundColor: colors.white },
});
