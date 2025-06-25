import { Timeline, Typography, Spinner } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { useParams } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useWhatNextMap } from "../../hooks/useWhatNextMap";
import { useUserProgress } from "../../hooks/useUserProgress";

export const WhatNext = () => {
  const { eventId } = useParams();

  return eventId ? <WhatNext_Event /> : <WhatNext_User />;
};

const WhatNext_User = () => {
  const { steps, loading } = useUserProgress();
  const whatNextMap = useWhatNextMap();

  return (
    <div>
      <Typography.Text>
        We know setting up EventPilot can be daunting. Here are some next steps
        to get started!
      </Typography.Text>
      {loading ? (
        <Spinner />
      ) : (
        <Timeline
          dense
          // events, sorted so done are last
          events={Object.entries(steps)
            ?.map((item) => whatNextMap(item[0], item[1]))
            .sort((a, b) => a.done - b.done)}
        />
      )}
    </div>
  );
};

const WhatNext_Event = () => {
  const { eventId } = useParams();
  const { progress, loading } = useDashboardData(eventId);
  const { steps, loading: loadingProgress } = useUserProgress();
  const whatNextMap = useWhatNextMap();

  return (
    <div style={{ maxHeight: "70vh", overflowX: "auto" }}>
      <Typography.Text>
        We know setting up EventPilot can be daunting. Here are some next steps
        to get started!
      </Typography.Text>
      {loading || loadingProgress ? (
        <Spinner />
      ) : (
        <Timeline
          dense
          events={[...Object.entries(progress.steps), ...Object.entries(steps)]
            ?.map((item) => whatNextMap(item[0], item[1]))
            .sort((a, b) => a.done - b.done)}
        />
      )}
    </div>
  );
};
