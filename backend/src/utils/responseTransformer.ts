/**
 * Utility to convert database snake_case keys to frontend camelCase keys
 */

export const toCamelCase = (str: string): string => {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
};

export const transformObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((v) => transformObject(v));
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [toCamelCase(key)]: transformObject(obj[key]),
      }),
      {}
    );
  }
  return obj;
};

/**
 * Direct transformation for database result rows
 */
export const transformResult = (result: any): any => {
  if (!result) return null;

  if (Array.isArray(result)) {
    return result.map(row => transformObject(row));
  }

  if (result.rows) {
    return result.rows.map((row: any) => transformObject(row));
  }

  return transformObject(result);
};
