import type { SplashScreenModule } from 'react-native-splash-screen-newarch';

const SplashScreen: SplashScreenModule = {
  show() {},
  hide() {},
  async getStartupMetrics() {
    return {
      showTime: null,
      hideRequestedTime: null,
      hiddenTime: null,
      nativeVisibleDuration: null,
      hideDuration: null,
    };
  },
};

export default SplashScreen;
