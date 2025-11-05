--
-- PostgreSQL database dump
--

\restrict NexoPLfAi56YLN1j47MzvX6PnBdkYsYa00WgAEWRSHpMiRTExhXcmpmAfYwM8aN

-- Dumped from database version 17.6 (Postgres.app)
-- Dumped by pg_dump version 17.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."User" VALUES
	('cmhf5rrd40004qrwkxh7ccjtk', 'test@eventpilot-test.com', '$2b$10$qOyEaN2EwMXXc0oxCOjYoOC49uLA/J.WKaCs14BfGTJsivDigalQS', '2025-10-31 17:59:55.72', '2025-10-31 17:59:55.72', true, 'Test account', false, 'MANAGER', NULL);


--
-- Data for Name: Email; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Email" VALUES
	('cmhf5rre70009qrwkxk5ufxa4', 'test', 'EventPilot Support <EventPilot@geteventpilot.com>', 'test@eventpilot-test.com', 'Welcome to EventPilot', 'cmhf5rrd40004qrwkxh7ccjtk', '2025-10-31 17:59:55.759', '2025-10-31 17:59:55.759', NULL, NULL, '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html dir="ltr" lang="en"><head><link rel="preload" as="image" href="https://geteventpilot.com/static/email-header.png"/><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/><meta name="x-apple-disable-message-reformatting"/><style>
    @font-face {
      font-family: ''Inter'';
      font-style: normal;
      font-weight: 400;
      mso-font-alt: ''system-ui'';
      src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp504jAa1ZL7W0Q5nw.woff2) format(''woff2'');
    }

    * {
      font-family: ''Inter'', system-ui;
    }
  </style><style>
    @font-face {
      font-family: ''Inter'';
      font-style: semibold;
      font-weight: 600;
      mso-font-alt: ''system-ui'';
      src: url(https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_fjbvMwCp50PDca1ZL7W0Q5nw.woff2) format(''woff2'');
    }

    * {
      font-family: ''Inter'', system-ui;
    }
  </style></head><body style="background-color:#ffffff"><!--$--><div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">Welcome to EventPilot, Test account!<div> ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿</div></div><table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:600px;margin:0 auto;border:1px solid #eee;background-color:#ffffff"><tbody><tr style="width:100%"><td><img src="https://geteventpilot.com/static/email-header.png" style="display:block;outline:none;border:none;text-decoration:none;width:100%;max-height:175px;object-fit:cover" width="100%"/><div style="padding:20px"><h1 style="font-weight:400;margin-top:0">Welcome to EventPilot, <b style="font-weight:600">Test account</b>!</h1><p style="font-size:14px;line-height:24px;margin:16px 0">You have taken the next step in your journey to improving your volunteer and participant experiences. We are so excited to have you on board and cannot wait to get you started!</p><p style="font-size:14px;line-height:24px;margin:16px 0">Please click the button below to confirm your email and start your EventPilot journey.</p><a as="a" href="https://geteventpilot.com/verify?verificationtoken=cmhf5rrdg0007qrwkluum8d81" style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;background-color:#0072ce;color:#ffffff;border-radius:5px;padding:8px 16px 8px 16px;border:none" target="_blank"><span><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12" hidden>&#8202;&#8202;</i><![endif]--></span><span style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:6px">Confirm Email</span><span><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8203;</i><![endif]--></span></a><p style="font-size:12px;line-height:18px;margin:16px 0;color:#667085;margin-top:16px">We verify your email address so we can send product updates and important communications. Your personal information remains private and is only used to deliver EventPilot functionality.</p></div><p style="font-size:12px;line-height:16px;margin:0;color:#8898aa;padding:20px;padding-top:0">We value your privacy and security. Please do not reply to this email. If you need, you can<!-- --> <a href="mailto:support@geteventpilot.com" style="color:#067df7;text-decoration-line:none" target="_blank">contact us here</a>.</p></td></tr></tbody></table><!--7--><!--/$--></body></html>', 'You have a new email from EventPilot!', false, NULL, false, 'SENT', NULL);


--
-- Data for Name: EmailPreferences; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."EmailPreferences" VALUES
	('cmhf5rrd40005qrwkc5ahqlj8', 'cmhf5rrd40004qrwkxh7ccjtk', true, '2025-10-31 17:59:55.72', '2025-10-31 17:59:55.72');


--
-- Data for Name: EmailVerification; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."EmailVerification" VALUES
	('cmhf5rrdg0007qrwkluum8d81', 'cmhf5rrd40004qrwkxh7ccjtk', '2025-10-31 17:59:55.732', '2025-10-31 17:59:55.732', true);


--
-- Data for Name: Logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public."Logs" VALUES
	('cmhf5rrej000bqrwkw591w1ln', 'cmhf5rrd40004qrwkxh7ccjtk', 'EMAIL_SENT', '2025-10-31 17:59:55.771', '2025-10-31 17:59:55.771', NULL, 'cmhf5rre70009qrwkxk5ufxa4', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('cmhf5rret000dqrwkwjf6cgx8', 'cmhf5rrd40004qrwkxh7ccjtk', 'USER_CREATED', '2025-10-31 17:59:55.781', '2025-10-31 17:59:55.781', '::1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- PostgreSQL database dump complete
--

\unrestrict NexoPLfAi56YLN1j47MzvX6PnBdkYsYa00WgAEWRSHpMiRTExhXcmpmAfYwM8aN

