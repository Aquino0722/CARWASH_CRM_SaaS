import pino from "pino";
import { config } from "./config.js";

const transport =
  process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined;

export const logger = pino({
  level: config.logLevel,
  transport,
});
