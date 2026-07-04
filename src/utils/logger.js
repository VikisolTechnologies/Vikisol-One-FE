// Centralized, structured logging - every log call produces one JSON-shaped object instead of
// ad-hoc console.log strings scattered per page, so a future log aggregator (Sentry, LogRocket,
// a backend ingestion endpoint) can be wired in at this single point without touching callers.
//
// Sensitive data must NEVER reach here: redact() strips known-sensitive key names before a
// context object is logged, as defense-in-depth against a future call site accidentally passing
// a whole employee/payslip object that contains salary/PAN/Aadhaar/bank fields.
const SENSITIVE_KEYS = /password|token|secret|ctc|salary|pan|aadhaar|aadhar|bankaccount|ifsc|ssn/i;

function redact(context) {
  if (!context || typeof context !== 'object') return context;
  const clean = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.test(key)) {
      clean[key] = '[redacted]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = redact(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function emit(level, event, context) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...redact(context),
  };
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  // eslint-disable-next-line no-console
  console[method](`[${event}]`, entry);
  return entry;
}

/** General structured log for significant app events (branding updated, template published, etc). */
export function logEvent(event, context) {
  return emit('info', event, context);
}

/** For genuine failures - API errors, auth failures, permission failures, upload/generation failures. */
export function logError(event, error, context) {
  return emit('error', event, {
    ...context,
    message: error?.message,
    status: error?.status,
  });
}

export function logWarning(event, context) {
  return emit('warn', event, context);
}
