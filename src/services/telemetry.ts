type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (
    error: unknown,
    context?: Record<string, unknown>
  ) => string;
  captureMessage: (
    message: string,
    level?: string
  ) => string;
  setTag: (
    key: string,
    value: string
  ) => void;
};

let sentry: SentryLike | null = null;
let initialized = false;

const dsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

export const initializeTelemetry = () => {
  if (initialized) return;
  initialized = true;

  if (!dsn) {
    if (__DEV__) {
      console.info(
        '[telemetry] Sentry DSN not configured; production crash upload is disabled.'
      );
    }
    return;
  }

  try {
    // Loaded only when a DSN exists, so local/dev builds without
    // Sentry configuration do not require the native module at runtime.
    const module =
      require('@sentry/react-native') as SentryLike;

    module.init({
      dsn,
      enabled: !__DEV__,
      environment:
        process.env.EXPO_PUBLIC_APP_ENV ||
        (__DEV__
          ? 'development'
          : 'production'),
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
      attachStacktrace: true,
    });

    module.setTag(
      'app.product',
      'gym-management'
    );

    sentry = module;
  } catch (error) {
    console.warn(
      '[telemetry] Sentry could not initialize:',
      error
    );
  }
};

export const telemetry = {
  captureException: (
    error: unknown,
    context?: Record<string, unknown>
  ) => {
    if (sentry) {
      sentry.captureException(
        error,
        context
          ? {
              extra: context,
            }
          : undefined
      );
      return;
    }

    if (__DEV__) {
      console.error(
        '[telemetry]',
        error,
        context || {}
      );
    }
  },

  captureMessage: (
    message: string,
    level:
      | 'debug'
      | 'info'
      | 'warning'
      | 'error' = 'info'
  ) => {
    if (sentry) {
      sentry.captureMessage(
        message,
        level
      );
      return;
    }

    if (__DEV__) {
      console.log(
        `[telemetry:${level}]`,
        message
      );
    }
  },
};