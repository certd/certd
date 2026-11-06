import { computed, type ComputedRef } from "vue";
import type { FnFormContext, FnComputeValue } from "./types";

export function compute<T>(computeFn: (context: FnFormContext) => T): FnComputeValue<T> {
  return { __fnCompute: true, computeFn };
}

function isComputeValue(value: any): value is FnComputeValue {
  return Boolean(value && value.__fnCompute === true && typeof value.computeFn === "function");
}

function isAtomicObject(value: Record<string, any>) {
  return typeof value.setup === "function" || typeof value.render === "function" || Boolean(value.__vccOpts);
}

function resolveValue(value: any, context: FnFormContext, seen: WeakMap<object, any>): any {
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

export function resolveComputedValue<T>(source: T, context: FnFormContext): T {
  return resolveValue(source, context, new WeakMap()) as T;
}

export function resolveComputed<T>(source: () => T, getContext: () => FnFormContext): ComputedRef<T> {
  return computed(() => resolveComputedValue(source(), getContext()));
}
