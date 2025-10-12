import { useMemo } from "react";
import { Alert, Typography } from "tabler-react-2";
import { useParams } from "react-router-dom";
import { useTitle } from "react-use";
import { Loading } from "../../../components/loading/Loading";
import { WebsiteRenderer } from "../../../components/WebsiteRenderer/WebsiteRenderer";
import { useReducedSubdomain } from "../../../hooks/useReducedSubdomain";
import { useConsumerWebsite } from "../../../hooks/useConsumerWebsite";

const formatRouteLabel = (key) => {
  if (!key || key === "home") return "Home";
  return key
    .split("-")
    .map((segment) =>
      segment.length > 0
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : segment
    )
    .join(" ");
};

const normalizeRouteParam = (value, fallback = "home") => {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/^\/+/, "");
  return trimmed.length > 0 ? trimmed.toLowerCase() : fallback;
};

export const ConsumerWebsiteRoute = ({ defaultRouteKey = "home" } = {}) => {
  const { routeKey: routeParam } = useParams();
  const routeKey = normalizeRouteParam(routeParam, defaultRouteKey);
  const eventSlug = useReducedSubdomain();

  const {
    event,
    websitePage,
    loading,
    error,
    availableRouteKeys,
  } = useConsumerWebsite({ eventSlug, routeKey });

  const hasPage = useMemo(() => {
    if (!Array.isArray(availableRouteKeys)) return false;
    if (routeKey === "home") return true;
    if (!availableRouteKeys.includes(routeKey)) return false;
    return websitePage?.data != null;
  }, [availableRouteKeys, routeKey, websitePage?.data]);

  const pageTitle = event?.name
    ? `${formatRouteLabel(routeKey)} | ${event.name}`
    : formatRouteLabel(routeKey);
  useTitle(pageTitle);

  if (error) {
    return (
      <div className="container py-4">
        <Alert variant="danger" title="Unable to load page">
          {error.message}
        </Alert>
      </div>
    );
  }

  if (!loading && !hasPage) {
    return (
      <div className="container py-4">
        <Alert variant="warning" title="Page not found">
          <Typography.Text className="mb-0">
            This page does not exist for {event?.name || "this event"}.
          </Typography.Text>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="container py-4">
          <Loading />
        </div>
      ) : (
        <WebsiteRenderer data={websitePage?.data} />
      )}
    </div>
  );
};
