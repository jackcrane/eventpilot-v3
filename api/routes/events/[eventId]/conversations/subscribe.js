import { getEmitter, sendEmailEvent } from "#sse";

export const get = [
  // verifyAuth(["manager"]),
  async (req, res) => {
    console.log("Subscribing to SSE");
    const { eventId } = req.params;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();

    const onEmail = (data) => {
      console.log("Received email", data);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    console.log("Getting emitter", eventId);
    const emitter = getEmitter(eventId);
    emitter.on("email", onEmail);

    req.on("close", () => {
      console.log("Closing SSE connection");
      emitter.off("email", onEmail);
      res.end();
    });
  },
];

export const post = [
  (req, res) => {
    // An endpoint to test the SSE connection
    const { eventId } = req.params;
    sendEmailEvent(eventId, { hello: "world" });
    res.json({ message: "OK" });
  },
];
