import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { colors } from '../theme/colors';
import { Screen, Header, Btn } from '../components/ui';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  return (
    <Screen><Header title="Profile" onBack={() => navigation.goBack()} />
      <View style={{ padding: 24, alignItems: 'center' }}>
        <View style={s.avatar}><Text style={s.avatarText}>{(user?.fullName || 'U').charAt(0).toUpperCase()}</Text></View>
        <Text style={s.name}>{user?.fullName || 'User'}</Text><Text style={s.phone}>{user?.phone}</Text>
        <TouchableOpacity style={s.menu} onPress={() => navigation.navigate('Addresses')}><Ionicons name="location-outline" size={20} color={colors.textSecondary} /><Text style={s.menuText}>Saved Addresses</Text></TouchableOpacity>
        <TouchableOpacity style={s.menu} onPress={() => navigation.navigate('OrderHistory')}><Ionicons name="clipboard-outline" size={20} color={colors.textSecondary} /><Text style={s.menuText}>Order History</Text></TouchableOpacity>
        <TouchableOpacity style={s.menu} onPress={() => navigation.navigate('Notifications')}><Ionicons name="notifications-outline" size={20} color={colors.textSecondary} /><Text style={s.menuText}>Notifications</Text></TouchableOpacity>
        <Btn title="Sign Out" onPress={() => logout()} variant="outline" style={{ marginTop: 24, width: '100%' }} />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({ avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center' }, avatarText: { fontSize: 28, fontWeight: '600', color: colors.primary }, name: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12 }, phone: { fontSize: 14, color: colors.textSecondary, marginTop: 4 }, menu: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, width: '100%', marginTop: 8 }, menuText: { fontSize: 15, color: colors.text } });
