import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as winston from "winston";

dotenv.config();

export const LOGGER = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.cli(),
    winston.format.timestamp() // adds a timestamp property
  ),
  transports: [new winston.transports.Console()],
});

const server: express.Express = express();
server.set("port", process.env.PORT || 8080);
server.use(bodyParser.urlencoded({ limit: "15mb", extended: false }));
server.use(bodyParser.json({ limit: "15mb" }));

server.get(
  "/api/get/:knumber",
  (req: express.Request, res: express.Response) => {
    const knumber = req.params.knumber;
    console.log(knumber);

    res.send(knumber);
  }
);

const srv = server.listen(server.get("port"), async () => {
  console.log(`> Ready on http://localhost:${server.get("port")}`);
});

srv.setTimeout(30 * 1000);
