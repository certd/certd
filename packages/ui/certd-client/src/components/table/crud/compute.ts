import { computed, type ComputedRef } from "vue";
import type { FnComputeContext, FnComputeValue } from "../types/index";

export function compute<T>(computeFn: (context: FnComputeContext) => T): FnComputeValue<T> {
  return { __fnCompute: true, computeFn };
}

export function isFnComputeValue(value: unknown): value is FnComputeValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<FnComputeValue>;
  return candidate.__fnCompute === true && typeof candidate.computeFn === "function";
}

function isComputeValue(value: unknown): value is FnComputeValue {
  return isFnComputeValue(value);
}

function isAtomicObject(value: Record<string, any>) {
  return typeof value.setup === "function" || typeof value.render === "function" || Boolean(value.__vccOpts);
}

function resolveValue(value: any, context: FnComputeContext, seen: WeakMap<object, any>): any {
  if (isComputeValue(value)) {
    return resolveValue(value.computeFn(context), context, seen);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const result: any[] = [];
    seen.set(value, result);
    for (const item of value) {
      result.push(resolveValue(item, context, seen));
    }
    return result;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype && !isAtomicObject(value)) {
    if (seen.has(value)) {
      return seen.get(value);
    }
    const result: Record<string, any> = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = resolveValue(item, context, seen);
    }
    return result;
  }
  return value;
}

export function resolveComputedValue<T>(source: T, context: FnComputeContext): T {
  return resolveValue(source, context, new WeakMap()) as T;
}

export function resolveComputed<T>(source: () => T, getContext: () => FnComputeContext): ComputedRef<T> {
  return computed(() => resolveComputedValue(source(), getContext()));
}
