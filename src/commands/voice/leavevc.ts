import Command, { BotClient } from '../../Interfaces';
import { VoiceConnection } from '@discordjs/voice';
import { GuildMember } from "discord.js";
import Administration from "../../modules/Administration";
import { CommandPermission } from "../../entity/CommandPermission";

const command: Command = {
    data: {
        name: 'leavevc',
        description: 'Makes the bot leave its current voice channel'
    },

    async execute( interaction, client: BotClient ) {
        const Administrator = new Administration( client );
        const commandPermission = await Administrator.registerNewCommandPermission( "vc.leave" ) as CommandPermission;
        const hasPermission = await Administrator.userHasPermission( interaction.member as GuildMember, commandPermission.id );
        if ( !hasPermission ) {
            await interaction.reply( "You do not have permission to use this command" );
            return;
        }

        const guildID: string = interaction.guildId!;
        const voiceConnection: VoiceConnection | undefined = client.voiceConnection.get( guildID );

        if ( voiceConnection ) {
            voiceConnection.disconnect();
            voiceConnection.destroy();
            client.voiceConnection.delete( guildID );
            await interaction.reply( 'Left voice channel' );
        }
    },
};

export default command;