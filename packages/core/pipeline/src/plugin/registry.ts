import { Registry } from "../registry";
import { AbstractTaskPlugin } from "./api";

export const pluginRegistry = new Registry<AbstractTaskPlugin>();
