import { StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Loading, type LoadingProps } from '../../ui-kit';

import { Empty } from '../empty';
import { ErrorView } from '../error-view';
import { OfflineView, type OfflineViewProps } from '../offline-view';

export type PageStatus = 'default' | 'loading' | 'empty' | 'error' | 'offline';

export interface PageStatusViewProps {
  status: Exclude<PageStatus, 'default'>;
  style?: StyleProp<ViewStyle>;
  loadingProps?: LoadingProps;
  emptyText?: string;
  emptyImage?: string;
  error?: unknown;
  onRetry?: () => void;
  retryText?: string;
  offlineProps?: Omit<OfflineViewProps, 'onRetry' | 'retryText'>;
}

/**
 * PageStatusView centralizes page-level loading, empty, error, and offline UI.
 * BasePage can switch by status without duplicating conditional rendering.
 */
export function PageStatusView({
  status,
  style,
  loadingProps,
  emptyText,
  emptyImage,
  error,
  onRetry,
  retryText,
  offlineProps,
}: PageStatusViewProps) {
  return (
    <View style={[styles.container, style]}>
      {status === 'loading' ? <Loading fullScreen {...loadingProps} /> : null}
      {status === 'empty' ? <Empty text={emptyText} image={emptyImage} /> : null}
      {status === 'error' ? (
        <ErrorView error={error} onRetry={onRetry} retryButtonText={retryText} />
      ) : null}
      {status === 'offline' ? (
        <OfflineView {...offlineProps} onRetry={onRetry} retryText={retryText} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
