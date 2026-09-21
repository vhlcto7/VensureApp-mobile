import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../../theme';

export type DashboardIconName = ComponentProps<typeof Ionicons>['name'];

type DashboardIconTone = 'brand' | 'sky' | 'green' | 'amber' | 'violet' | 'navy' | 'white';

type DashboardIconProps = {
  name: DashboardIconName;
  tone?: DashboardIconTone;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const TONE_COLORS: Record<DashboardIconTone, { bg: string; fg: string }> = {
  brand: { bg: 'rgba(255,255,255,0.18)', fg: colors.white },
  sky: { bg: colors.sky100, fg: colors.sky700 },
  green: { bg: '#ecfdf5', fg: '#047857' },
  amber: { bg: colors.amber50, fg: colors.amber800 },
  violet: { bg: '#f5f3ff', fg: '#6d28d9' },
  navy: { bg: colors.slate100, fg: colors.slate700 },
  white: { bg: colors.white, fg: colors.primaryCta },
};

export function DashboardIcon({ name, tone = 'sky', size = 22, style }: DashboardIconProps) {
  const palette = TONE_COLORS[tone];
  const box = Math.round(size * 2);

  return (
    <View
      style={[
        styles.well,
        { width: box, height: box, borderRadius: radius.md, backgroundColor: palette.bg },
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={palette.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
