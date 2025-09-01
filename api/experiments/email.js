import WelcomeEmail from "#emails/forgot-password.jsx";
import { render } from "@react-email/render";

const html = await render(WelcomeEmail.WelcomeEmail({ name: "Jack Crane" }));

// console.log(WelcomeEmail.WelcomeEmail({ name: "Jack Crane" }));
console.log(html);

// await sendEmail({
//   From: "EventPilot Support <EventPilotgeteventpilot.com>",
//   To: "jackgeteventpilot.com",
//   Subject: "New login to EventPilot",
//   HtmlBody: "<h1>Hello</h1>",
// });
