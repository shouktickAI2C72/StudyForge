import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle; disabled?: boolean;
  textStyle?: TextStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  loading = false,
  style,
  textStyle, disabled,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.button, style]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color={colors.bg} /> : <Text style={[styles.text, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.orange,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
  },
  text: {
    color: '#101214',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
