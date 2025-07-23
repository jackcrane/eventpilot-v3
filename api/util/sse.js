import { EventEmitter } from "events";

const emitters = {};

export const getEmitter = (eventId) => {
  if (!emitters[eventId]) {
    const ee = new EventEmitter();
    ee.setMaxListeners(0);
    emitters[eventId] = ee;
  }
  console.log("Getting emitter", eventId);
  return emitters[eventId];
};

export const sendEmailEvent = (eventId, payload) => {
  try {
    console.log("Sending email event", eventId, payload);
    getEmitter(eventId).emit("email", payload);
  } catch (error) {
    console.error("Error sending email event", error);
  }
};
