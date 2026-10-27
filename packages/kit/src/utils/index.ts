import { Platform } from 'react-native';

// ========== 平台 ==========
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// ========== 版本 ==========
export const IOS_VERSION = isIOS ? parseInt(Platform.Version as string, 10) : 0;
export const ANDROID_VERSION = isAndroid ? (Platform.Version as number) : 0;
