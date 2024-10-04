type Primitive = string | number | boolean | null | undefined;
// type PrimitiveArray = Primitive[];
export type ComplexType = Primitive | { [key: string]: ComplexType } | ComplexType[];

/**
 * Compares two arrays of primitive types or simple values to determine if they contain
 * the same elements, regardless of the order. This function does not support arrays of
 * objects or nested arrays, as these require more complex comparisons.
 *
 * @param {any[]} arr1 - The first array to compare. Should contain primitive values or simple data types.
 * @param {any[]} arr2 - The second array to compare. Should contain primitive values or simple data types.
 * @return {boolean} Returns `true` if the arrays contain the same elements after sorting;
 * otherwise, returns `false`.
 *
 * @example
 * const array1 = [2, 1, 3];
 * const array2 = [3, 1, 2];
 * console.log(comparePrimitiveArrays(array1, array2)); // Output: true
 *
 * @example
 * const array1 = [1, 2, 3];
 * const array2 = [1, 2];
 * console.log(comparePrimitiveArrays(array1, array2)); // Output: false
 *
 * @example
 * const array1 = [[1], [2]];
 * const array2 = [1, 2];
 * console.log(comparePrimitiveArrays(array1, array2)); // Output: false
 */
/*
export const comparePrimitiveArrays = (arr1: PrimitiveArray, arr2: PrimitiveArray): boolean => {
  const sortAndStringify = (arr: PrimitiveArray): string => {
    const sortedArr = [...arr].sort((a, b) => {
      const aStr = JSON.stringify(a);
      const bStr = JSON.stringify(b);
      return aStr.localeCompare(bStr);
    });
    return JSON.stringify(sortedArr);
  };

  return sortAndStringify(arr1) === sortAndStringify(arr2);
};
*/

/**
 * Recursively compares two values (objects, arrays, or primitives) to check for deep equality.
 *
 * This function checks for:
 * - Primitive values, ensuring they are strictly equal.
 * - Arrays, ensuring they have the same length and elements (regardless of order).
 * - Objects, ensuring they have the same keys and values, even nested.
 *
 * @param {unknown} data1 - The first value to compare (can be an object, array, or primitive).
 * @param {unknown} data2 - The second value to compare (can be an object, array, or primitive).
 * @return {boolean} - Returns `true` if both values are deeply equal, `false` otherwise.
 *
 * @example
 * // Comparing two objects
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { a: 1, b: { c: 2 } };
 * compareObjects(obj1, obj2); // true
 *
 * @example
 * // Comparing two arrays
 * const arr1 = [1, 2, 3];
 * const arr2 = [3, 2, 1];
 * compareObjects(arr1, arr2); // true
 *
 * @example
 * // Comparing primitive values
 * compareObjects(42, 42); // true
 * compareObjects("hello", "world"); // false
 */
export const compareObjects = (data1: unknown, data2: unknown): boolean => {
  // Check for null or undefined
  if (data1 === null || data2 === null || data1 === undefined || data2 === undefined) {
    return data1 === data2;
  }

  // Check for different types
  if (typeof data1 !== typeof data2) {
    return false;
  }

  // Compare primitive values
  if (typeof data1 !== "object" || typeof data2 !== "object") {
    return data1 === data2;
  }

  // Check if both are arrays
  if (Array.isArray(data1) && Array.isArray(data2)) {
    if (data1.length !== data2.length) return false;

    const sorted1 = [...data1].sort();
    const sorted2 = [...data2].sort();

    for (let index = 0; index < sorted1.length; index++) {
      // call recursively
      const ret = compareObjects(sorted1[index], sorted2[index]);
      if (ret === false) {
        return false;
      }
    }
    return true;
  }

  // Compare objects
  const keys1 = Object.keys(data1 as Record<string, unknown>);
  const keys2 = Object.keys(data2 as Record<string, unknown>);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) =>
    // call recursively
    compareObjects(
      (data1 as Record<string, unknown>)[key],
      (data2 as Record<string, unknown>)[key]
    )
  );
};
