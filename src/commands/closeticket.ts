import Command, { BotClient } from '../Interfaces';
import Administration, { ticketCreateResponse } from "../modules/Administration";
import { GuildMember, User } from "discord.js";
import administration from "../modules/Administration";

const command: Command = {
    data: {
        name: 'closeticket',
        description: 'closes the current ticket',
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

                const ticketDetails = await AdministrationInstance.getTicketIDFromChannel( interaction.channelId );

                try {
                    await AdministrationInstance.closeSupportTicket( member, ticketDetails )
                } catch ( error ) {
                    console.log( "error in: closeSupportTicket" )
                    reject( error );
                    return;
                }

                try {
                    await client.channels.fetch( interaction.channelId );
                } catch ( error ) {
                    client.users.fetch( member.id ).then( async ( user: User ) => {
                        await user.send( `Closed ticket: #${ ticketDetails.ticketID }` );
                    } ).catch( ( err ) => {
                        reject( err );
                        return;
                    } );
                    resolve();
                    return;
                }

                await interaction.followUp( `Closed ticket: #${ ticketDetails.ticketID }` );

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