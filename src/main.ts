import fs from 'fs';
import { Client, GatewayIntentBits, Interaction, REST, Routes } from 'discord.js';
import path from 'node:path';
import { config } from 'dotenv';

config();

class BotClient extends Client {
    commands = new Map<string, any>();
}

const client = new BotClient( {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
} );

const token = process.env.TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

async function getCommandFiles( dir: string ): Promise<string[]> {
    const files = await fs.promises.readdir( dir );
    let commandFiles: string[] = [];
    for ( const file of files ) {
        const filePath = path.join( dir, file );
        const stats = await fs.promises.stat( filePath );
        if ( stats.isDirectory() ) {
            commandFiles = commandFiles.concat( await getCommandFiles( filePath ) );
        } else if ( stats.isFile() && file.endsWith( '.js' ) ) {
            commandFiles.push( filePath );
        }
    }
    return commandFiles;
}

async function registerCommands() {
    const commandFiles = await getCommandFiles( './commands' );

    for ( const file of commandFiles ) {
        console.log( 'Loading command', file );
        const { default: command } = await import(path.resolve( file ));
        client.commands.set( command.data.name, command );
    }

    const commands = Array.from( client.commands.values() ).map( cmd => cmd.data );
    const rest = new REST( { version: '10' } ).setToken( token );

    try {
        console.log( 'Started refreshing application (/) commands.' );
        await rest.put( Routes.applicationGuildCommands( clientId, guildId ), { body: commands } );
        console.log( 'Successfully reloaded application (/) commands.' );
    } catch ( error ) {
        console.error( error );
    }
}

async function interactionCreateListener( interaction: Interaction ) {
    if ( !interaction.isCommand() ) return;

    const command = client.commands.get( interaction.commandName );
    if ( command ) {
        try {
            await command.execute( interaction );
        } catch ( error ) {
            console.error( error );
            if ( !interaction.replied ) {
                await interaction.reply( { content: 'There was an error executing that command!', ephemeral: true } );
            }
        }
    }
}

async function main() {
    client.on( 'ready', () => console.log( 'Bot is ready!' ) );
    client.on( 'interactionCreate', interactionCreateListener );
    await client.login( token );
    await registerCommands();
}

main().catch( console.error );
