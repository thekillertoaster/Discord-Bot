import Command, { BotClient } from '../../Interfaces';
import Administration, { TICKET_TYPE, ticketCreateResponse } from "../../modules/Administration";
import { GuildMember, User } from "discord.js";
import administration from "../../modules/Administration";
import { CommandPermission } from "../../entity/CommandPermission";

const command: Command = {
    data: {
        name: 'createticket',
        description: 'creates a ticket',
        options: [
            {
                name: 'type',
                description: 'The type of ticket (1 = support, 2 = report, 3 = appeal)',
                type: 4,
                required: false,
            } ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            try {
                await interaction.deferReply()
                const AdministrationInstance = new Administration( client );

                const commandPermission = await AdministrationInstance.registerNewCommandPermission( "ticket.create" ) as CommandPermission;
                const hasPermission = await AdministrationInstance.userHasPermission( interaction.member as GuildMember, commandPermission.id );
                if ( !hasPermission ) {
                    reject( "You do not have permission to use this command" );
                    return;
                }

                if ( !interaction.member ) {
                    reject( "Member not found" );
                    return;
                }

                // @ts-ignore
                let numType: number = interaction.options.getInteger( 'type' );

                if ( !numType ) {
                    numType = 1; // default to support
                }

                if ( numType < 1 || numType > 3 ) {
                    reject( "Invalid type" );
                    return;
                }

                const type = numType - 1 as TICKET_TYPE; // 0 = support, 1 = report, 2 = appeal

                const response = await AdministrationInstance.createSupportTicket( interaction.member as GuildMember, type ).catch( ( err ) => {
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