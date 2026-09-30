# FoodMitra — Customer Mobile App (Expo + React Native + TypeScript)

> **Status**: Stub scaffold. Source code structure is complete and matches the screen list
> in `PROJECT_INSTRUCTIONS.md` section 41. **Cannot be run in this environment** — you run
> it locally with `npx expo start` after `npm install`.
>
> The customer flow is **also implemented** as a responsive mobile-first view inside the
> Next.js web app at `/`. Use that for in-browser demos.

## Stack

- React Native 0.75 + Expo SDK 51
- TypeScript 5 (strict)
- React Navigation 6 (stack)
- TanStack Query 5 (server state)
- Zustand 5 (client state)
- Axios (API client)
- `react-native-razorpay` (Razorpay checkout)

## File layout

```
mobile/
├── package.json
├── tsconfig.json
├── src/
│   ├── App.tsx                  # Entry, wraps providers
│   ├── navigation/
│   │   └── RootStack.tsx        # Auth-aware stack navigator
│   ├── screens/                 # All 20 customer screens
│   │   ├── SplashScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── NearbyRestaurantsScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── RestaurantDetailsScreen.tsx
│   │   ├── MenuScreen.tsx
│   │   ├── CartScreen.tsx
│   │   ├── CheckoutScreen.tsx
│   │   ├── PaymentScreen.tsx
│   │   ├── OrderConfirmationScreen.tsx
│   │   ├── OrderTrackingScreen.tsx
│   │   ├── OrderHistoryScreen.tsx
│   │   ├── OrderDetailsScreen.tsx
│   │   ├── AddressesScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   └── ReviewScreen.tsx
│   ├── api/
│   │   └── client.ts            # Axios instance + interceptors
│   ├── store/
│   │   └── auth-store.ts        # Zustand auth state
│   └── components/              # (empty — add reusable components as you build)
```

## Running locally

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1 npx expo start
# Press `a` for Android, `i` for iOS, or scan QR with Expo Go
```

## Implementation progress

- [x] Project scaffold + tsconfig + package.json
- [x] Navigation tree with all 20 screens declared
- [x] API client with Bearer token interceptor + refresh skeleton
- [x] Zustand auth store
- [ ] Implement each screen (replace stubs with real UI)
- [ ] Add AsyncStorage persistence for auth tokens
- [ ] Add Razorpay checkout wrapper (`react-native-razorpay`)
- [ ] Add FCM push notifications

## Conventions

- All API calls go through `src/api/client.ts`. Never call `fetch` directly in a screen.
- Server state via TanStack Query hooks (`useQuery`, `useMutation`).
- Client-only state via Zustand.
- Screen components stay small — extract reusable UI into `src/components/`.
