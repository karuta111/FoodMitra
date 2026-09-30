import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme/colors';
import { Screen, Header, EmptyState } from '../components/ui';

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { const res = await api.get<{ items: any[] }>('/notifications?page=1&pageSize=20'); setItems(res.items); } catch {} finally { setLoading(false); setRefreshing(false); } }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <Screen><Header title="Notifications" onBack={() => navigation.goBack()} />
      <FlatList data={items} keyExtractor={i => i.id} renderItem={({ item }) => (
        <View style={[s.card, !item.isRead && s.unread]}><Text style={s.title}>{item.title}</Text><Text style={s.body}>{item.body}</Text><Text style={s.time}>{new Date(item.createdAt).toLocaleString()}</Text></View>
      )} contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={loading ? <Text style={s.load}>Loading...</Text> : <EmptyState title="No notifications" />}
      />
    </Screen>
  );
}
const s = StyleSheet.create({ card: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }, unread: { borderColor: colors.primaryBg }, title: { fontSize: 14, fontWeight: '600', color: colors.text }, body: { fontSize: 13, color: colors.textSecondary, marginTop: 4 }, time: { fontSize: 11, color: colors.textMuted, marginTop: 4 }, load: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 } });
