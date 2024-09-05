
/**
 * Converts a JSON string representation of an array into a JavaScript array.
 * If the input is null, undefined, or an empty string, it returns an empty array.
 * If the input is not a valid JSON string, it catches the error and returns an empty array.
 *
 * @param {string} jsonStr - The JSON string to be parsed into an array.
 * @return {string[]} - The parsed array, or an empty array if the input is invalid.
 */
function jsonString2Array(jsonStr: string) {
  try {
    if (jsonStr == null || jsonStr.length <= 0) { // if null, undefined, or empty
      return [];
    }

    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}


/**
 * Converts an array of strings into a JSON string.
 * If the input is null or undefined, it returns the JSON string representation of an empty array.
 *
 * @param {string[]} array - The array of strings to be converted into a JSON string.
 * @return {string} - The JSON string representation of the array.
 */
function array2JsonString(array: string[]) {
  return JSON.stringify(array || []);
}


export {jsonString2Array, array2JsonString};
