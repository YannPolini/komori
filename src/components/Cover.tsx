import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  uri: string | null;
  iconSize: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Catalog cover with a placeholder for missing or failed images. The image has no label,
// because the title is always shown or announced next to it.
export function Cover({ uri, iconSize, style, children }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = uri != null && failed !== uri;
  return (
    <View style={[styles.cover, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(uri)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Ionicons name="image-outline" size={iconSize} color={colors.textMuted} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
