import Command, { BotClient } from '../../Interfaces';
import { GuildMember } from "discord.js";
import SteamLinks from "../../modules/SteamLinks";

const command: Command = {
    data: {
        name: 'checklink',
        description: 'validates your steam link code',
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            if ( !(!(interaction.member instanceof GuildMember) || interaction.member?.partial) ) {
                try {
                    await interaction.deferReply();
                    const SLI = new SteamLinks( client );
                    const result = await SLI.createLink( interaction.member as GuildMember );
                    if ( result ) {
                        await interaction.followUp( `Your steam account has been linked` );
                        resolve();
                        return;
                    } else {
                        await interaction.followUp( `Link code not found in realname field` );
                        resolve();
                        return;
                    }
                } catch ( error ) {
                    reject( error );
                    return;
                }
            } else {
                reject( "Invalid user" );
                return;
            }
        } );
    },
}

export default command;