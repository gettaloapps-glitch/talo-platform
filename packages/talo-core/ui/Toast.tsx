import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  message: string;
  onHide?: () => void;
};

export function Toast({ visible, message, onHide }: Props) {
  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={styles.inlineWrapper}>
      <Pressable style={styles.toast} onPress={onHide}>
        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineWrapper: {
    alignItems: 'flex-end',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    color: colors.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
});