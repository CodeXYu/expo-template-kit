import { FlashList, type FlashListProps } from '@shopify/flash-list';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../../hooks/use-theme';
import { Spinner, ThemedText } from '../../ui-kit';

import { BasePage, type BasePageProps } from '../base-page';
import { Empty } from '../empty';

type ManagedFlashListProps =
  | 'contentContainerStyle'
  | 'data'
  | 'keyboardShouldPersistTaps'
  | 'keyExtractor'
  | 'ListEmptyComponent'
  | 'ListFooterComponent'
  | 'ListHeaderComponent'
  | 'onEndReached'
  | 'onEndReachedThreshold'
  | 'onRefresh'
  | 'refreshing'
  | 'renderItem'
  | 'showsVerticalScrollIndicator'
  | 'style';

export interface PageListProps<ItemT> extends Omit<
  BasePageProps,
  | 'children'
  | 'refreshControl'
  | 'scrollEnabled'
  | 'scrollFooter'
  | 'scrollViewProps'
  | 'staticContentProps'
> {
  data: readonly ItemT[];
  renderItem: NonNullable<FlashListProps<ItemT>['renderItem']>;
  keyExtractor?: FlashListProps<ItemT>['keyExtractor'];
  /** Pull-to-refresh state. Pair this with onRefresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Called when the list reaches onEndReachedThreshold. Guarded while loadingMore. */
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loadingMore?: boolean;
  /** Pass false after the final page. Defaults to true. */
  hasMore?: boolean;
  showNoMore?: boolean;
  loadingMoreText?: string;
  noMoreText?: string;
  listHeaderComponent?: React.ReactElement | null;
  listFooterComponent?: React.ReactElement | null;
  listEmptyComponent?: React.ReactElement | null;
  /** Text used by the built-in empty state when listEmptyComponent is omitted. */
  emptyText?: string;
  listStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: BasePageProps['keyboardShouldPersistTaps'];
  showsVerticalScrollIndicator?: boolean;
  /** Advanced FlashList props not managed by PageList. */
  listProps?: Omit<FlashListProps<ItemT>, ManagedFlashListProps>;
}

/**
 * Page-level FlashList container. It reuses BasePage for navigation, safe
 * areas, and page states, and adds pull-to-refresh plus guarded pagination.
 *
 * Keep pagination state in the page logic or React Query; PageList only
 * renders the footer and prevents onEndReached while a page is loading.
 */
export function PageList<ItemT>({
  data,
  renderItem,
  keyExtractor,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.5,
  loadingMore = false,
  hasMore = true,
  showNoMore = true,
  loadingMoreText,
  noMoreText,
  listHeaderComponent,
  listFooterComponent,
  listEmptyComponent,
  emptyText,
  listStyle,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  listProps,
  ...basePageProps
}: PageListProps<ItemT>) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleEndReached = useCallback(() => {
    if (!onEndReached || loadingMore || hasMore === false || data.length === 0) {
      return;
    }

    onEndReached();
  }, [data.length, hasMore, loadingMore, onEndReached]);

  const paginationFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View accessibilityLiveRegion="polite" style={styles.footer}>
          <Spinner color={theme.primary} size="small" />
          <ThemedText themeColor="textTertiary" type="small">
            {loadingMoreText ?? t('common.loading_more')}
          </ThemedText>
        </View>
      );
    }

    if (showNoMore && hasMore === false && data.length > 0) {
      return (
        <View accessibilityLiveRegion="polite" style={styles.footer}>
          <ThemedText themeColor="textTertiary" type="small">
            {noMoreText ?? t('common.no_more')}
          </ThemedText>
        </View>
      );
    }

    return null;
  }, [
    data.length,
    hasMore,
    loadingMore,
    loadingMoreText,
    noMoreText,
    showNoMore,
    t,
    theme.primary,
  ]);

  const resolvedListFooter =
    listFooterComponent || paginationFooter ? (
      <>
        {listFooterComponent}
        {paginationFooter}
      </>
    ) : null;
  const resolvedListEmpty = listEmptyComponent ?? <Empty text={emptyText} />;

  return (
    <BasePage {...basePageProps} scrollEnabled={false}>
      <FlashList
        {...listProps}
        contentContainerStyle={contentContainerStyle}
        data={data}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        ListEmptyComponent={resolvedListEmpty}
        ListFooterComponent={resolvedListFooter}
        ListHeaderComponent={listHeaderComponent}
        onEndReached={onEndReached ? handleEndReached : undefined}
        onEndReachedThreshold={onEndReachedThreshold}
        onRefresh={onRefresh}
        refreshing={onRefresh ? refreshing : undefined}
        renderItem={renderItem}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        style={StyleSheet.flatten([styles.list, listStyle])}
      />
    </BasePage>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  } satisfies ViewStyle,
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  } satisfies ViewStyle,
});
