import * as dotenv from "dotenv";
import * as express from "express";
import * as bodyParser from "body-parser";

dotenv.config();

const server: express.Express = express();
server.set("port", process.env.PORT || 8080);
server.use(bodyParser.urlencoded({ limit: "15mb", extended: false }));
server.use(bodyParser.json({ limit: "15mb" }));
