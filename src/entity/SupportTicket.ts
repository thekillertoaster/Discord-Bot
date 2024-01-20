import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SupportTicket {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    createdChannelID!: string

    @Column()
    createdTimestamp!: number

    @Column()
    createdBy!: string
}