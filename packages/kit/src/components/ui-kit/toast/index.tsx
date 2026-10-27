import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../providers/theme-provider';

import type { OverlayHandle } from '../overlay';
import { showOverlayModal } from '../overlay';

export type ToastPosition = 'top' | 'center' | 'bottom';
export type ToastDuration = 'short' | 'long' | number;
export type ToastIconType = 'none' | 'success' | 'fail' | 'info' | 'stop';

export interface ToastOptions {
  text: ReactNode;
  icon?: ToastIconType;
  position?: ToastPosition;
  duration?: ToastDuration;
  animated?: boolean;
  onClose?: () => void;
}

const TOAST_KEY = 'global-toast';
const TOAST_SHORT_DURATION = 2000;
const TOAST_LONG_DURATION = 3500;

let activeToastHandle: OverlayHandle | null = null;
let activeToastTimer: ReturnType<typeof setTimeout> | null = null;

function clearActiveToastTimer() {
  if (!activeToastTimer) {
    return;
  }

  clearTimeout(activeToastTimer);
  activeToastTimer = null;
}

function resolveToastDuration(duration: ToastDuration = 'short') {
  if (typeof duration === 'number') {
    return duration;
  }

  return duration === 'long' ? TOAST_LONG_DURATION : TOAST_SHORT_DURATION;
}

function clearActiveToastHandle(id?: number) {
  if (id == null || activeToastHandle?.id === id) {
    activeToastHandle = null;
  }
}

function closeToastHandle(handle: OverlayHandle | null) {
  if (!handle) {
    return;
  }

  handle.close();
  clearActiveToastHandle(handle.id);
}

export function hideToast(id?: number) {
  clearActiveToastTimer();

  if (!activeToastHandle) {
    return;
  }

  if (id != null && activeToastHandle.id !== id) {
    return;
  }

  closeToastHandle(activeToastHandle);
}

export function showToast(options: ToastOptions) {
  clearActiveToastTimer();
  closeToastHandle(activeToastHandle);
  const position = options.position ?? 'center';

  const handle = showOverlayModal({
    animated: options.animated ?? true,
    closeOnHardwareBackPress: false,
    containerStyle: getToastPositionerStyle(position),
    modal: false,
    overlayKey: TOAST_KEY,
    overlayOpacity: 0,
    overlayPointerEvents: 'none',
    content: <ToastContainer icon={options.icon ?? 'none'} text={options.text} />,
    onClose: () => {
      if (activeToastHandle?.id === handle.id) {
        clearActiveToastTimer();
        clearActiveToastHandle(handle.id);
      }
      options.onClose?.();
    },
  });

  activeToastHandle = handle;

  const duration = resolveToastDuration(options.duration);
  if (duration > 0) {
    activeToastTimer = setTimeout(() => {
      if (activeToastHandle?.id === handle.id) {
        hideToast(handle.id);
      }
    }, duration);
  }

  return handle.id;
}

export function message(
  text: ReactNode,
  duration: ToastDuration = 'short',
  position: ToastPosition = 'bottom'
) {
  return showToast({ text, duration, position });
}

export function success(
  text: ReactNode,
  duration: ToastDuration = 'short',
  position: ToastPosition = 'center'
) {
  return showToast({ text, duration, position, icon: 'success' });
}

export function fail(
  text: ReactNode,
  duration: ToastDuration = 'short',
  position: ToastPosition = 'center'
) {
  return showToast({ text, duration, position, icon: 'fail' });
}

export function info(
  text: ReactNode,
  duration: ToastDuration = 'short',
  position: ToastPosition = 'center'
) {
  return showToast({ text, duration, position, icon: 'info' });
}

export function stop(
  text: ReactNode,
  duration: ToastDuration = 'short',
  position: ToastPosition = 'center'
) {
  return showToast({ text, duration, position, icon: 'stop' });
}

function ToastContainer({ text, icon }: { text: ReactNode; icon: ToastIconType }) {
  const theme = useTheme();
  const ui = useThemeUiTokens();

  return (
    <View pointerEvents="none" style={styles.surfaceWrap}>
      <View
        style={[
          styles.surface,
          {
            backgroundColor: theme.surface,
            borderRadius: ui.toast.borderRadius,
            minHeight: ui.toast.minHeight,
            maxWidth: ui.toast.maxWidth,
          },
        ]}
      >
        {icon !== 'none' ? <ToastIcon icon={icon} /> : null}
        {typeof text === 'string' || typeof text === 'number' ? (
          <Text style={[styles.text, ui.typography.toast, { color: theme.text }]}>{text}</Text>
        ) : (
          text
        )}
      </View>
    </View>
  );
}

function getToastPositionerStyle(position: ToastPosition): ViewStyle {
  switch (position) {
    case 'top':
      return styles.positionTop;
    case 'bottom':
      return styles.positionBottom;
    case 'center':
    default:
      return styles.positionCenter;
  }
}

function ToastIcon({ icon }: { icon: Exclude<ToastIconType, 'none'> }) {
  const theme = useTheme();
  const iconNameByType = {
    success: 'checkmark-circle',
    fail: 'close-circle',
    info: 'information-circle',
    stop: 'stop-circle',
  } as const;

  const iconColorByType = {
    success: theme.success,
    fail: theme.danger,
    info: theme.primary,
    stop: theme.warning,
  } as const;

  return <Ionicons name={iconNameByType[icon]} size={22} color={iconColorByType[icon]} />;
}

const styles = StyleSheet.create({
  positionTop: {
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 24,
  },
  positionCenter: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  positionBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  surfaceWrap: {
    width: '100%',
    alignItems: 'center',
  },
  surface: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  text: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
