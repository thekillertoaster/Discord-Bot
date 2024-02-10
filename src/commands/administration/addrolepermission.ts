import Command, { BotClient } from '../../Interfaces';
import { VoiceConnection } from '@discordjs/voice';
import { GuildMember } from "discord.js";
import Administration from "../../modules/Administration";
import { CommandPermission } from "../../entity/CommandPermission";

const command: Command = {
    data: {
        name: 'addrolepermission',
        description: 'adds a specific permission string to a role',
        options: [
            {
                name: "role",
                description: "The role to add the permission to",
                type: 8,
                required: true
            },
            {
                name: "permission",
                description: "The permission to add",
                type: 3,
                required: true
            }
        ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            try {
                await interaction.deferReply();
                const Administrator = new Administration( client );
                const commandPermission = await Administrator.registerNewCommandPermission( "role.permission.add" ) as CommandPermission;
                const hasPermission = await Administrator.userHasPermission( interaction.member as GuildMember, commandPermission.id );
                if ( !hasPermission ) {
                    reject( "You do not have permission to use this command" );
                    return;
                }

                // @ts-ignore
                const role = interaction.options.getRole( "role" );
                // @ts-ignore
                const permission = interaction.options.getString( "permission" );

                if ( !role || !permission ) {
                    reject( "Invalid role or permission" );
                    return;
                }

                const result = await Administrator.addRolePermission( role.id, permission );
                if ( result ) {
                    await interaction.followUp( `Added permission: ${ permission } to role: ${ role.name }` );
                    resolve();
                    return;
                } else {
                    await interaction.followUp( `Role already has that permission` );
                    resolve();
                    return;
                }
            } catch ( error ) {
                reject( error );
            }
        } );
    },
};

export default command;