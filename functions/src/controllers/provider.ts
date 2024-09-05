import {idpDatabase} from "../configs/firebase";

/**
 * Searches for a provider ID based on the given subdomain.
 *
 * This function queries the Firebase Realtime Database to find a provider whose
 * `subdomain` field matches the provided subdomain value. It returns the `providerId`
 * associated with the matched provider, or `null` if no match is found.
 *
 * @param {string} subdomain - The subdomain to search for within the `subdomain` field.
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
export async function findProviderIdBySubdomain(subdomain: string) : Promise<string> {
  // Assuming you have Firebase initialized and a reference to the idpDatabase

  // Reference to the path where the data is stored
  const ref = idpDatabase.ref("/global/providers");

  try {
    // Query to find the matching subdomain
    console.log(`Searching for subdomain |${subdomain}|`);
    const snapshot = await ref.orderByChild("subdomain").equalTo(subdomain).once("value");

    // Check if the snapshot contains data
    if (snapshot.exists()) {
      // Get the providerId from the snapshot key
      let providerId = "";
      snapshot.forEach((childSnapshot) => {
        providerId = childSnapshot.key; // The key here is the providerId
      });

      return providerId;
    } else {
      console.log(`No matching subdomain |${subdomain}| found`);
      return "";
    }
  } catch (error) {
    console.error(`Error fetching providerId for subdomain: |${subdomain}|`, error);
    return "";
  }
}

