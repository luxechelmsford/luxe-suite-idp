import {google} from "googleapis";
import * as fs from "fs";
import * as path from "path";
import {oAuth2Client} from "../configs/firebase";
import {Helper} from "./helper";

// Create a Cloud Function to send emailId
const sendEmail = async (displayName: string, emailId: string, subject: string, htmlBody: string) => {
  try {
    const gmail = google.gmail({version: "v1", auth: oAuth2Client});

    const email = [
      "From: \"Luxe Suite User Registration\" <info@theluxestudio.co.uk>",
      `To: "${displayName}" <${emailId}>`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0", // Include MIME version
      "",
      htmlBody,
    ].join("\n");

    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64EncodedEmail,
      },
    });
    console.log(`Email sent successfully wth resposne: |${JSON.stringify(response)}|`);
    return true;
  } catch (error) {
    console.error("Error sending emailId:", error);
    return false;
  }
};

// Function to load and customize the email template
export const sendResetPasswordLink = async (displayName: string, emailId: string, resetLink: string): Promise<boolean> => {
  // Load the HTML template
  const filePath = path.join(__dirname, "templates", "welcomeEmail.html");
  let htmlBody = fs.readFileSync(filePath, "utf-8");

  // Replace placeholders with actual values
  htmlBody = htmlBody
    .replace("{{resetLink}}", resetLink)
    .replace("{{firstName}}", Helper.capitalizedString(Helper.extractFirstName(displayName)));

  return await sendEmail(`${displayName}`, emailId, "Your Luxe Suite Account is Created – Let’s Get Started!", htmlBody);
};

