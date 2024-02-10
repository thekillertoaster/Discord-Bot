import {
    CategoryChannel,
    Collection,
    Colors,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionsBitField,
    TextChannel
} from "discord.js";
import { BotClient } from "../Interfaces";
import { SupportTicket } from "../entity/SupportTicket";
import { StaffReport } from "../entity/StaffReport";
import { Appeal } from "../entity/Appeal";
import { CommandPermission } from "../entity/CommandPermission";
import { RolePermission } from "../entity/RolePermission";

export interface ticketCreateResponse {
    ticketID: number;
    channelID: string;
}

interface transcriptItem {
    username: string;
    message: string;
    timestamp: number;
}

interface channelToTicketResponse {
    ticketID: number;
    ticketType: TICKET_TYPE;
}

export enum TICKET_TYPE {
    Support,
    Report,
    Appeal
}

class Administration {
    private client: BotClient;

    constructor( client: BotClient ) {
        this.client = client;
    }

    static hasAdminAccess( guildMember: GuildMember ): boolean {
        return guildMember.permissions.has( PermissionsBitField.Flags.Administrator );
    }

    async deleteMessages( channelID: string, amount: number ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = await this.client.channels.fetch( channelID );

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                const textChannel = channel as TextChannel;
                const messages = await textChannel.messages.fetch( { limit: amount } );
                await textChannel.bulkDelete( messages );
                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async createChannelInCategory( categoryName: string, channelName: string ): Promise<string> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const guild = this.client.guilds.cache.get( process.env.GUILD_ID! );
                if ( !guild ) {
                    reject( "Guild not found" );
                    return;
                }

                const category = guild.channels.cache.find( channel => channel.name === categoryName && channel.type === 4 );

                if ( !category ) {
                    reject( "Category not found" );
                    return;
                }

                const categoryChannel = category as CategoryChannel;

                const channel = await guild.channels.create( {
                    name: channelName,
                    parent: categoryChannel,
                } );

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                resolve( channel.id );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async addGuildMemberToChannel( guildMember: GuildMember, channelID: string ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = await this.client.channels.fetch( channelID );

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                const textChannel = channel as TextChannel;
                await textChannel.permissionOverwrites.create( guildMember, {
                    SendMessages: true,
                    ViewChannel: true,
                    ReadMessageHistory: true,
                } );

                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async registerNewCommandPermission( permissionString: string ): Promise<CommandPermission> {
        return new Promise( async ( resolve, reject ) => {
            try {
                // check if the permission already exists
                const existingPermission = await this.client.appDataSource.getRepository( CommandPermission ).findOne( {
                    where: { permissionString: permissionString }
                } ) as CommandPermission;

                if ( existingPermission ) {
                    resolve( existingPermission );
                    return;
                }

                const commandPermission = new CommandPermission();
                commandPermission.permissionString = permissionString;

                const addedPermission = await this.client.appDataSource.manager.save( commandPermission ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !addedPermission ) {
                    reject( "Failed to add permission to database" );
                    return;
                }

                resolve( addedPermission );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async getRolePermissions( roleID: string ): Promise<number[]> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const rolePermissions = await this.client.appDataSource.getRepository( RolePermission ).find( {
                    where: { roleID: roleID }
                } ) as RolePermission[];

                if ( !rolePermissions ) {
                    reject( "Role not found" );
                    return;
                }

                // for each role permission, get the permission id and add it to the array if it's not already there
                const permissions: number[] = [];
                for ( let i = 0; i < rolePermissions.length; i++ ) {
                    if ( !permissions.includes( rolePermissions[i].permission ) ) {
                        permissions.push( rolePermissions[i].permission );
                    }
                }

                resolve( permissions );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async roleHasPermission( roleID: string, permission: string | number ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const rolePermissions = await this.getRolePermissions( roleID ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !rolePermissions ) {
                    reject( "Role not found" );
                    return;
                }

                let commandPermission;
                if ( typeof permission === "string" ) {
                    commandPermission = await this.client.appDataSource.getRepository( CommandPermission ).findOne( {
                        where: { permissionString: permission }
                    } );
                } else if ( typeof permission === "number" ) {
                    commandPermission = await this.client.appDataSource.getRepository( CommandPermission ).findOne( {
                        where: { id: permission }
                    } );
                } else {
                    reject( "Invalid permission type" );
                    return;
                }

                if ( !commandPermission ) {
                    reject( "Permission not found" );
                    return;
                }

                resolve( rolePermissions.includes( commandPermission.id ) );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async getRoles( guildMember: GuildMember ): Promise<string[]> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const roles = guildMember.roles.cache.map( role => role.id );
                resolve( roles );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async userHasPermission( guildMember: GuildMember, permission: string | number ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const roles = await this.getRoles( guildMember ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !roles ) {
                    reject( "Roles not found" );
                    return;
                }

                for ( let i = 0; i < roles.length; i++ ) {
                    const hasPermission = await this.roleHasPermission( roles[i], permission ).catch( error => {
                        reject( error );
                        return;
                    } );

                    if ( hasPermission ) {
                        resolve( true );
                        return;
                    }
                }

                resolve( false );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async addExtraGuildMemberToSupportTicket( executor: GuildMember, target: GuildMember, channelID: string ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = await this.client.channels.fetch( channelID );

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                // ensure the executor either owns the ticket, or is an admin
                const ticketDetails = await this.getTicketIDFromChannel( channelID ).catch( error => {
                    reject( error );
                    return;
                } ) as channelToTicketResponse;

                if ( !ticketDetails ) {
                    reject( "Ticket not found" );
                    return;
                }

                const ticket = await this.findTicketFromDetails( ticketDetails ).catch( error => {
                    reject( error );
                    return;
                } );


                if ( !ticket ) return reject( "Ticket not found" );


                if ( ticket.createdBy !== executor.id && !Administration.hasAdminAccess( executor ) ) {
                    reject( "You do not have permission to add someone to this ticket" );
                    return;
                }

                await this.addGuildMemberToChannel( target, channelID ).catch( error => {
                    reject( error );
                    return;
                } );

                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    private async getChannelTranscript( channelID: string ): Promise<transcriptItem[]> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = await this.client.channels.fetch( channelID );

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                const textChannel = channel as TextChannel;
                const messages = await textChannel.messages.fetch();

                let transcript: transcriptItem[] = [];

                messages.forEach( message => {
                    transcript.push( {
                        username: message.author.username,
                        message: message.content,
                        timestamp: message.createdTimestamp
                    } );
                } );

                transcript = transcript.filter( item => item.message !== "" );  // filter out empty messages

                resolve( transcript );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async createSupportTicket( guildMember: GuildMember, typeOfTicket: TICKET_TYPE ): Promise<ticketCreateResponse> {
        return new Promise( async ( resolve, reject ) => {
            let category: string | undefined;
            switch ( typeOfTicket ) {
                case TICKET_TYPE.Support:
                    category = "Support";
                    break;
                case TICKET_TYPE.Report:
                    category = "Staff Reports";
                    break;
                case TICKET_TYPE.Appeal:
                    category = "Punishment Appeals";
                    break;
            }

            if ( !category ) {
                reject( "Invalid category" );
                return;
            }

            try {
                const channelID = await this.createChannelInCategory( category, "awaiting-rename" ).catch( error => {
                    reject( error );
                    return;
                } ) as string;

                await this.addGuildMemberToChannel( guildMember, channelID ).catch( error => {
                    reject( error );
                    return;
                } );

                const channel = await this.client.channels.fetch( channelID ).catch( error => {
                    reject( error );
                    return;
                } ) as TextChannel;

                const embedDescription = ((): string => {
                    switch ( typeOfTicket ) {
                        case TICKET_TYPE.Support:
                            return `Please provide the following details:\n- In-Game Name (if applicable)\n- Service you are having issues with\n- A detailed description of the issue you are having`;
                        case TICKET_TYPE.Report:
                            return `Please provide the following details:\n- In-Game Name (if applicable)\n- Staff member you are having issues with\n- A detailed description of the issue you are having\n- Any evidence you have to support your claim (screenshots, videos, etc)`;
                        case TICKET_TYPE.Appeal:
                            return `Please provide the following details:\n- In-Game Name (if applicable)\n- Reason for your ban\n- Why you believe you should be unbanned\n- Any evidence you have to support your appeal (screenshots, videos, etc)`;
                        default:
                            return "this should never happen";
                    }
                })();

                const headerEmbed = new EmbedBuilder()
                    .setColor( Colors.Yellow )
                    .setTitle( ((): string => {
                        switch ( typeOfTicket ) {
                            case TICKET_TYPE.Support:
                                return "Support Ticket";
                            case TICKET_TYPE.Report:
                                return "Staff Report";
                            case TICKET_TYPE.Appeal:
                                return "Punishment Appeal";
                            default:
                                return "this should never happen";
                        }
                    })() )
                    .setDescription( embedDescription )

                const headerMessage = await channel.send( { embeds: [ headerEmbed ] } ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !headerMessage ) {
                    reject( "Header message not found" );
                    return;
                }

                const ticket = ((): SupportTicket | StaffReport | Appeal => {
                    switch ( typeOfTicket ) {
                        case TICKET_TYPE.Support:
                            return new SupportTicket();
                        case TICKET_TYPE.Report:
                            return new StaffReport();
                        case TICKET_TYPE.Appeal:
                            return new Appeal();
                        default:
                            return new SupportTicket();
                    }
                })();

                ticket.createdChannelID = channelID;
                ticket.headerMessageID = headerMessage.id;
                ticket.createdTimestamp = Date.now();
                ticket.createdBy = guildMember.id;

                const addedTicket = await this.client.appDataSource.manager.save( ticket ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !addedTicket ) {
                    reject( "Failed to add ticket to database" );
                    return;
                }

                const prefix = ((): string => {
                    switch ( typeOfTicket ) {
                        case TICKET_TYPE.Support:
                            return "support";
                        case TICKET_TYPE.Report:
                            return "report";
                        case TICKET_TYPE.Appeal:
                            return "appeal";
                        default:
                            return "this-should-never-happen";
                    }
                })();

                await channel.setName( `${ prefix }-${ addedTicket.id }` ).catch( error => {
                    reject( error );
                    return;
                } );

                resolve( {
                    ticketID: addedTicket.id,
                    channelID: channelID,
                } );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async getTicketIDFromChannel( channelID: string ): Promise<channelToTicketResponse> {
        return new Promise( async ( resolve, reject ) => {
            try {
                let ticket = await this.client.appDataSource.getRepository( SupportTicket ).findOne( {
                    where: { createdChannelID: channelID }
                } );
                if ( ticket ) {
                    return resolve( { ticketID: ticket.id, ticketType: TICKET_TYPE.Support } );
                }

                ticket = await this.client.appDataSource.getRepository( StaffReport ).findOne( {
                    where: { createdChannelID: channelID }
                } );
                if ( ticket ) {
                    return resolve( { ticketID: ticket.id, ticketType: TICKET_TYPE.Report } );
                }

                ticket = await this.client.appDataSource.getRepository( Appeal ).findOne( {
                    where: { createdChannelID: channelID }
                } );
                if ( ticket ) {
                    return resolve( { ticketID: ticket.id, ticketType: TICKET_TYPE.Appeal } );
                }

                if ( !ticket ) return reject( "Ticket not found" );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async getActiveChatParticipants( channelID: string ): Promise<GuildMember[]> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = await this.client.channels.fetch( channelID ).catch( error => {
                    reject( error );
                    return null;
                } ) as TextChannel;

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                // Attempt to fetch more messages, adjust according to your needs
                const messages = await channel.messages.fetch( { limit: 100 } ).catch( error => {
                    reject( error );
                    return null;
                } ) as Collection<string, Message>;

                if ( !messages ) {
                    reject( "Messages not found" );
                    return;
                }

                const members = new Set<GuildMember>();
                messages.forEach( message => {
                    if ( !message.author.bot && message.member ) { // Check if member is not null
                        members.add( message.member );
                    }
                } );

                const membersArray: GuildMember[] = [];
                members.forEach( member => {
                    if ( member ) { // Extra precaution
                        membersArray.push( member );
                    }
                } );

                return resolve( membersArray );
            } catch ( error ) {
                return reject( error );
            }
        } );
    }

    private async findTicketFromDetails( ticketDetails: channelToTicketResponse ): Promise<SupportTicket | StaffReport | Appeal | undefined> {
        return new Promise( async ( resolve, reject ) => {
            try {
                let ticket: SupportTicket | StaffReport | Appeal | undefined;
                switch ( ticketDetails.ticketType ) {
                    case TICKET_TYPE.Support:
                        ticket = await this.client.appDataSource.getRepository( SupportTicket ).findOne( {
                            where: {
                                id: ticketDetails.ticketID
                            }
                        } ) as SupportTicket;
                        if ( !ticket ) return reject( "Ticket not found" );
                        break;
                    case TICKET_TYPE.Report:
                        ticket = await this.client.appDataSource.getRepository( StaffReport ).findOne( {
                            where: {
                                id: ticketDetails.ticketID
                            }
                        } ) as StaffReport;
                        if ( !ticket ) return reject( "Ticket not found" );
                        break;
                    case TICKET_TYPE.Appeal:
                        ticket = await this.client.appDataSource.getRepository( Appeal ).findOne( {
                            where: {
                                id: ticketDetails.ticketID
                            }
                        } ) as Appeal;
                        if ( !ticket ) return reject( "Ticket not found" );
                        break;
                }

                if ( !ticket ) return reject( "Ticket not found" );

                resolve( ticket );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async closeSupportTicket( executor: GuildMember, ticketDetails: channelToTicketResponse ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const ticket = await this.findTicketFromDetails( ticketDetails ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !ticket ) return reject( "Ticket not found" );

                if ( ticket.createdBy !== executor.id && !Administration.hasAdminAccess( executor ) ) {
                    reject( "You are not the creator of this ticket" );
                    return;
                }

                const channel = await this.client.channels.fetch( ticket.createdChannelID ).catch( error => {
                    reject( error );
                    return;
                } ) as TextChannel;

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                const transcript = await this.getChannelTranscript( ticket.createdChannelID ).catch( error => {
                    reject( error );
                    return;
                } ) as transcriptItem[];

                transcript.reverse();  // reverse the transcript so it's in chronological order

                // squash the transcript into a string
                let transcriptString = "";
                for ( let i = 0; i < transcript.length; i++ ) {
                    transcriptString += `${ transcript[i].username }: ${ transcript[i].message }\n`;
                }

                // create a fancy embed for the transcript using embedbuilder
                const embed = new EmbedBuilder()
                    .setColor( Colors.Orange )
                    .setTitle( `Ticket #${ ticket.id } Transcript` )
                    .setDescription( transcriptString.length > 0 ? transcriptString : "Empty Support Ticket" )
                    .setTimestamp( Date.now() )

                let toSend: GuildMember[];
                toSend = await this.getActiveChatParticipants( ticket.createdChannelID ).catch( error => {
                    reject( error );
                    return;
                } ) as GuildMember[];

                // if the owner of the ticket is not in the toSend list, add them
                const ownerMember = await executor.guild.members.fetch( ticket.createdBy ).catch( error => {
                    reject( error );
                    return;
                } ) as GuildMember;

                if ( toSend.length === 0 ) {
                    toSend.push( ownerMember );
                }

                // if the owner of the ticket is not in the toSend list, add them
                if ( !toSend.some( toSendMember => toSendMember.id === ownerMember.id ) ) {
                    toSend.push( ownerMember );
                }

                if ( !toSend.some( toSendMember => toSendMember.id === executor.id ) ) {  // if the closer of the ticket is not in the toSend list, add them
                    toSend.push( executor );
                }

                for ( let i = 0; i < toSend.length; i++ ) {
                    await toSend[i].send( {
                        embeds: [ embed ]
                    } ).catch( error => {
                        reject( error );
                        return;
                    } );

                    if ( toSend.length > 1 ) {  // if there are more than 1 people in the ticket, delay between sending the transcript to each person
                        await new Promise( resolve => setTimeout( resolve, 500 ) );  // delay to avoid burst rate limiting
                    }
                }

                // delete the channel
                await channel.delete().catch( error => {
                    reject( error );
                    return;
                } );

                // delete the ticket from the database
                switch ( ticketDetails.ticketType ) {
                    case TICKET_TYPE.Support:
                        await this.client.appDataSource.getRepository( SupportTicket ).delete( ticket.id ).catch( error => {
                            reject( error );
                            return;
                        } );
                        break;
                    case TICKET_TYPE.Report:
                        await this.client.appDataSource.getRepository( StaffReport ).delete( ticket.id ).catch( error => {
                            reject( error );
                            return;
                        } );
                        break;
                    case TICKET_TYPE.Appeal:
                        await this.client.appDataSource.getRepository( Appeal ).delete( ticket.id ).catch( error => {
                            reject( error );
                            return;
                        } );
                        break;
                }

                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async addRolePermission( roleID: string, permission: string | number ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                let commandPermission;
                if ( typeof permission === "string" ) {
                    commandPermission = await this.client.appDataSource.getRepository( CommandPermission ).findOne( {
                        where: { permissionString: permission }
                    } );
                } else if ( typeof permission === "number" ) {
                    commandPermission = await this.client.appDataSource.getRepository( CommandPermission ).findOne( {
                        where: { id: permission }
                    } );
                } else {
                    reject( "Invalid permission type" );
                    return;
                }

                if ( !commandPermission ) {
                    reject( "Permission not found" );
                    return;
                }

                // check if the role already has the permission
                const rolePermissions = await this.getRolePermissions( roleID ).catch( error => {
                    reject( error );
                    return;
                } ) as number[];

                if ( rolePermissions ) {
                    if ( rolePermissions.includes( commandPermission.id ) ) {  // if the role already has the permission
                        resolve( false );  // return false to indicate that the role already has the permission
                        return;
                    }
                }

                // create a new role permission
                const rolePermission = new RolePermission();
                rolePermission.roleID = roleID;
                rolePermission.permission = commandPermission.id;

                const addedRolePermission = await this.client.appDataSource.manager.save( rolePermission ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !addedRolePermission ) {
                    reject( "Failed to add role permission to database" );
                    return;
                }

                resolve( true );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }
}

export default Administration;