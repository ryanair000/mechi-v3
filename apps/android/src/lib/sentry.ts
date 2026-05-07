import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';
const sampleRate = Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0);

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || (__DEV__ ? 'development' : 'production'),
  tracesSampleRate: Number.isFinite(sampleRate) ? sampleRate : 0,
  debug: __DEV__ && process.env.EXPO_PUBLIC_SENTRY_DEBUG === 'true',
});
