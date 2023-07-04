import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ProductCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  productCode: string;

  @Column()
  reviewPanel: string;

  @Column()
  medicalSpeciality: string;

  @Column()
  deviceName: string;

  @Column({ nullable: true })
  deviceClass: string;

  @Column({ nullable: true })
  regulationNumber: string;
}
