# Loanease Mobile App

React Native mobile app for the Loanease Referrer Portal.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   ├── otp-verification.tsx
│   │   └── verify-2fa.tsx
│   ├── (tabs)/            # Main tab screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── opportunities.tsx
│   │   ├── applications.tsx
│   │   ├── clients.tsx
│   │   └── account.tsx
│   ├── opportunity/       # Opportunity screens
│   │   ├── [id].tsx       # Detail
│   │   └── add.tsx        # Add new
│   ├── client/            # Client screens
│   │   └── [id].tsx       # Detail
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable components
│   └── ui/               # Base UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       └── Badge.tsx
├── lib/                   # Utilities
│   ├── api.ts            # Axios API client
│   ├── auth.ts           # Auth functions
│   └── storage.ts        # Secure storage
├── store/                 # State management
│   └── auth.ts           # Auth store (Zustand)
├── types/                 # TypeScript types
│   └── index.ts
├── constants/             # App constants
│   ├── colors.ts
│   └── config.ts
├── hooks/                 # Custom hooks
└── assets/               # Images, fonts
```

## Features

### Authentication
- Email/Password login
- Mobile OTP login (SMS + Email)
- Biometric authentication (Face ID / Touch ID)
- 2FA verification
- Password reset
- Account registration

### Main Features
- Dashboard with KPIs
- Opportunities management (list, create, view)
- Applications tracking
- Client management
- Account settings

## Configuration

### Environment Variables

Create a `.env` file:

```
API_URL=https://your-api-url.com/api
```

### API Configuration

Update `constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:3000/api'
    : 'https://loanease.com/api',
  TIMEOUT: 30000,
};
```

## Building for Production

### iOS

```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

## Assets Required

Before building, add the following assets to the `assets/` folder:

- `icon.png` (1024x1024) - App icon
- `splash.png` (1284x2778) - Splash screen
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `favicon.png` (48x48) - Web favicon

## Dependencies

Key dependencies:
- `expo` - Development framework
- `expo-router` - File-based routing
- `expo-secure-store` - Secure token storage
- `expo-local-authentication` - Biometrics
- `axios` - HTTP client
- `zustand` - State management
- `react-hook-form` - Form handling

## Backend API Requirements

The mobile app requires the following new API endpoints:

### Mobile OTP Authentication
- `POST /api/auth/mobile/request-otp` - Request OTP
- `POST /api/auth/mobile/verify-otp` - Verify OTP
- `POST /api/auth/mobile/resend-otp` - Resend OTP

### Database Changes
- Add `mobile` field to `users` collection
- Create `mobile_otp_codes` collection
- Create `mobile_devices` collection

See `docs/MOBILE_APP_DOCUMENTATION.md` for complete API specifications.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Run type check: `npm run type-check`
5. Submit a pull request

## Support

For issues and feature requests, contact the development team.
