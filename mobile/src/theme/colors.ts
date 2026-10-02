// Zomato-style color palette & design tokens
export const colors = {
  // Brand
  primary: '#E23744',          // Zomato red
  primaryDark: '#C0392B',
  primaryLight: '#F5F5F5',          // neutral grey, not red-tinted

  primaryBg: '#FDECEA',          // light red tint for backgrounds

  // Backgrounds
  background: '#FFFFFF',
  backgroundGrey: '#F8F8F8',
  surface: '#FFFFFF',
  surfaceGrey: '#F2F2F2',

  // Text
  text: '#1C1C1C',
  textSecondary: '#696969',
  textMuted: '#9A9A9A',
  textLight: '#BDBDBD',
  textInverse: '#FFFFFF',

  // UI
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  divider: '#EBEBEB',

  // Semantic
  success: '#00897B',
  successLight: '#E8F5E9',
  danger: '#E23744',
  dangerLight: '#FDECEA',
  warning: '#FF9800',
  warningLight: '#FFF3E0',

  // Special
  star: '#F5A623',
  veg: '#1BA672',
  nonVeg: '#E43B4F',
  offer: '#FF6240',
  offerBg: '#FFF4EF',

  white: '#FFFFFF',
  black: '#1C1C1C',
  overlay: 'rgba(0,0,0,0.5)',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};
