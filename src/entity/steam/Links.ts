import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Links {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    userID!: string

    @Column()
    steamID!: string
}