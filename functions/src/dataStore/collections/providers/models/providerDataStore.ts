import {Request} from "express";
import {ErrorCodes, ErrorEx} from "../../../../types/errorEx";
import {database} from "../../../../configs/firebase";

/**
 * @class ProviderDataStore
 * @classdesc handles persitence of provider data in the realtime database
 */
export class ProviderDataStore {
  /**
   * Searches for a provider ID based on the given subdomain.
   *
   * This function queries the Firebase Realtime Database to find a provider whose
   * `subdomain` field matches the provided subdomain value. It returns the `providerId`
   * associated with the matched provider, or `null` if no match is found.
   *
   * @param {string[]} subdomains - One or more subdomain to search for within the `subdomain` field.
   * @param {Request} _req - the request object that will have auth details (id token or session cookies)
   * @return {Promise<string|null>} A promise that resolves to the `providerId` if a match is found,
   *                                  or `null` if no match is found.
   *
   * @example
   * const subdomainToSearch = 'xyz'; // Replace with the actual subdomain you want to search for
   * findProviderIdBySubdomain(subdomainToSearch)
   *   .then(providerId => {
   *     if (providerId) {
   *       console.log('Provider ID:', providerId);
   *     } else {
   *       console.log('Provider ID not found');
   *     }
   *   })
   *   .catch(error => {
   *     console.error('Error:', error);
   *   });
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, require-jsdoc
  static async findProviderIdBySubdomains(subdomains: string[], _req: Request) : Promise<string> {
    // Assuming you have Firebase initialized and a reference to the database
    let providerId = "";

    // Reference to the path where the data is stored
    const ref = database.ref("/global/providers");
    for (const subdomain of subdomains) {
      // Query to find the matching subdomain
      console.log(`Searching for subdomain |${subdomain}|`);
      const snapshot = await ref.orderByChild("subdomain").equalTo(subdomain).once("value");

      if (snapshot.exists()) {
        const data = snapshot.val();
        const keys = Object.keys(data);
        if (keys.length !== 1) {
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            `More than one record: |${JSON.stringify(data)}| found for & Subdomain |${subdomain}|`,
          );
        }

        const provider = data[keys[0]];
        if (typeof provider !== "object") {
          console.debug(`Invalid data: |${JSON.stringify(provider)}| found for & Subdomain |${subdomain}|`);
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            "Invalid data: |${JSON.stringify(value)}| foudn for & Subdomain |${}|",
          );
        }

        providerId = keys[0];
        break;
      }
    }

    console.debug(`Returing provideid |${providerId}| from findProviderIdBySubdomains`);
    return providerId;
  }
}
