import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { DeviceRelatedDevice } from "./deviceRelatedDevice";
import { Device } from "./device";

@Entity()
export class Applicant {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  applicant: string;

  @Column()
  contact: string;

  @Column()
  street1: string;

  @Column()
  street2: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  country_code: string;

  @Column()
  zip: string;

  @Column()
  postal_code: string;

  @Column({ nullable: true, type: "text" })
  aiProfile: string;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @OneToMany(() => Device, (device) => device.company)
  devices: Device[];
}
