import { Registry } from "../registry";
import { AbstractPlugin } from "./abstract-plugin";

// @ts-ignore
export const pluginRegistry = new Registry<typeof AbstractPlugin>();
