import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import { colors, shadow } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RestaurantScreen from '../screens/RestaurantScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import AddressesScreen from '../screens/AddressesScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import OffersScreen from '../screens/OffersScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';

// ─── Tab Navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

// Custom Tab Bar for premium look
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'HomeTab', label: 'Home', icon: 'home' },
    { name: 'OrdersTab', label: 'Orders', icon: 'file-text' },
    { name: 'OffersTab', label: 'Offers', icon: 'tag' },
    { name: 'CartTab', label: 'Cart', icon: 'shopping-cart' },
    { name: 'ProfileTab', label: 'Profile', icon: 'user' },
  ];

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs[index];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.tab}
            activeOpacity={0.7}
            onPress={onPress}
          >
            {/* Background box always present — transparent when inactive so layout never shifts */}
            <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
              <Feather name={tab.icon as any} size={20} color={isFocused ? colors.primary : colors.textMuted} />
            </View>
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
    ...shadow.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',   // invisible spacer when inactive
  },
  iconWrapActive: {
    backgroundColor: '#FDECEA',       // red tint when active
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="OrdersTab" component={OrderHistoryScreen} />
      <Tab.Screen name="OffersTab" component={OffersScreen} />
      <Tab.Screen name="CartTab" component={CartScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ──────────────────────────────────────────────────────
const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading, initAuth } = useAuthStore();
  useEffect(() => { initAuth(); }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 8, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.SlideFromRightIOS,
        }}
      >
        {user ? (
          <>
            {/* Main tab layout — no animation on initial mount */}
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ animationEnabled: false }}
            />
            {/* Detail screens — slide in from right */}
            <Stack.Screen name="Restaurant" component={RestaurantScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
            <Stack.Screen name="Addresses" component={AddressesScreen} />
            <Stack.Screen name="AddAddress" component={AddAddressScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
