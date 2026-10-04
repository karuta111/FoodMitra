import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth';
import { colors, radius, shadow } from '../theme/colors';
import { Screen, Btn } from '../components/ui';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const initials = (user?.fullName || 'U').charAt(0).toUpperCase();

  const menuItems = [
    { icon: 'location-outline', label: 'Saved Addresses', onPress: () => navigation.navigate('Addresses') },
    { icon: 'clipboard-outline', label: 'Order History', onPress: () => navigation.navigate('OrdersTab') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: 'headset-outline', label: 'Contact & Support', onPress: () => navigation.navigate('ContactSupport') },
  ];

  return (
    <Screen>
      {/* Hero */}
      <View style={[s.hero, { paddingTop: Math.max(insets.top + 10, 24) }]}>
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={s.name}>{user?.fullName || 'User'}</Text>
        <Text style={s.phone}>{user?.phone}</Text>
      </View>

      {/* Menu */}
      <View style={s.menuSection}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[s.menuRow, idx < menuItems.length - 1 && s.menuRowBorder]}
            activeOpacity={0.7}
            onPress={item.onPress}
          >
            <View style={s.menuIconWrap}>
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={s.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign out */}
      <View style={s.signOutWrap}>
        <TouchableOpacity style={s.signOutBtn} onPress={() => logout()} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  phone: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  menuSection: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  signOutWrap: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: '#FFF5F5',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
});
