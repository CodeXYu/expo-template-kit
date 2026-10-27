import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type ColorValue, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

import OverlayBase from '../overlay/internal/OverlayBase';
import { hideOverlay, showOverlay, updateOverlay } from '../overlay/internal/runtime';
import { Spinner } from '../spinner';

export interface LoadingProps {
  fullScreen?: boolean;
  color?: string;
  size?: 'small' | 'large';
  text?: string;
}

export interface LoadingOverlayProps extends LoadingProps {
  visible?: boolean;
  duration?: number;
  maskColor?: ColorValue;
}

export interface GlobalLoadingOptions {
  text?: string;
  duration?: number;
  visible?: boolean;
  color?: LoadingProps['color'];
  maskColor?: LoadingOverlayProps['maskColor'];
  size?: LoadingProps['size'];
}

interface GlobalLoadingState extends GlobalLoadingOptions {
  visible: boolean;
}

type LoadingSubscriber = (state: GlobalLoadingState) => void;

const DEFAULT_MASK_COLOR = 'transparent';
const DEFAULT_GLOBAL_LOADING_STATE: GlobalLoadingState = {
  visible: false,
  text: '',
  duration: undefined,
};

let globalLoadingState: GlobalLoadingState = DEFAULT_GLOBAL_LOADING_STATE;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<LoadingSubscriber>();

function clearHideTimer() {
  if (!hideTimer) {
    return;
  }

  clearTimeout(hideTimer);
  hideTimer = null;
}

function emitLoadingState(nextState: GlobalLoadingState) {
  globalLoadingState = nextState;
  subscribers.forEach(subscriber => subscriber(nextState));
}

function normalizeShowOptions(options?: GlobalLoadingOptions | string): GlobalLoadingState {
  if (typeof options === 'string') {
    return {
      ...DEFAULT_GLOBAL_LOADING_STATE,
      visible: true,
      text: options,
    };
  }

  return {
    ...DEFAULT_GLOBAL_LOADING_STATE,
    ...options,
    visible: options?.visible ?? true,
  };
}

function scheduleAutoHide(duration?: number) {
  clearHideTimer();

  if (!duration || duration <= 0) {
    return;
  }

  hideTimer = setTimeout(() => {
    hideLoading();
  }, duration);
}

function subscribeLoading(subscriber: LoadingSubscriber) {
  subscribers.add(subscriber);
  subscriber(globalLoadingState);

  return () => {
    subscribers.delete(subscriber);
  };
}

export function showLoading(options?: GlobalLoadingOptions | string) {
  const nextState = normalizeShowOptions(options);
  emitLoadingState(nextState);
  scheduleAutoHide(nextState.duration);
}

export function hideLoading() {
  clearHideTimer();
  emitLoadingState({
    ...DEFAULT_GLOBAL_LOADING_STATE,
    visible: false,
  });
}

export function updateLoading(options: Partial<GlobalLoadingOptions>) {
  const nextState: GlobalLoadingState = {
    ...globalLoadingState,
    ...options,
    visible: options.visible ?? globalLoadingState.visible,
  };

  emitLoadingState(nextState);

  if ('duration' in options) {
    scheduleAutoHide(options.duration);
  }

  if (!nextState.visible) {
    hideLoading();
  }
}

export function disposeLoading() {
  clearHideTimer();
  emitLoadingState({
    ...DEFAULT_GLOBAL_LOADING_STATE,
    visible: false,
  });
}

export const Loading: React.FC<LoadingProps> = ({
  fullScreen = false,
  color,
  size = 'large',
  text,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const resolvedText = text ?? t('common.loading');

  return (
    <View style={[styles.inlineContainer, fullScreen && styles.fullScreen]}>
      <Spinner size={size} color={color} />
      {resolvedText ? (
        <Text style={[styles.inlineText, { color: theme.textSecondary }]}>{resolvedText}</Text>
      ) : null}
    </View>
  );
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible = false,
  text,
  duration,
  color,
  maskColor,
  size,
}) => {
  useEffect(() => {
    return () => {
      if (visible) {
        disposeLoading();
      }
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      hideLoading();
      return;
    }

    showLoading({ color, duration, maskColor, size, text, visible: true });

    return () => {
      disposeLoading();
    };
  }, [color, duration, maskColor, size, text, visible]);

  return null;
};

function LoadingHostContent({
  color,
  maskColor = DEFAULT_MASK_COLOR,
  size = 'large',
  text,
  visible,
}: LoadingOverlayProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ui = useThemeUiTokens();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={styles.hostRoot}>
      <View
        pointerEvents="auto"
        style={[
          styles.hostMask,
          {
            backgroundColor: maskColor,
            paddingBottom: insets.bottom,
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={[
            styles.overlayContent,
            {
              backgroundColor: theme.background,
              borderRadius: ui.loading.borderRadius,
              minWidth: ui.loading.minWidth,
              maxWidth: ui.loading.maxWidth,
            },
          ]}
        >
          <Spinner size={size} color={color ?? theme.primary} />
          <Text style={[styles.overlayText, { color: theme.text }]}>
            {text || t('common.loading')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const GlobalLoadingHost: React.FC = () => {
  const [state, setState] = useState<GlobalLoadingState>(globalLoadingState);
  const overlayKeyRef = React.useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeLoading(setState);

    return () => {
      unsubscribe();
      clearHideTimer();
    };
  }, []);

  useEffect(() => {
    const element = (
      <OverlayBase
        animated
        closeOnHardwareBackPress={false}
        maskColor={state.maskColor ?? DEFAULT_MASK_COLOR}
        modal
        overlayOpacity={1}
      >
        <LoadingHostContent
          color={state.color}
          maskColor="transparent"
          size={state.size}
          text={state.text}
          visible={state.visible}
        />
      </OverlayBase>
    );

    if (!state.visible) {
      if (overlayKeyRef.current !== null) {
        hideOverlay(overlayKeyRef.current);
        overlayKeyRef.current = null;
      }
      return;
    }

    if (overlayKeyRef.current === null) {
      overlayKeyRef.current = showOverlay(element);
      return;
    }

    updateOverlay(overlayKeyRef.current, element);
  }, [state.color, state.maskColor, state.size, state.text, state.visible]);

  useEffect(() => {
    return () => {
      if (overlayKeyRef.current !== null) {
        hideOverlay(overlayKeyRef.current);
        overlayKeyRef.current = null;
      }
    };
  }, []);

  return null;
};

export function useLoadingCleanup() {
  useEffect(() => {
    return () => {
      disposeLoading();
    };
  }, []);
}

const styles = StyleSheet.create({
  inlineContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  inlineText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  } satisfies ViewStyle,
  overlayContent: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  } satisfies ViewStyle,
  hostMask: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } satisfies ViewStyle,
  hostRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 1200,
    elevation: 1200,
  } satisfies ViewStyle,
  overlayText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
