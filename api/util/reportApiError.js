import * as Sentry from "@sentry/node";

const sentryEnabled =
  process.env.NODE_ENV !== "test" && Boolean(process.env.SENTRY_DSN);

export const reportApiError = (error, req, extras = {}) => {
  if (!sentryEnabled || !error) {
    return;
  }

  Sentry.withScope((scope) => {
    if (req?.id) {
      scope.setTag("request_id", req.id);
    }

    if (req?.method) {
      scope.setTag("method", req.method);
    }

    if (req?.originalUrl) {
      scope.setTag("url", req.originalUrl);
    }

    if (req?.instanceId) {
      scope.setTag("instance_id", req.instanceId);
    }

    if (req?.user?.id) {
      scope.setUser({ id: req.user.id });
    }

    if (Object.keys(extras).length > 0) {
      scope.setExtras(extras);
    }

    if (req?.params) {
      scope.setExtra("params", req.params);
    }

    if (req?.query) {
      scope.setExtra("query", req.query);
    }

    if (req?.body) {
      scope.setExtra("body", req.body);
    }

    Sentry.captureException(error);
  });
};
