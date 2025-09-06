import { useEffect, useRef, useState } from "react";
import useSWRMutation from "swr/mutation";
import { publicFetch } from "../util/url";

// Lazy import rrweb to avoid SSR/build issues if not installed yet
let rrwebRecord = null;
async function ensureRrweb() {
  if (!rrwebRecord) {
    const mod = await import("rrweb");
    rrwebRecord = mod.record;
  }
  return rrwebRecord;
}

const finalizeSession = async (url, { arg }) => {
  const res = await publicFetch(url, {
    method: "POST",
    body: JSON.stringify(arg),
    // Ensure the request can complete during page unload
    keepalive: true,
  });
  return res.json();
};

export function useRrweb({ eventId }) {
  const startedAtRef = useRef(null);
  const stopRef = useRef(null);
  const eventsRef = useRef([]);
  const flushingRef = useRef(false);
  const [sessionId, setSessionId] = useState(null);
  const intervalRef = useRef(null);

  const key = eventId ? `/api/events/${eventId}/sessions` : null;
  const { trigger: finalize } = useSWRMutation(key, finalizeSession);

  const createSession = async (meta) => {
    if (!key) return null;
    const res = await publicFetch(key, {
      method: "POST",
      body: JSON.stringify({ meta }),
    });
    const j = await res.json();
    if (res.ok && j?.session?.id) return j.session.id;
    return null;
  };

  const link = async (data) => {
    if (!eventId || !sessionId) return;
    const res = await publicFetch(
      `/api/events/${eventId}/sessions/${sessionId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
    return res.json();
  };

  useEffect(() => {
    if (!eventId) return;

    let canceled = false;
    let removeVisibilityHandler = null;

    const start = async () => {
      try {
        const record = await ensureRrweb();
        if (canceled) return;

        startedAtRef.current = Date.now();
        eventsRef.current = [];

        stopRef.current = record({
          emit(event) {
            eventsRef.current.push(event);
          },
          // Only block Stripe; we mark the Stripe container with data-rr-block
          blockSelector: "[data-rr-block]",
          // We do not mask other inputs/text so we can capture full UX
          maskAllInputs: false,
        });

        // Handle page visibility changes for mobile/background cases
        const onVisibility = async () => {
          if (document.visibilityState === "hidden") {
            // Backgrounded without closing
            void flush(true, "unload");
          } else if (document.visibilityState === "visible") {
            // Resume recording and mark session active again
            try {
              await createSession({
                resumedAt: Date.now(),
                path: window.location.pathname + window.location.search,
              });
            } catch (_) {}
            // restart capture if stopped
            if (!stopRef.current) {
              try {
                const record = await ensureRrweb();
                stopRef.current = record({
                  emit(event) {
                    eventsRef.current.push(event);
                  },
                  blockSelector: "[data-rr-block]",
                  maskAllInputs: false,
                });
              } catch (_) {}
            }
          }
        };
        document.addEventListener("visibilitychange", onVisibility);
        removeVisibilityHandler = () =>
          document.removeEventListener("visibilitychange", onVisibility);
      } catch (e) {
        // swallow errors; recording is non-critical
        console.error("rrweb start failed", e);
      }
    };

    const flush = async (isBackground = false, reason = "unload") => {
      if (flushingRef.current) return;
      flushingRef.current = true;
      try {
        let evts = [];
        if (reason === "interval") {
          // Do not stop recorder; just upload current buffer
          evts = eventsRef.current.slice();
          eventsRef.current = [];
        } else {
          // Stop recorder and upload remaining events
          if (stopRef.current) {
            try {
              stopRef.current();
            } catch (_) {}
            stopRef.current = null;
          }
          evts = eventsRef.current || [];
        }
        if (!evts.length) return;

        const endedAt = Date.now();
        const payload = {
          sessionId,
          events: evts,
          meta: {
            startedAt: startedAtRef.current,
            endedAt,
            durationMs: Math.max(0, endedAt - (startedAtRef.current || endedAt)),
            path: window.location.pathname + window.location.search,
            pageType:
              window.location.pathname.includes("/register")
                ? "register"
                : window.location.pathname.includes("/volunteer")
                ? "volunteer"
                : "consumer",
            userAgent: navigator.userAgent,
          },
          reason,
        };

        // Use SWR mutation with keepalive to survive unload
        if (key) await finalize(payload);
      } catch (e) {
        if (!isBackground) console.error("rrweb flush failed", e);
      } finally {
        flushingRef.current = false;
      }
    };

    // Start recording first, then open a DB session
    start();
    (async () => {
      const openMeta = {
        startedAt: Date.now(),
        path: window.location.pathname + window.location.search,
        pageType:
          window.location.pathname.includes("/register")
            ? "register"
            : window.location.pathname.includes("/volunteer")
            ? "volunteer"
            : "consumer",
        userAgent: navigator.userAgent,
      };
      const id = await createSession(openMeta);
      if (id) setSessionId(id);
    })();

    // Start periodic chunk uploads every 5 seconds
    intervalRef.current = setInterval(() => {
      void flush(false, "interval");
    }, 5000);

    // Flush on unload
    const onUnload = () => {
      void flush(true, "close");
    };
    window.addEventListener("beforeunload", onUnload);
    // iOS may fire pagehide instead
    const onPageHide = () => void flush(true, "unload");
    window.addEventListener("pagehide", onPageHide);

    return () => {
      canceled = true;
      if (removeVisibilityHandler) removeVisibilityHandler();
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
      void flush(true, "unload");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return {
    attachRegistration: async (registrationId) => {
      if (!key) return;
      await publicFetch(key, {
        method: "PATCH",
        body: JSON.stringify({ registrationId }),
      });
    },
    attachVolunteerRegistration: async (volunteerRegistrationId) => {
      if (!key) return;
      await publicFetch(key, {
        method: "PATCH",
        body: JSON.stringify({ volunteerRegistrationId }),
      });
    },
  };
}
