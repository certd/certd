import { Registry } from "../registry";
import { AbstractAccess } from "./abstract-access";

// @ts-ignore
export const accessRegistry = new Registry<typeof AbstractAccess>();
