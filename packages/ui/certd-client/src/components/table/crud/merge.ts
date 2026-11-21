export function deepClone<T>(value: T, seen = new WeakMap<object, any>()): T {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const result: any[] = [];
    seen.set(value, result);
    for (const item of value) {
      result.push(deepClone(item, seen));
    }
    return result as T;
  }
  if (!isPlainObject(value)) {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value);
  }
  const result: Record<string, any> = {};
  seen.set(value, result);
  for (const [key, item] of Object.entries(value)) {
    result[key] = deepClone(item, seen);
  }
  return result as T;
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = deepClone(target);
  for (const [key, value] of Object.entries(source)) {
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = deepClone(value);
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
