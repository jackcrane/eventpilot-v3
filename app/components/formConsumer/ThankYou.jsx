import Confetti from "react-confetti";
import { Typography, Button } from "tabler-react-2";

export const ThankYou = ({ event }) => {
  return (
    <div>
      <Confetti width={800} recycle={false} numberOfPieces={1000} />
      <Typography.H1>Thank you!</Typography.H1>
      <Typography.Text>
        Great volunteers make great events. We will email you your confirmation
        with details on your submission. If you have any questions, please feel
        free to reach out to {event.name} or to EventPilot if you have any
        questions.
      </Typography.Text>
      <Button onClick={() => window.location.reload()}>
        Submit another response
      </Button>
    </div>
  );
};
