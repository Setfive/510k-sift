import * as winston from "winston";

export const LOGGER = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.cli(),
    winston.format.timestamp() // adds a timestamp property
  ),
  transports: [new winston.transports.Console()],
});
