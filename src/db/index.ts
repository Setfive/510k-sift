import { DataSource } from "typeorm";
import { Device } from "../entity/device";
import { ProductCode } from "../entity/productCode";
import * as dotenv from "dotenv";
import { DeviceRelatedDevice } from "../entity/deviceRelatedDevice";
import { Applicant } from "../entity/applicant";
dotenv.config();

export const appDataSource = new DataSource({
  type: "mysql",
  url: `${process.env.TYPEORM_URL}`,
  synchronize: true,
  logging: false,
  entities: [Device, ProductCode, DeviceRelatedDevice, Applicant],
  subscribers: [],
  migrations: [],
});
