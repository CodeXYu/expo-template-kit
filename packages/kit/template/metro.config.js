// Sentry assigns unique Debug IDs to bundles and source maps so release
// crashes can be symbolicated. This wraps Expo's default Metro config.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
