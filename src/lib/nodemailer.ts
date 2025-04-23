import { createTransport } from "nodemailer";
import { GMAIL_APP_PASSWORD, GMAIL_EMAIL } from "../config";

export const transporter = createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_EMAIL,
    pass: GMAIL_APP_PASSWORD,
  },
});
