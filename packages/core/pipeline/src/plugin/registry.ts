import { Registry } from "../registry";
import { AbstractPlugin } from "./abstract-plugin";

export const pluginRegistry = new Registry<typeof AbstractPlugin>();
