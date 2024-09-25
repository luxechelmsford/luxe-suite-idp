/**
 * Helper class containing utility functions for string manipulation.
 */
export class Helper {
  /**
   * Capitalizes the first letter of each word in the given string.
   *
   * @param {string} str - The input string to be capitalized.
   * @return {string} - The capitalized string.
   */
  static capitalizedString = (str: string): string => {
    return ( str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
    );
  };

  /**
   * Extracts the first name from a full name string.
   *
   * @param {string} str - The full name string.
   * @return {string} - The extracted first name or the entire string if no last name exists.
   */
  static extractFirstName = (str: string): string => {
    const parts = str ? str.split(" ") : [];
    return parts.length <= 1 ? str : parts.slice(0, -1).join(" ");
  };

  /**
   * Extracts the last name from a full name string.
   *
   * @param {string} str - The full name string.
   * @return {string} - The extracted last name or an empty string if no last name exists.
   */
  static extractLastName = (str: string): string => {
    const parts = str ? str.split(" ") : [];
    return parts.length <= 1 ? "" : parts[parts.length - 1];
  };


  /**
   * Converts a JSON string representation of an array into a JavaScript array.
   * If the input is null, undefined, or an empty string, it returns an empty array.
   * If the input is not a valid JSON string, it catches the error and returns an empty array.
   *
   * @param {string} jsonStr - The JSON string to be parsed into an array.
   * @return {string[]} - The parsed array, or an empty array if the input is invalid.
   */
  static jsonString2Array(jsonStr: string) {
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
  static array2JsonString(array: string[]) {
    return JSON.stringify(array || []);
  }
}
