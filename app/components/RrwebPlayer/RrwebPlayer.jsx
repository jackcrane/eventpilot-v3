import React, { Suspense } from "react";
import { Typography } from "tabler-react-2";
import { Player } from "@posthog/react-rrweb-player";

// Renders an rrweb replay using @posthog/react-rrweb-player
// Props:
// - events: rrweb event array (required)
// - width, height, className, style: basic sizing/styling
// - playerProps: extra props forwarded to the Player
export const RrwebPlayer = ({
  events,
  width = "100%",
  height = 500,
  className,
  style,
  playerProps = {},
}) => {
  if (!events || events.length === 0) {
    return <Typography.Text>No events to display</Typography.Text>;
  }

  return (
    <Player
      events={events}
      width={width}
      height={height}
      className={className}
      style={style}
      {...playerProps}
    />
  );
};

export default RrwebPlayer;
