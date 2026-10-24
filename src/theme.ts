export const colors = {
  background: '#F7F5EF',
  surface: '#FFFFFF',
  primary: '#2E9E5B',
  primaryDark: '#217A45',
  primarySoft: '#E3F3E9',
  text: '#1B2A22',
  textMuted: '#6B7A72',
  border: '#E4E1D6',
  danger: '#C0392B',
  warning: '#B7791F',
};

// Watch status colors, always shown together with the status label.
export const statusColors = {
  plan: { text: '#2F5F8A', background: '#E3EDF7' },
  watching: { text: '#8A5A12', background: '#FBEFD9' },
  watched: { text: colors.primaryDark, background: colors.primarySoft },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 16, pill: 999 };

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
