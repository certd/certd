import { Registry } from "../registry/index.js";
import { AbstractTaskPlugin } from "./api.js";

export const pluginRegistry = new Registry<AbstractTaskPlugin>("plugin");
