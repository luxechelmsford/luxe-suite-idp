import {beforeUserCreated} from "firebase-functions/v2/identity";
import {ErrorCodes, ErrorEx} from "../types/errorEx";

export const beforecreated = beforeUserCreated((event) => {
  if (event.data.uid !== event.data.email) {
    throw new ErrorEx(
      ErrorCodes.AUTH_UID_EMAIL_MISMATCHED,
      `The user create event blocked. UID |${event.data.uid}| and |${event.data.email}| must match with each other.`,
    );
  }
  return;
});
