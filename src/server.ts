import "reflect-metadata";
import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";
import {
  getDeviceDTOForKNumber,
  getEnhancedDeviceDTOForKNumber,
  getIFUForDeviceKNumber,
  getMarketingAudienceForDevice,
  searchDevices,
  similaritySearchIFUs,
} from "./fetch";
import { appDataSource } from "./db";
import { LOGGER } from "./logger";
import {
  IProductCodeSearchRequest,
  ISearchRequest,
  ISemanticSearchRequest,
} from "./types/types";
import { searchProductCodes } from "./fetch/productCodes";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EventEmitter = require("events");

dotenv.config();

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

  server.post(
    "/api/enhance/marketing/:knumber",
    async (req: express.Request, res: express.Response) => {
      const knumber = req.params.knumber;
      const deviceDto = await getMarketingAudienceForDevice(knumber);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(deviceDto));
    }
  );

  server.get(
    "/api/enhance/ifu/:knumber",
    async (req: express.Request, res: express.Response) => {
      res.writeHead(200, {
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Access-Control-Allow-Origin": "*",
      });

      res.write(
        JSON.stringify({ type: "progress", data: "Starting..." }) + "\n\n"
      );
      res.on("close", () => {
        res.end();
      });

      const ee = new EventEmitter();
      ee.on("progress", (data: unknown) => {
        const payload = { type: "progress", data: data };
        LOGGER.info(JSON.stringify(payload));
        res.write(JSON.stringify(payload) + "\n\n");
      });
      const knumber = req.params.knumber;
      const deviceDto = await getIFUForDeviceKNumber(knumber, ee);

      const payload = { type: "device", data: deviceDto };
      res.write(JSON.stringify(payload) + "\n\n");
      res.end();
    }
  );

  server.post(
    "/api/search",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const searchRequest = req.body as ISearchRequest;
      LOGGER.info(`/api/search: Search=${JSON.stringify(searchRequest)}`);
      const result = await searchDevices(searchRequest);
      res.send(JSON.stringify(result));
    }
  );

  server.post(
    "/api/search/semantic",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const searchRequest = req.body as ISemanticSearchRequest;
      LOGGER.info(`/api/search/semantic: Search=${searchRequest.search}`);
      const result = await similaritySearchIFUs(searchRequest.search);
      res.send(JSON.stringify(result));
    }
  );

  server.post(
    "/api/search/product-codes",
    async (req: express.Request, res: express.Response) => {
      res.setHeader("Content-Type", "application/json");
      const searchRequest = req.body as IProductCodeSearchRequest;
      LOGGER.info(
        `/api/search/product-codes: Search=${JSON.stringify(searchRequest)}`
      );
      const result = await searchProductCodes(searchRequest);
      res.send(JSON.stringify(result));
    }
  );

  const srv = server.listen(server.get("port"), async () => {
    console.log(`> Ready on http://localhost:${server.get("port")}`);
  });

  srv.setTimeout(90 * 1000);
})();
