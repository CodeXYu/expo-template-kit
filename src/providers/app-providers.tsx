import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  GlobalLoadingHost,
  AppLifecycleProvider,
  initErrorReporting,
  NetworkStatusProvider,
  OverlayProvider,
} from 'expo-template-kit';

import { queryClient } from '../config/query-client';
import { AppThemeProvider } from './app-theme-provider';
import { DevelopmentBackstage } from './development-backstage';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    initErrorReporting();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DevelopmentBackstage />
      <SafeAreaProvider>
        <KeyboardProvider>
          <AppThemeProvider>
            <QueryClientProvider client={queryClient}>
              <AppLifecycleProvider>
                <NetworkStatusProvider>
                  <OverlayProvider>
                    {children}
                    <GlobalLoadingHost />
                  </OverlayProvider>
                </NetworkStatusProvider>
              </AppLifecycleProvider>
            </QueryClientProvider>
          </AppThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
