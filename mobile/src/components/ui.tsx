import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme/colors';

// ─── Screen wrapper ──────────────────────────────────────────────────────────
export const Screen = ({ children, style, grey }: any) => (
  <SafeAreaView
    style={[
      { flex: 1, backgroundColor: grey ? colors.backgroundGrey : colors.background },
      style,
    ]}
  >
    <StatusBar barStyle="dark-content" backgroundColor={grey ? colors.backgroundGrey : colors.background} />
    {children}
  </SafeAreaView>
);

// ─── Top navigation header ────────────────────────────────────────────────────
export const Header = ({ title, onBack, right }: any) => (
  <View style={s.header}>
    {onBack ? (
      <TouchableOpacity onPress={onBack} style={s.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
    ) : (
      <View style={{ width: 40 }} />
    )}
    <Text style={s.htitle} numberOfLines={1}>{title}</Text>
    <View style={{ width: 40 }}>{right}</View>
  </View>
);

// ─── Primary button ───────────────────────────────────────────────────────────
export const Btn = ({ title, onPress, loading, disabled, style, outline }: any) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    style={[
      s.btn,
      outline && s.btnOutline,
      { opacity: disabled ? 0.5 : 1 },
      style,
    ]}
    activeOpacity={0.85}
  >
    {loading
      ? <ActivityIndicator size="small" color={outline ? colors.primary : '#fff'} />
      : <Text style={[s.btnText, outline && s.btnTextOutline]}>{title}</Text>
    }
  </TouchableOpacity>
);

// ─── Text input ───────────────────────────────────────────────────────────────
export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  maxLength,
  style,
}: any) => (
  <View style={[s.fieldWrap, style]}>
    {label ? <Text style={s.label}>{label}</Text> : null}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      maxLength={maxLength}
      style={s.input}
      placeholderTextColor={colors.textLight}
    />
  </View>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
export const Divider = ({ style }: any) => (
  <View style={[s.divider, style]} />
);

// ─── Empty state ──────────────────────────────────────────────────────────────
export const EmptyState = ({ icon, title, message }: any) => (
  <View style={s.empty}>
    {icon ? <Text style={s.emptyIcon}>{icon}</Text> : null}
    <Text style={s.emptyTitle}>{title}</Text>
    {message ? <Text style={s.emptyMsg}>{message}</Text> : null}
  </View>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, color, bg }: any) => (
  <View style={[s.badge, { backgroundColor: bg || colors.primaryLight }]}>
    <Text style={[s.badgeText, { color: color || colors.primary }]}>{label}</Text>
  </View>
);

// ─── Loading spinner ──────────────────────────────────────────────────────────
export const Loader = ({ color }: any) => (
  <View style={s.loaderWrap}>
    <ActivityIndicator size="large" color={color || colors.primary} />
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  htitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },

  // Button
  btn: {
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...shadow.md,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    elevation: 0,
    shadowOpacity: 0,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.8,
  },
  btnTextOutline: {
    color: colors.primary,
  },

  // Input
  fieldWrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 8,
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Loader
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
