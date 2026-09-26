import { telemetry } from './telemetry';

type Context =
  Record<string, unknown>;

const SENSITIVE_KEYS =
  /password|token|secret|authorization|anon.?key|service.?role|phone|email|address|photo/i;

const sanitize = (
  value: unknown,
  depth = 0
): unknown => {
  if (depth > 3) {
    return '[truncated]';
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map(item =>
        sanitize(item, depth + 1)
      );
  }

  if (typeof value === 'object') {
    const output:
      Record<string, unknown> = {};

    Object.entries(
      value as Record<
        string,
        unknown
      >
    ).forEach(([key, item]) => {
      output[key] =
        SENSITIVE_KEYS.test(key)
          ? '[redacted]'
          : sanitize(
              item,
              depth + 1
            );
    });

    return output;
  }

  return String(value);
};

const safeContext = (
  context?: Context
): Context | undefined =>
  context
    ? (sanitize(context) as Context)
    : undefined;

export const logger = {
  debug: (
    message: string,
    context?: Context
  ) => {
    if (__DEV__) {
      console.debug(
        message,
        safeContext(context) || ''
      );
    }
  },

  info: (
    message: string,
    context?: Context
  ) => {
    if (__DEV__) {
      console.info(
        message,
        safeContext(context) || ''
      );
    }
  },

  warn: (
    message: string,
    context?: Context
  ) => {
    console.warn(
      message,
      safeContext(context) || ''
    );

    telemetry.captureMessage(
      message,
      'warning'
    );
  },

  error: (
    message: string,
    error: unknown,
    context?: Context
  ) => {
    console.error(
      message,
      error,
      safeContext(context) || ''
    );

    telemetry.captureException(
      error,
      {
        message,
        ...(safeContext(context) || {}),
      }
    );
  },
};