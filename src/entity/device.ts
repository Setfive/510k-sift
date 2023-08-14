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

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  knumber: string;

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

  @Column()
  datereceived: Date;

  @Index()
  @Column({ type: "date" })
  decisiondate: Date;

  @Column()
  decision: string;

  @Column()
  reviewadvisecomm: string;

  @Index()
  @Column()
  productcode: string;

  @Column()
  stateorsumm: string;

  @Column()
  classadvisecomm: string;

  @Column()
  sspindicator: string;

  @Column()
  type: string;

  @Column()
  thirdparty: string;

  @Column()
  expeditedreview: string;

  @Index()
  @Column()
  devicename: string;

  @Column({ nullable: true })
  summaryStatementURL: string;

  @Column({ nullable: true })
  summaryStatementNeedsOCR: boolean;

  @Column({ nullable: true })
  foiaURL: string;

  @Column({ nullable: true })
  foiaNeedsOCR: boolean;

  @Column({ nullable: true })
  summaryStatementS3Path: string;

  @Column({ nullable: true })
  foiaUS3Path: string;

  @Column({ nullable: true, type: "text" })
  indicationsForUse: string;

  @Column({ nullable: true, type: "text" })
  indicationsForUseEmbedding: string;

  @Column({ nullable: true, type: "text" })
  indicationsForUseAI: string;

  @Column({ nullable: true, type: "text" })
  deviceMarketingAudience: string;

  @Column({ nullable: true, type: "text" })
  relatedKNumbers: string;

  @Column({ nullable: true, type: "text" })
  deviceNameEmbedding: string;

  @Index()
  @Column({ nullable: false })
  isEnhanced: boolean;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;

  @OneToMany(
    () => DeviceRelatedDevice,
    (deviceRelatedDevice) => deviceRelatedDevice.sDevice
  )
  deviceRelatedDevices: DeviceRelatedDevice;
}
