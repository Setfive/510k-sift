import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Device } from "./device";
import { RelatedDeviceType } from "../types/types";

@Entity()
export class DeviceRelatedDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Device, (device) => device.deviceRelatedDevices)
  sDevice: Device;

  @ManyToOne(() => Device, (device) => device.deviceRelatedDevices)
  dDevice: Device;

  @Column({ nullable: false })
  relatedType: RelatedDeviceType;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
