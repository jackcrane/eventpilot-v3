import { useEffect, useState } from "react";
import { Card, Typography, Input, Button } from "tabler-react-2";

export const ConversationCompose = ({
  sendMessage,
  mutationLoading,
  conversation,
}) => {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (to === "") toast.error("You must enter a recipient");
    // Make sure the to is an email
    if (!to.includes("@")) toast.error("You must enter a valid email");
    if (message === "") toast.error("You must enter a message");

    const ok = await sendMessage(message, to);
    if (ok) {
      setTo(conversation.replyTo);
      setMessage("");
    }
  };

  useEffect(() => {
    setTo(conversation.replyTo);
  }, [conversation]);

  return (
    <Card className="mb-2">
      <Typography.H2>Send a message to this conversation</Typography.H2>
      <Input
        label="To"
        placeholder="Message"
        required
        value={to}
        onChange={setTo}
      />
      <Input
        useTextarea={true}
        label="Message"
        placeholder="Message"
        required
        value={message}
        onChange={setMessage}
      />
      <Button onClick={handleSubmit} loading={mutationLoading}>
        Send
      </Button>
    </Card>
  );
};
