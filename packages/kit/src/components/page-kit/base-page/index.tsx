import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StatusBarStyle,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView as KeyboardControllerAvoidingView,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets, type Edge, type EdgeInsets } from 'react-native-safe-area-context';

import { Colors } from '../../../constants/theme';
import { useColorScheme } from '../../../hooks/use-color-scheme';
import { useNetworkStatus } from '../../../providers/network-status-provider';
import { useThemeContext } from '../../../providers/theme-provider';

import { ThemedView } from '../../ui-kit';

import { NavBar, type NavBarProps } from '../nav-bar';
import { PageStatusView, type PageStatus } from '../page-status-view';

export interface BasePageProps extends Omit<NavBarProps, 'style'> {
  children: React.ReactNode;
  /** Safe-area edges applied to the page content. */
  contentSafeAreaEdges?: Edge[];
  safeAreaInsets?: Partial<EdgeInsets>;
  statusBarStyle?: StatusBarStyle;
  backgroundColor?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** The single source of truth for the whole-page state. */
  pageStatus?: PageStatus;
  /** Optional details shown when pageStatus is "error". */
  pageError?: unknown;
  onRetry?: () => void;
  scrollEnabled?: boolean;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  /** Enables Keyboard Controller for scrollable and static content. */
  keyboardAware?: boolean;
  /** Replaces the default navigation bar; pass null to hide the header. */
  header?: React.ReactNode | null;
  statusViewStyle?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  containerProps?: ViewProps;
  scrollViewProps?: ScrollViewProps;
  /** Props for the content View when scrollEnabled is false. */
  staticContentProps?: ViewProps;
  retryLabel?: string;
  colorScheme?: 'light' | 'dark';
  /** Rendered after children; it participates in scrolling when enabled. */
  scrollFooter?: React.ReactNode;
  /** Rendered below the page content and outside the scroll area. */
  bottomAccessory?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * A page shell for navigation, safe areas, keyboard avoidance, and explicit
 * whole-page states. It refreshes an explicitly rendered offline page before
 * retrying, without subscribing to network or AppState events itself.
 */
export const BasePage: React.FC<BasePageProps> = props => {
  const {
    children,
    contentSafeAreaEdges,
    safeAreaInsets,
    statusBarStyle,
    backgroundColor,
    refreshControl,
    pageStatus = 'default',
    pageError,
    onRetry,
    scrollEnabled = true,
    keyboardShouldPersistTaps = 'handled',
    keyboardAware = true,
    header,
    statusViewStyle,
    containerStyle,
    contentStyle,
    headerStyle,
    containerProps,
    scrollViewProps,
    staticContentProps,
    retryLabel,
    colorScheme,
    scrollFooter,
    bottomAccessory,
    onFocus,
    onBlur,
    ...navBarProps
  } = props;

  const defaultInsets = useSafeAreaInsets();
  const themeContext = useThemeContext();
  const systemColorScheme = useColorScheme();
  const resolvedColorScheme =
    colorScheme ?? themeContext?.colorScheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light');
  const resolvedTheme = {
    ...Colors[resolvedColorScheme],
    ...themeContext?.config?.colors?.[resolvedColorScheme],
  };
  const resolvedStatusBarStyle =
    statusBarStyle ?? (resolvedColorScheme === 'dark' ? 'light-content' : 'dark-content');
  const finalBackgroundColor = backgroundColor ?? resolvedTheme.background;
  const resolvedSafeAreaEdges =
    contentSafeAreaEdges ??
    (header === null
      ? (['top', 'right', 'bottom', 'left'] as Edge[])
      : (['right', 'bottom', 'left'] as Edge[]));
  const insets = {
    top: safeAreaInsets?.top ?? defaultInsets.top,
    right: safeAreaInsets?.right ?? defaultInsets.right,
    bottom: safeAreaInsets?.bottom ?? defaultInsets.bottom,
    left: safeAreaInsets?.left ?? defaultInsets.left,
  };
  const contentPaddings = {
    paddingTop: resolvedSafeAreaEdges.includes('top') ? insets.top : 0,
    paddingRight: resolvedSafeAreaEdges.includes('right') ? insets.right : 0,
    paddingBottom: resolvedSafeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: resolvedSafeAreaEdges.includes('left') ? insets.left : 0,
  };
  const { refresh: refreshNetworkStatus } = useNetworkStatus();
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);

  useEffect(() => {
    onFocusRef.current = onFocus;
    onBlurRef.current = onBlur;
  }, [onFocus, onBlur]);

  useFocusEffect(
    useCallback(() => {
      refreshNetworkStatus();
      onFocusRef.current?.();

      return () => onBlurRef.current?.();
    }, [refreshNetworkStatus])
  );

  const handleRetry = useCallback(() => {
    if (pageStatus !== 'offline') {
      onRetry?.();
      return;
    }

    void refreshNetworkStatus().finally(() => {
      onRetry?.();
    });
  }, [onRetry, pageStatus, refreshNetworkStatus]);

  const renderContent = () => {
    if (pageStatus !== 'default') {
      return (
        <ThemedView style={[styles.fill, contentPaddings]} type="background">
          <PageStatusView
            status={pageStatus}
            style={statusViewStyle}
            error={pageError}
            onRetry={onRetry ? handleRetry : undefined}
            retryText={retryLabel}
            loadingProps={{ fullScreen: true, color: resolvedTheme.primary }}
          />
        </ThemedView>
      );
    }

    const content = scrollEnabled ? (
      keyboardAware ? (
        <KeyboardAwareScrollView
          {...scrollViewProps}
          style={[styles.fill, scrollViewProps?.style]}
          contentContainerStyle={[
            styles.scrollContent,
            contentPaddings,
            contentStyle,
            scrollViewProps?.contentContainerStyle,
          ]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={scrollViewProps?.showsVerticalScrollIndicator ?? false}
        >
          {children}
          {scrollFooter}
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView
          {...scrollViewProps}
          style={[styles.fill, scrollViewProps?.style]}
          contentContainerStyle={[
            styles.scrollContent,
            contentPaddings,
            contentStyle,
            scrollViewProps?.contentContainerStyle,
          ]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={scrollViewProps?.showsVerticalScrollIndicator ?? false}
        >
          {children}
          {scrollFooter}
        </ScrollView>
      )
    ) : (
      <View style={[styles.fill, contentPaddings]}>
        <View
          {...staticContentProps}
          style={[styles.fill, contentStyle, staticContentProps?.style]}
        >
          {children}
          {scrollFooter}
        </View>
      </View>
    );

    return keyboardAware && !scrollEnabled ? (
      <KeyboardControllerAvoidingView style={styles.fill} behavior="padding" automaticOffset>
        {content}
      </KeyboardControllerAvoidingView>
    ) : (
      content
    );
  };

  const renderHeader = () => {
    if (header === null) {
      return null;
    }

    if (header !== undefined) {
      return <View style={headerStyle}>{header}</View>;
    }

    return (
      <View style={headerStyle}>
        <NavBar
          {...navBarProps}
          navBackgroundColor={navBarProps.navBackgroundColor ?? finalBackgroundColor}
          titleColor={navBarProps.titleColor ?? resolvedTheme.text}
          backIconColor={navBarProps.backIconColor ?? resolvedTheme.text}
        />
      </View>
    );
  };

  return (
    <ThemedView
      {...containerProps}
      type="background"
      style={[
        styles.container,
        { backgroundColor: finalBackgroundColor },
        containerStyle,
        containerProps?.style,
      ]}
    >
      <StatusBar barStyle={resolvedStatusBarStyle} />
      {renderHeader()}
      <View style={styles.fill}>{renderContent()}</View>
      {bottomAccessory ? (
        <View
          style={[
            styles.bottomAccessory,
            resolvedSafeAreaEdges.includes('bottom') && {
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {bottomAccessory}
        </View>
      ) : null}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  bottomAccessory: { width: '100%' },
} satisfies Record<string, ViewStyle>);
