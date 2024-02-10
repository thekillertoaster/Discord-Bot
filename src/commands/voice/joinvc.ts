// import command interface
import Command from '../../Interfaces';
import { joinVoiceChannel, VoiceConnection } from '@discordjs/voice';
import { GuildMember, VoiceBasedChannel } from "discord.js";
import { BotClient } from "../../Interfaces";
import Administration from "../../modules/Administration";
import { CommandPermission } from "../../entity/CommandPermission";

const command: Command = {
    data: {
        name: 'joinvc',
        description: 'Makes the bot join your current voice channel'
    },

    async execute( interaction, client: BotClient ) {
        if ( !(!(interaction.member instanceof GuildMember) || interaction.member?.partial) ) {
            const Administrator = new Administration( client );
            const commandPermission = await Administrator.registerNewCommandPermission( "vc.join" ) as CommandPermission;
            const hasPermission = await Administrator.userHasPermission( interaction.member as GuildMember, commandPermission.id );
            if ( !hasPermission ) {
                await interaction.reply( "You do not have permission to use this command" );
                return;
            }


            const channel: VoiceBasedChannel | null = interaction.member?.voice.channel;
            if ( channel ) {
                const connection: VoiceConnection = joinVoiceChannel( {
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: false
                } )
                client.voiceConnection.set( channel.guild.id, connection );
                await interaction.reply( `Joined ${ channel.name }` );
            } else {
                await interaction.reply( 'You need to be in a voice channel to use this command!' );
            }
        }
    },
};

export default command;