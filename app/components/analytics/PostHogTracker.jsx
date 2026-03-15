import { useEffect, useRef } from "react";
import { useAuth } from "../../hooks";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import { resetPosthogUser, setPosthogGroups, syncPosthogUser } from "../../util/posthog";

export const AppPostHogTracker = () => {
  const { user } = useAuth();
  const { eventId, instance } = useSelectedInstance();
  const previousUserIdRef = useRef(null);

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

  return null;
};

export const ConsumerPostHogTracker = () => null;
