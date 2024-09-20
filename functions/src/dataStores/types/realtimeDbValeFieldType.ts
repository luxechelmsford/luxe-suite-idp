/**
 * Enumeration representing the value fields types used in Realtime Database.
 *
 * This enum defines the various data types that can be used in Realtime Database operations.
 *
 * Example:
 *   Array
 *     Say at path /clients value field is {123: {"name": "Arron Jones", ...}, 345:{"name: "Mike Clarke" ...} - the values type will be Array
 *     the values type will be Date, so it can be coneverted between Array (application value) and Collection of Objects wrapped inside an object (realtime database value)
 *   Object
 *     Say at path /clients/123 value field is {"name": "Arron Jones", "age": 30, "consentPhoto": true, dob: 946684800} - the values type will be object
 *   String
 *     Say at path /clients/123/name value field is "Arron Jones" - the values type will be string
 *   Number
 *     Say at path /clients/123/age value field is 20 - the values type will be Number
 *   Boolean
 *     Say at path /clients/123/consentPhoto value field is true - the values type will be Boolean
 *   Date
 *     Say at path /clients/123/dpb value field is 946684800 (unix timestamp of 2000/01/01)
 *     the values type will be Date, so it can be coneverted between Date (application value) and Number (realtime database value)
 *
 * @enum {string}
 */
export enum RealtimeDbValueFieldType {
  Array = "array",
  Object = "object",
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Date = "date",
}
