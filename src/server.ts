import "reflect-metadata";
import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as winston from "winston";
import {
  getDeviceDTOForKNumber,
  getEnhancedDeviceDTOForKNumber,
  similaritySearchIFUs,
} from "./fetch";
import { appDataSource } from "./db";
import { ISearchRequest } from "./types/service.types";

dotenv.config();

export const LOGGER = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.cli(),
    winston.format.timestamp() // adds a timestamp property
  ),
  transports: [new winston.transports.Console()],
});

(async () => {
  await appDataSource.initialize();

  const server: express.Express = express();
  server.set("port", process.env.PORT || 8080);
  server.use(bodyParser.urlencoded({ limit: "15mb", extended: false }));
  server.use(bodyParser.json({ limit: "15mb" }));

  server.get(
    "/api/get/:knumber",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const knumber = req.params.knumber;
      const deviceDto = await getDeviceDTOForKNumber(knumber);

      res.send(JSON.stringify(deviceDto));
    }
  );

  server.get(
    "/api/enhanced/:knumber",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const knumber = req.params.knumber;
      const deviceDto = await getEnhancedDeviceDTOForKNumber(knumber);

      res.send(JSON.stringify(deviceDto));
    }
  );

  server.post(
    "/api/search",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const searchRequest = req.body as ISearchRequest;
      LOGGER.info(`/api/search: Search=${searchRequest.search}`);
      const result = await similaritySearchIFUs(searchRequest.search);
      res.send(JSON.stringify(result));
    }
  );

  const srv = server.listen(server.get("port"), async () => {
    console.log(`> Ready on http://localhost:${server.get("port")}`);
  });

  srv.setTimeout(30 * 1000);
})();
