import { Entity, Column } from "typeorm";
import { SupportTicket } from "./SupportTicket";

@Entity()
export class Appeal extends SupportTicket {}

export default Appeal;