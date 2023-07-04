import { DataSource } from "typeorm";
import { Device } from "../entity/device";
import { ProductCode } from "../entity/productCode";

export const appDataSource = new DataSource({
  type: "sqlite",
  database: "db.sqlite",
  synchronize: true,
  logging: false,
  entities: [Device, ProductCode],
  subscribers: [],
  migrations: [],
});
