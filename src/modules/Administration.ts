import { CategoryChannel, Colors, EmbedBuilder, GuildMember, PermissionsBitField, TextChannel } from "discord.js";
import { BotClient } from "../Interfaces";
import { SupportTicket } from "../entity/SupportTicket";

export interface ticketCreateResponse {
    ticketID: number;
    channelID: string;
}

interface transcriptItem {
    username: string;
    message: string;
    timestamp: number;
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

                // @ts-ignore
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

    async createSupportTicket( guildMember: GuildMember ): Promise<ticketCreateResponse> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channelID = await this.createChannelInCategory( "Tickets", "awaiting-rename" ).catch( error => {
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

                const headerMessage = await channel.send( `<@${ guildMember.id }>` ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !headerMessage ) {
                    reject( "Header message not found" );
                    return;
                }

                const supportTicket = new SupportTicket();
                supportTicket.createdChannelID = channelID;
                supportTicket.headerMessageID = headerMessage.id;
                supportTicket.createdTimestamp = Date.now();
                supportTicket.createdBy = guildMember.id;

                const addedTicket = await this.client.appDataSource.manager.save( supportTicket ).catch( error => {
                    reject( error );
                    return;
                } );

                if ( !addedTicket ) {
                    reject( "Failed to add ticket to database" );
                    return;
                }

                // rename the channel to the ticket id
                await channel.setName( `ticket-${ addedTicket.id }` ).catch( error => {
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

    async getTicketIDFromChannel( channelID: string ): Promise<number> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const ticket = await this.client.appDataSource.getRepository( SupportTicket ).findOne( {
                    where: {
                        createdChannelID: channelID
                    }
                } );

                if ( !ticket ) {
                    reject( "Ticket not found" );
                    return;
                }

                resolve( ticket.id )
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
                    return;
                } ) as TextChannel;

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                const members = channel.members.filter( member => !member.user.bot );

                // reshape the members into an array
                const membersArray: GuildMember[] = [];
                members.forEach( member => {
                    membersArray.push( member );
                } );

                resolve( membersArray );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    async closeSupportTicket( guildMember: GuildMember, ticketID: number ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const ticket = await this.client.appDataSource.getRepository( SupportTicket ).findOne( {
                    where: {
                        id: ticketID
                    }
                } );

                if ( !ticket ) {
                    reject( "Ticket not found" );
                    return;
                }

                if ( ticket.createdBy !== guildMember.id && !Administration.hasAdminAccess( guildMember ) ) {
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
                    .setDescription( transcriptString )
                    .setTimestamp( Date.now() )

                let toSend: GuildMember[] = [];
                toSend = await this.getActiveChatParticipants( ticket.createdChannelID ).catch( error => {
                    reject( error );
                    return;
                } ) as GuildMember[];

                // if the owner of the ticket is not in the toSend list, add them
                const ownerMember = await guildMember.guild.members.fetch( ticket.createdBy ).catch( error => {
                    reject( error );
                    return;
                } ) as GuildMember;

                if ( !toSend.some( member => member.id === ownerMember.id ) ) {  // if the owner of the ticket is not in the toSend list, add them
                    toSend.push( ownerMember );
                }

                if ( !toSend.some( member => member.id === guildMember.id ) ) {  // if the closer of the ticket is not in the toSend list, add them
                    toSend.push( guildMember );
                }

                for ( let i = 0; i < toSend.length; i++ ) {
                    console.log( toSend[i].user.username );
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
                await this.client.appDataSource.getRepository( SupportTicket ).delete( ticket ).catch( error => {
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
}

export default Administration;