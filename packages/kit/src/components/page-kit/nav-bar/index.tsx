import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../hooks/use-theme';

import { TouchableWrapper } from '../../ui-kit';

export interface NavBarProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  navBackgroundColor?: string;
  titleColor?: string;
  backIconColor?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  showBorder?: boolean;
  leftElement?: React.ReactNode;
  height?: number;
}

const NAV_BAR_HEIGHT = 44;

export const NavBar: React.FC<NavBarProps> = ({
  title,
  showBack = true,
  onBackPress,
  rightElement,
  navBackgroundColor,
  titleColor,
  backIconColor,
  style,
  titleStyle,
  showBorder = false,
  leftElement,
  height = NAV_BAR_HEIGHT,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const onBackPressRef = useRef(onBackPress);
  const lastBackPressAtRef = useRef(0);

  useEffect(() => {
    onBackPressRef.current = onBackPress;
  }, [onBackPress]);

  const finalBackgroundColor = navBackgroundColor ?? theme.background;
  const finalTitleColor = titleColor ?? theme.text;
  const finalBackIconColor = backIconColor ?? theme.text;
  const borderColor = theme.border;

  const handleBackPress = useMemo(
    () => () => {
      const now = Date.now();
      if (now - lastBackPressAtRef.current < 500) {
        return;
      }

      lastBackPressAtRef.current = now;

      if (onBackPressRef.current) {
        onBackPressRef.current();
        return;
      }

      router.back();
    },
    [router]
  );

  const renderLeft = () => {
    if (leftElement) {
      return leftElement;
    }

    if (!showBack) {
      return <View style={styles.placeholder} />;
    }

    return (
      <TouchableWrapper
        onPress={handleBackPress}
        style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="chevron-back"
          size={Platform.OS === 'ios' ? 28 : 24}
          color={finalBackIconColor}
        />
      </TouchableWrapper>
    );
  };

  const renderCenter = () => {
    if (!title) {
      return <View style={styles.flex} />;
    }

    return (
      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, { color: finalTitleColor }, titleStyle]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>
    );
  };

  const renderRight = () => {
    if (rightElement) {
      return <View style={styles.rightContainer}>{rightElement}</View>;
    }

    return <View style={styles.placeholder} />;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: finalBackgroundColor,
          paddingTop: insets.top,
          borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: borderColor,
        },
        style,
      ]}
    >
      <View style={[styles.content, { height }]}>
        {renderLeft()}
        {renderCenter()}
        {renderRight()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
  } satisfies ViewStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  } satisfies ViewStyle,
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  } satisfies ViewStyle,
  buttonPressed: {
    opacity: 0.6,
  } satisfies ViewStyle,
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  } satisfies ViewStyle,
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  } satisfies TextStyle,
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    minWidth: 40,
    justifyContent: 'flex-end',
  } satisfies ViewStyle,
  placeholder: {
    width: 40,
    marginHorizontal: 4,
  } satisfies ViewStyle,
  flex: {
    flex: 1,
  } satisfies ViewStyle,
});
