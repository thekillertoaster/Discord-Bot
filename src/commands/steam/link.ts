import Command, { BotClient } from '../../Interfaces';
import { GuildMember } from "discord.js";
import SteamLinks from "../../modules/SteamLinks";

const command: Command = {
    data: {
        name: 'link',
        description: 'creates a link request for the user to link their steam account',
        options: [
            {
                name: "steamid",
                description: "Your SteamID64 (use /steamid url/username to find it)",
                type: 3,
                required: true
            }
        ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            if ( !(!(interaction.member instanceof GuildMember) || interaction.member?.partial) ) {
                // @ts-ignore
                const steamID = interaction.options.getString( "steamid" );

                if ( !steamID ) {
                    reject( "Invalid SteamID" );
                    return;
                }

                // make sure the steamid is a valid steamid64
                if ( !/^\d{17}$/.test( steamID ) ) {
                    reject( "Invalid SteamID" );
                    return;
                }

                await interaction.deferReply();
                const SLI = new SteamLinks( client );

                const result = await SLI.createLinkRequest( interaction.member as GuildMember, steamID ).catch( ( error ) => {
                    reject( error );
                    return;
                });

                if ( result ) {
                    if ( result.existing ) {
                        await interaction.followUp( `You already have a link request, your code has been messaged to you` );
                    } else {
                        await interaction.followUp( `Link request created, your code has been messaged to you` );
                    }
                    // send the user a message with the link code
                    const user = interaction.member?.user;
                    if ( user ) {
                        await user.send( `Your link code is: ${ result.linkCode }` ).catch( ( error ) => {
                            reject( "Failed to send link code" );
                            return;
                        } );
                    } else {
                        reject( "Failed to find user to send link code" );
                        return;
                    }
                    resolve();
                    return;
                } else {
                    reject( "Failed to create link request" );
                    return;
                }
            } else {
                reject( "Invalid Member" );
                return;
            }
        } );
    }

}

export default command;