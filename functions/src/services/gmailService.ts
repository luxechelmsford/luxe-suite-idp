import * as fs from "fs";
import * as path from "path";
import {luxeSuiteAdminEmailId, luxeSuiteNoRelyEmailId} from "../configs/firebase";
import {Helper} from "../utils/helper";
import {ErrorCodes, ErrorEx} from "../types/errorEx";
import {GSuiteAuth} from "./gsuiteAuth";

/**
 * Represents an attachment to be sent with an email.
 * @typedef {Object} Attachment
 * @property {string} mimeType - The MIME type of the attachment (e.g., 'image/png', 'application/pdf').
 * @property {string} fileName - The name of the file being attached.
 * @property {string} bytes - The content of the file as a base64-encoded string.
 */
type Attachment = {
  mimeType: string;
  fileName: string;
  bytes: string; // Expecting a base64-encoded string
};

/**
 * Represents an email message.
 * @typedef {Object} Message
 * @property {Object} to - The recipient of the email.
 * @property {string|null} [to.name] - The name of the recipient (optional).
 * @property {string} to.emailId - The email address of the recipient.
 * @property {Object} from - The sender of the email.
 * @property {string|null} [from.name] - The name of the sender (optional).
 * @property {string} from.emailId - The email address of the sender.
 * @property {Object} body - The body of the email.
 * @property {string} body.text - The plain text version of the email body.
 * @property {string} body.html - The HTML version of the email body.
 * @property {string} subject - The subject line of the email.
 * @property {Attachment[]} attachments - An array of attachments to be sent with the email.
 */
type Message = {
  to: {
    name?: string | null;
    emailId: string;
  };
  from: {
    name?: string | null;
    emailId: string;
  };
  body: {
    text: string;
    html: string;
  };
  subject: string;
  attachments: Attachment[];
};


/**
 * Class representing a Gmail service for sending emails.
 */
export class GmailService {
  /**
   * Encodes a string to comply with RFC standards.
   * @param {string} str - The string to encode.
   * @return {string} The encoded string.
   */
  private encode(str: string): string {
    return str.replace(/[^\x20-\x7E]/g, (char) => {
      return "=?UTF-8?B?" + Buffer.from(char).toString("base64") + "?=";
    });
  }

  /**
   * Fetches attachments from Google Drive based on the provided file IDs.
   * @param {string} accessToken The jwt access token to be used for authorisation
   * @param {string[]} ids - An array of file IDs from Google Drive.
   * @return {Promise<Attachment[]>} - A promise that resolves to an array of attachments.
   */
  async getAttachments(accessToken: string, ids: string[]): Promise<Attachment[]> {
    const attachments: Attachment[] = [];

    for (const id of ids) {
      try {
        // Step 1: Get the file metadata (mimeType and fileName)
        const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Check if the metadata request was successful
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch metadata for file ID ${id}: ${metadataResponse.statusText}`);
        }

        const fileMetadata = await metadataResponse.json();

        // Step 2: Download the file content as a binary stream
        const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Check if the download request was successful
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download file ID ${id}: ${downloadResponse.statusText}`);
        }

        // Read the response as an ArrayBuffer
        const fileBuffer = await downloadResponse.arrayBuffer();
        const base64Data = Buffer.from(fileBuffer).toString("base64");

        // Push the file details to the attachment array
        attachments.push({
          mimeType: fileMetadata.mimeType,
          fileName: fileMetadata.name,
          bytes: base64Data,
        });
      } catch (error) {
        console.error(`Error fetching file with ID ${id}:`, (error as { message: string }).message);
      }
    }

    return attachments; // Return the promise that resolves to the attachments array
  }

  /**
   * Creates a MIME message from the provided message object.
   * @param {Message} message - The message object.
   * @return {string} The MIME message as a string.
   */
  private createMimeMessage(message: Message): string {
    const nl = "\n"; // New line for Node.js
    const boundary = "__ctrlq_dot_org__";
    const hasAttachments = message.attachments && message.attachments.length > 0;

    // Create the MIME message
    const mimeBody = [
      "MIME-Version: 1.0",
      `From: ${message.from.name ? `"${this.encode(message.from.name)}" ` : ""}<${message.from.emailId}>`,
      `To: ${message.to.name ? `"${this.encode(message.to.name)}" ` : ""}<${message.to.emailId}>`,
      `Subject: ${this.encode(message.subject)}`, // Encode subject to handle special characters

      // Set the top-level Content-Type based on whether attachments exist
      `Content-Type: ${hasAttachments ? "multipart/mixed" : "multipart/alternative"}; boundary=${boundary}${nl}`,

      // if attachments, start the multipart/alternative section
      hasAttachments ? (`--${boundary}`) : "",
      hasAttachments ? (`Content-Type: multipart/alternative; boundary="alt-${boundary}"${nl}`) : "",

      // Add the plain text part
      hasAttachments ? `--alt-${boundary}` : `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      `Content-Transfer-Encoding: base64${nl}`,
      `${Buffer.from(message.body.text, "utf-8").toString("base64")}${nl}`,

      // Add the HTML part
      hasAttachments ? `--alt-${boundary}` : `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      `Content-Transfer-Encoding: base64${nl}`,
      `${Buffer.from(message.body.html, "utf-8").toString("base64")}${nl}`,
    ];

    // Handle file attachments, id any
    for (const attachment of message.attachments) {
      const attachmentBody = [
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.fileName}"`,
        `Content-Disposition: attachment; filename="${attachment.fileName}"`,
        `Content-Transfer-Encoding: base64${nl}`,
        `${attachment.bytes}`, // Ensure files are handled as base64
      ];
      mimeBody.push(attachmentBody.join(nl));
    }

    // Close the multipart/alternative section
    mimeBody.push(`--alt-${boundary}--${nl}`);

    // Return the full MIME message as a single string
    return mimeBody.join(nl);
  }

  /**
   * Sends an email using the Gmail API.
   * @param {string} accessToken The jwt access token to be used for authorisation
   * @param {Message} message - The message object containing email details.
   * @throws {ErrorEx} If sending the email fails.
   */
  private async sendEmail(accessToken: string, message: Message) {
    try {
      const payload = this.createMimeMessage(message);

      // Encode the MIME payload to Base64 URL format
      const base64EncodedPayload = Buffer.from(payload)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      console.debug("MIME BODY");
      console.debug(base64EncodedPayload);

      const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "message/rfc822",
        },
        body: JSON.stringify({raw: base64EncodedPayload}),
      });

      // Check if the response is successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error sending email: ${response.status} - ${errorText}`);
        throw new ErrorEx(
          ErrorCodes.EMAIL_FAILED,
          `Failed to send email. Last error |${errorText}|`
        );
      }

      const sendResponse = await response.json();
      console.log("Email sent successfully:", sendResponse);
    } catch (error) {
      console.error(`Failed to send email. Last error: |${(error as { message: string }).message}|`);
      throw new ErrorEx(
        ErrorCodes.EMAIL_FAILED,
        `Failed to send email. Last error: |${(error as { message: string }).message}|`
      );
    }
  }

  /**
   * Sends a reset password email to the specified user.
   * @param {string} displayName - The display name of the user.
   * @param {string} emailId - The email ID of the user.
   * @param {string} verifyEmailLink - The verify email link.
   * @param {string} resetPasswordLink - The reset password link.
   * @return {Promise<boolean>} A promise that resolves to true upon successful sending.
   */
  public async sendWelcomeEmail(displayName: string, emailId: string, verifyEmailLink: string, resetPasswordLink: string): Promise<boolean> {
    // Load the HTML template
    const filePathText = path.join(__dirname, "templates", "welcomeEmail.txt");
    let plainBody = fs.readFileSync(filePathText, "utf-8");

    // Load the HTML template
    const filePathHtml = path.join(__dirname, "templates", "welcomeEmail.html");
    let htmlBody = fs.readFileSync(filePathHtml, "utf-8");

    const gsuiteAuth = new GSuiteAuth(luxeSuiteAdminEmailId, [
      "https://www.googleapis.com/auth/gmail.compose",
      // do not need drive as we dont havew any attachments
      // "https://www.googleapis.com/auth/drive.file",
    ]);

    const tokens = await gsuiteAuth.jwt.authorize();
    if (!tokens.access_token) {
      throw new ErrorEx(
        ErrorCodes.AUTH_FAILURE,
        "Failed to get access token for the GSuite API Access service account"
      );
    }
    const accesToken = tokens.access_token;

    // Replace placeholders with actual values
    plainBody = plainBody
      .replace("{{verifyEmailLink}}", verifyEmailLink)
      .replace("{{resetPasswordLink}}", resetPasswordLink)
      .replace("{{firstName}}", Helper.capitalizedString(Helper.extractFirstName(displayName)));
    htmlBody = htmlBody
      .replace("{{verifyEmailLink}}", verifyEmailLink)
      .replace("{{resetPasswordLink}}", resetPasswordLink)
      .replace("{{firstName}}", Helper.capitalizedString(Helper.extractFirstName(displayName)));

    const message: Message = {
      to: {
        name: Helper.capitalizedString(displayName),
        emailId: emailId,
      },
      from: {
        name: "LuxeSuite Registration Service",
        emailId: luxeSuiteNoRelyEmailId,
      },
      body: {
        text: plainBody,
        html: htmlBody,
      },
      subject: "Your Luxe Suite Account is Created! Let's Get Started!",
      attachments: await this.getAttachments(accesToken, []),
    };

    await this.sendEmail(accesToken, message);
    return true; // or return any appropriate value based on your needs
  }
}
