import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SupportTicketAdmin {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    userID!: string

    @Column()
    comment!: string
}