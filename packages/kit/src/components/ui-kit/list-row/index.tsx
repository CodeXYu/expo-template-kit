import { Ionicons } from '@expo/vector-icons';
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

import { TouchableWrapper, type TouchableWrapperProps } from '../touchable-wrapper';

type ListRowAccessory = 'none' | 'indicator' | 'check';
type ListRowSeparator = 'none' | 'full' | 'indent';
type ListRowTitlePlace = 'left' | 'top';

export interface ListRowProps extends Omit<TouchableWrapperProps, 'children' | 'style'> {
  title?: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  accessory?: React.ReactNode | ListRowAccessory;
  topSeparator?: ListRowSeparator;
  bottomSeparator?: ListRowSeparator;
  titlePlace?: ListRowTitlePlace;
  detailMultiLine?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  detailStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  detail,
  icon,
  accessory = 'indicator',
  topSeparator = 'none',
  bottomSeparator = 'indent',
  titlePlace = 'left',
  detailMultiLine,
  style,
  titleStyle,
  detailStyle,
  containerStyle,
  onPress,
  ...restProps
}: ListRowProps) {
  const theme = useTheme();
  const rowContent = (
    <>
      {renderIcon(icon)}
      {renderContent({
        title,
        detail,
        titleStyle,
        detailStyle,
        detailMultiLine,
        titlePlace,
        themeText: theme.text,
        themeDetail: theme.textSecondary,
      })}
      {renderAccessory(accessory, theme.primary, theme.textTertiary)}
    </>
  );
  const rowStyle = [styles.row, { backgroundColor: theme.background }, style];

  return (
    <View style={containerStyle}>
      <Separator type={topSeparator} />
      {onPress ? (
        <TouchableWrapper
          {...restProps}
          onPress={onPress}
          style={({ pressed }) => [
            ...rowStyle,
            pressed ? { backgroundColor: theme.backgroundSelected } : null,
          ]}
        >
          {rowContent}
        </TouchableWrapper>
      ) : (
        <View style={rowStyle}>{rowContent}</View>
      )}
      <Separator type={bottomSeparator} />
    </View>
  );
}

function renderIcon(icon?: React.ReactNode) {
  if (!icon) {
    return null;
  }

  return <View style={styles.iconWrap}>{icon}</View>;
}

function renderTitle({
  title,
  detail,
  titlePlace,
  themeText,
  titleStyle,
}: {
  title?: React.ReactNode;
  detail?: React.ReactNode;
  titlePlace: ListRowTitlePlace;
  themeText: string;
  titleStyle?: StyleProp<TextStyle>;
}) {
  if (title == null) {
    return null;
  }

  if (typeof title === 'string' || typeof title === 'number') {
    return (
      <Text
        style={[
          styles.title,
          !detail && titlePlace === 'left' ? styles.titleFlex : null,
          { color: themeText },
          titleStyle,
        ]}
      >
        {title}
      </Text>
    );
  }

  return title;
}

function renderDetail({
  title,
  detail,
  detailStyle,
  detailMultiLine,
  titlePlace,
  themeDetail,
}: {
  title?: React.ReactNode;
  detail?: React.ReactNode;
  detailStyle?: StyleProp<TextStyle>;
  detailMultiLine?: boolean;
  titlePlace: ListRowTitlePlace;
  themeDetail: string;
}) {
  if (detail == null) {
    return null;
  }

  if (typeof detail === 'string' || typeof detail === 'number') {
    const allowMultiLine = detailMultiLine === undefined ? titlePlace === 'top' : detailMultiLine;

    return (
      <Text
        numberOfLines={allowMultiLine ? 0 : 1}
        style={[
          styles.detail,
          titlePlace === 'top' ? styles.detailTop : styles.detailLeft,
          title
            ? titlePlace === 'left'
              ? styles.detailPaddingLeft
              : styles.detailPaddingTop
            : null,
          { color: themeDetail },
          detailStyle,
        ]}
      >
        {detail}
      </Text>
    );
  }

  return detail;
}

function renderContent({
  title,
  detail,
  titleStyle,
  detailStyle,
  detailMultiLine,
  titlePlace,
  themeText,
  themeDetail,
  children,
}: {
  title?: React.ReactNode;
  detail?: React.ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  detailStyle?: StyleProp<TextStyle>;
  detailMultiLine?: boolean;
  titlePlace: ListRowTitlePlace;
  themeText: string;
  themeDetail: string;
  children?: React.ReactNode;
}) {
  const titleNode = renderTitle({
    title,
    detail,
    titlePlace,
    themeText,
    titleStyle,
  });
  const detailNode = renderDetail({
    title,
    detail,
    detailStyle,
    detailMultiLine,
    titlePlace,
    themeDetail,
  });

  if (!titleNode && !detailNode) {
    return children ?? null;
  }

  return (
    <View style={[styles.content, titlePlace === 'top' ? styles.contentTop : styles.contentLeft]}>
      {titleNode}
      {detailNode}
    </View>
  );
}

function renderAccessory(
  accessory: React.ReactNode | ListRowAccessory,
  activeColor: string,
  mutedColor: string
) {
  if (React.isValidElement(accessory)) {
    return <View style={styles.accessoryWrap}>{accessory}</View>;
  }

  switch (accessory) {
    case 'none':
      return null;
    case 'check':
      return (
        <View style={styles.accessoryWrap}>
          <Ionicons name="checkmark" size={18} color={activeColor} />
        </View>
      );
    case 'indicator':
    default:
      return (
        <View style={styles.accessoryWrap}>
          <Ionicons name="chevron-forward" size={18} color={mutedColor} />
        </View>
      );
  }
}

function Separator({ type }: { type: ListRowSeparator }) {
  const theme = useTheme();

  if (type === 'none') {
    return null;
  }

  return (
    <View style={type === 'indent' ? styles.separatorIndent : undefined}>
      <View style={[styles.separatorLine, { backgroundColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  contentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentTop: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  titleFlex: {
    flexGrow: 1,
    flexShrink: 1,
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailLeft: {
    flexGrow: 1,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailTop: {
    textAlign: 'left',
  },
  detailPaddingLeft: {
    paddingLeft: 12,
  },
  detailPaddingTop: {
    paddingTop: 4,
  },
  accessoryWrap: {
    paddingLeft: Spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  separatorIndent: {
    paddingLeft: Spacing.md,
  },
  separatorLine: {
    height: StyleSheet.hairlineWidth,
  },
});
