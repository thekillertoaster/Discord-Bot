import Command, { BotClient } from '../Interfaces';
import Administration, { ticketCreateResponse } from "../modules/Administration";
import { GuildMember, TextBasedChannel, TextChannel, User } from "discord.js";
import administration from "../modules/Administration";

const command: Command = {
    data: {
        name: 'tadduser',
        description: 'Adds a user to a ticket',
        options: [
            {
                name: 'user',
                description: 'The user',
                type: 6,
                required: true,
            } ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            try {
                const channel = interaction.channel as TextBasedChannel;

                if ( !channel ) {
                    reject( "Channel not found" );
                    return;
                }

                await interaction.deferReply()
                const AdministrationInstance = new Administration( client );

                if ( !interaction.member ) {
                    reject( "Member not found" );
                    return;
                }

                const user = interaction.options.getUser( 'user' ) as User;

                if ( !user ) {
                    reject( "User not found" );
                    return;
                }

                // user to guild member
                const member = interaction.guild?.members.resolve( user.id ) as GuildMember;

                if ( !member ) {
                    reject( "Member not found" );
                    return;
                }

                await AdministrationInstance.addExtraGuildMemberToSupportTicket( interaction.member as GuildMember, member, channel.id ).catch( ( err ) => {
                    reject( err );
                    return;
                } );

                // generate a link to the channel
                await interaction.followUp( `Added user to this ticket` );

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