import Schema from "async-validator";
import type { FnFormColumn } from "../types/index";

export async function validateFnFormField(key: string, column: FnFormColumn | undefined, value: unknown): Promise<string | undefined> {
  if (!column?.rules?.length) {
    return undefined;
  }
  try {
    await new Schema({ [key]: column.rules }).validate({ [key]: value });
    return undefined;
  } catch (error) {
    const validationError = error as { errors?: Array<{ message?: string }> };
    return validationError.errors?.[0]?.message || "校验失败";
  }
}
