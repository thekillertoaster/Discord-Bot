import Command, { BotClient } from '../Interfaces';
import Administration, { ticketCreateResponse } from "../modules/Administration";
import { GuildMember, User } from "discord.js";
import administration from "../modules/Administration";

const command: Command = {
    data: {
        name: 'closeticket',
        description: 'closes the current ticket',
        options: [
            {
                name: 'ticketid',
                description: 'the ticket id to close (only needed if not in a ticket channel)',
                type: 4,
                required: false
            }
        ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            try {
                await interaction.deferReply()
                const AdministrationInstance = new Administration( client );

                if ( !interaction.member ) {
                    reject( "Member not found" );
                    return;
                }

                const member = interaction.member as GuildMember;

                // @ts-ignore
                let ticketID = interaction.options.getInteger( 'ticketid' );
                if ( !ticketID ) {
                    ticketID = await AdministrationInstance.getTicketIDFromChannel( interaction.channelId );
                }

                try {
                    await AdministrationInstance.closeSupportTicket( member, ticketID )
                } catch ( error ) {
                    console.log( "error in: closeSupportTicket" )
                    reject( error );
                    return;
                }

                try {
                    await client.channels.fetch( interaction.channelId );
                } catch ( error ) {
                    client.users.fetch( member.id ).then( async ( user: User ) => {
                        await user.send( `Closed ticket: #${ ticketID }` );
                    } ).catch( ( err ) => {
                        reject( err );
                        return;
                    } );
                    resolve();
                    return;
                }

                await interaction.followUp( `Closed ticket: #${ ticketID }` );

                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    },
};

export default command;