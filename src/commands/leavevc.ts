// import command interface
import Command, { BotClient } from '../Interfaces';
import { VoiceConnection } from '@discordjs/voice';
import { GuildMember, VoiceBasedChannel } from "discord.js";

const command: Command = {
    data: {
        name: 'leavevc',
        description: 'Makes the bot leave its current voice channel'
    },

    async execute( interaction, client: BotClient ) {
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