import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CommandPermission {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    permissionString!: string
}