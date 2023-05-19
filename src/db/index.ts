import { DataSource } from "typeorm";
import { Device } from "../entity/device";

export const appDataSource = new DataSource({
  type: "sqlite",
  database: "db.sqlite",
  synchronize: true,
  logging: false,
  entities: [Device],
  subscribers: [],
  migrations: [],
});
