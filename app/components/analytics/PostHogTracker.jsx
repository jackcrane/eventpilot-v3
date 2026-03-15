import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import {
  capturePosthogEvent,
  resetPosthogUser,
  setPosthogGroups,
  syncPosthogUser,
} from "../../util/posthog";

const CUID_REGEX = /^c[0-9a-z]{8}[0-9a-z]{4}[0-9a-z]{4}[0-9a-z]{8}$/;

const toRouteTemplate = (pathname) =>
  pathname
    .split("/")
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      return CUID_REGEX.test(segment) ? ":id" : segment;
    })
    .join("/") || "/";

export const AppPostHogTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { eventId, instance } = useSelectedInstance();
  const previousUserIdRef = useRef(null);
  const previousInstanceIdRef = useRef(null);

  useEffect(() => {
    const currentUserId = user?.id ?? null;

    if (currentUserId) {
      syncPosthogUser(user);
    } else if (previousUserIdRef.current) {
      resetPosthogUser();
    }

    previousUserIdRef.current = currentUserId;
  }, [
    user?.id,
    user?.email,
    user?.name,
    user?.accountType,
    user?.emailVerified,
    user?.phoneNumber,
    user?.goodStanding,
  ]);

  useEffect(() => {
    setPosthogGroups({
      eventId,
      instanceId: instance?.id ?? null,
    });
  }, [eventId, instance?.id]);

  useEffect(() => {
    if (instance?.id && previousInstanceIdRef.current !== instance.id) {
      capturePosthogEvent("ui_instance_selected", {
        event_id: eventId,
        instance_id: instance.id,
        instance_name: instance.name,
      });
    }

    previousInstanceIdRef.current = instance?.id ?? null;
  }, [eventId, instance?.id, instance?.name]);

  useEffect(() => {
    capturePosthogEvent("app_page_viewed", {
      surface: "manager",
      path: location.pathname,
      search: location.search || null,
      route_template: toRouteTemplate(location.pathname),
      event_id: eventId,
      instance_id: instance?.id ?? null,
      logged_in: Boolean(user?.id),
    });
  }, [eventId, instance?.id, location.pathname, location.search, user?.id]);

  return null;
};

export const ConsumerPostHogTracker = ({ subdomain }) => {
  const location = useLocation();

  useEffect(() => {
    capturePosthogEvent("app_page_viewed", {
      surface: "consumer",
      path: location.pathname,
      search: location.search || null,
      route_template: toRouteTemplate(location.pathname),
      subdomain,
    });
  }, [location.pathname, location.search, subdomain]);

  return null;
};
