import Command, { BotClient } from '../Interfaces';
import Administration, { ticketCreateResponse } from "../modules/Administration";
import { GuildMember, User } from "discord.js";
import administration from "../modules/Administration";

const command: Command = {
    data: {
        name: 'createticket',
        description: 'creates a ticket',
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

                const response = await AdministrationInstance.createSupportTicket( interaction.member as GuildMember ).catch( ( err ) => {
                    reject( err );
                    return;
                } ) as ticketCreateResponse;

                if ( !response ) {
                    reject( "Invalid response" );
                    return;
                }

                // generate a link to the channel
                await interaction.followUp( `Created ticket: <#${ response.channelID }>` );

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