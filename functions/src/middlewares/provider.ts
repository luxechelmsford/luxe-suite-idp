import {Request} from "express";
import {ErrorCodes, ErrorEx} from "../types/errorEx";
import {ProviderDataStore} from "../dataStores/collections/providerDataStore";

/**
 * @class ProviderDataStore
 * @classdesc handles persitence of provider data in the realtime database
 */
export class Provider {
  /**
   * Searches for a provider ID based on the given subdomain.
   *
   * This function queries the Firebase Realtime Database to find a provider whose
   * `subdomain` field matches the provided subdomain value. It returns the `providerId`
   * associated with the matched provider, or `null` if no match is found.
   *
   * @param {Request} req - the request object that will have auth details (id token or session cookies)
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
  static async findBySubdomain(req: Request) : Promise<string> {
    // Assuming you have Firebase initialized and a reference to the database
    let providerId = "";

    // Get the host header and extract the subdomain as provider ID
    const hostHeader = req.headers.host;
    const subdomainFromHostHeader = hostHeader ? hostHeader.split(".")[0] : "";
    const subdomainFromSubdomainHeaders = req.headers["X-Subdomain"] || req.headers["x-subdomain"] || "";
    const subdomainFromSubdomainHeader = Array.isArray(subdomainFromSubdomainHeaders) ?
      subdomainFromSubdomainHeaders[0]: subdomainFromSubdomainHeaders;

    if (!subdomainFromHostHeader && !subdomainFromSubdomainHeader) {
      throw new ErrorEx(
        ErrorCodes.PROVIDER_ID_FAILURE,
        "Provider ID is required to be passed in the host header as a subdomain part, or in the X-Subdomain header",
      );
    }

    console.debug(`Subdomian in Host header |${subdomainFromHostHeader}|`);
    console.debug(`Subdomain in the X-Subdomain header |${subdomainFromSubdomainHeader}|`);

    // lets build a subdomains array and serach for the provider id by subdomain
    const subdomains = [];
    if (subdomainFromSubdomainHeader) subdomains.push(subdomainFromSubdomainHeader);
    if (subdomainFromHostHeader) subdomains.push(subdomainFromHostHeader);

    const dataStore = new ProviderDataStore();
    for (const subdomain of subdomains) {
      const result = await dataStore.query(JSON.stringify({"subdomain": subdomain}), "", "", "");

      if (result) {
        if (!Array.isArray(result.data)) {
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            `The provider data: |${JSON.stringify(result?.data)}| for Subdomain |${subdomain}| is not an array.`,
          );
        }

        if (result.data.length > 1) {
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            `More than one record: |${JSON.stringify(result.data)}| found for Subdomain |${subdomain}|`,
          );
        }

        if (result.data.length === 0) {
          continue;
        }

        if (typeof result.data[0] !== "object") {
          console.debug(`Invalid data: |${JSON.stringify(result.data[0])}| found for & Subdomain |${subdomain}|`);
          throw new ErrorEx(
            ErrorCodes.DATABASE_CONSISTENCY_ERROR,
            `Data type: |${typeof result.data[0]}| for data |${JSON.stringify(result.data[0])}| related to Subdomain |${subdomain}| must be an object`,
          );
        }

        const provider: {id: string} = result.data[0] as {id: string};
        providerId = provider.id;
        break;
      }
    }

    if (!providerId) {
      console.debug(`Subdomains |${JSON.stringify(subdomains)}| in the Host or X-Subdomain header cannnot be resolved to a provider id.`);
      throw new ErrorEx(
        ErrorCodes.PROVIDER_ID_FAILURE,
        `Subdomains |${JSON.stringify(subdomains)}| in the Host or X-Subdomain header cannnot be resolved to a provider id.`,
      );
    }

    console.debug(`Returing provideid |${providerId}| from findBySubdomains`);
    return providerId;
  }
}
