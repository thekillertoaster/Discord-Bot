import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class AwaitingLink {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    userID!: string

    @Column()
    steamID!: string

    @Column()
    linkCode!: string
}

export default AwaitingLink;