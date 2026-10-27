import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '../../../constants/theme';
import { useTheme } from '../../../hooks/use-theme';

export interface PageSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

export function PageSection({
  title,
  children,
  style,
  contentStyle,
  titleStyle,
}: PageSectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <Text style={[styles.title, { color: theme.text }, titleStyle]}>{title}</Text>
      ) : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    gap: Spacing.md,
  } satisfies ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: '600',
  } satisfies TextStyle,
  content: {
    width: '100%',
  } satisfies ViewStyle,
});
