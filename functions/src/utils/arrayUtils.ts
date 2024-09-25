type Primitive = string | number | boolean | null | undefined;
type PrimitiveArray = Primitive[];
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

/**
 * Recursively compares two objects or arrays to check for deep equality.
 *
 * @param {object} obj1 - The first object or array to compare.
 * @param {object} obj2 - The second object or array to compare.
 * @return {boolean} - Returns `true` if both objects/arrays are deeply equal, `false` otherwise.
 */
export const compareObjects = (obj1: unknown, obj2: unknown): boolean => {
  console.error(`Calling  compareObjects before [${JSON.stringify(obj1)}] to: |${JSON.stringify(obj2)}|`);
  if (obj1 == null || obj2 == null) {
    return obj1 === obj2;
  }

  if (typeof (obj1) != typeof(obj2)) {
    return false;
  }

  if (Array.isArray(obj1) != Array.isArray(obj2)) {
    return false;
  }

  // Check if both are arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;

    const sorted1 = [...obj1].sort();
    const sorted2 = [...obj2].sort();

    for (let index=0; index < sorted1.length; index++) {
      const ret = compareObjects(sorted1[index], sorted2[index]);
      if (ret === false) {
        return false;
      }
    }
    return true;
  }

  if (typeof obj1 === typeof obj2 && (typeof obj1 === "string" || typeof obj1 === "number" || typeof obj1 === "boolean")) {
    return obj1 === obj2;
  } else if (typeof obj1 === "object" && typeof obj2 === "object" ) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (let index=0; index < keys1.length; index++) {
      const obj1AsObject = obj1 as unknown as { [key: string]: unknown };
      const obj2AsObject = obj2 as unknown as { [key: string]: unknown };
      const ret = compareObjects(obj1AsObject[keys1[index]], obj2AsObject[keys1[index]]);
      if (ret === false) {
        return ret;
      }
    }
  }

  return true;
};
