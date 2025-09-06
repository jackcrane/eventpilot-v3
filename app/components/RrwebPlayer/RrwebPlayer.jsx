import React, { useEffect, useRef } from "react";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";

export const RrwebPlayer = ({ events = [], config = {} }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !events.length) return;

    // Create player instance
    const player = new rrwebPlayer({
      target: containerRef.current,
      props: {
        events,
        width: 400,
        ...config,
      },
    });

    return () => {
      // rrweb-player doesn’t have an official destroy,
      // but we can clear the container to avoid leaks
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [events, config]);

  return <div style={{ maxWidth: "100%" }} ref={containerRef} />;
};
