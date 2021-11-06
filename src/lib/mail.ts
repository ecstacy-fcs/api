import sendgrid from "@sendgrid/mail";
import "dotenv/config";
import { FROM_EMAIL_ID } from "src/constants/mail";

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export const mail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> => {
  try {
    await sendgrid.send({
      from: FROM_EMAIL_ID,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};
