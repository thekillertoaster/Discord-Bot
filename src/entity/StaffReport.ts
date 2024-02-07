import { Entity, Column } from "typeorm";
import { SupportTicket } from "./SupportTicket";

@Entity()
export class StaffReport extends SupportTicket {}