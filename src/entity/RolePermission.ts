import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class RolePermission {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    roleID!: string

    @Column()
    permission!: number
}