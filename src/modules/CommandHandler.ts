import { BotClient } from "../Interfaces";
import { promises as fsPromises } from "fs";
import path from "node:path";
import { Interaction, REST, Routes } from "discord.js";
import { join } from "path";

class CommandHandler {
    client: BotClient;

    constructor( client: BotClient ) {
        this.client = client
    }

    private async getCommandFiles( dir: string ): Promise<string[]> {
        try {
            const files = await fsPromises.readdir( dir );
            const filePromises = files.map( async ( file ) => {
                const filePath = join( dir, file );
                const stats = await fsPromises.stat( filePath );

                if ( stats.isDirectory() ) {
                    return this.getCommandFiles( filePath ); // Recursively scan directories
                } else if ( stats.isFile() && file.endsWith( '.js' ) ) {
                    return filePath; // Return file path if it's a JavaScript file
                }
            } );

            const fileList = await Promise.all( filePromises );
            return fileList.flat().filter( ( path ): path is string => !!path ); // Flatten and filter out undefined values
        } catch ( error ) {
            console.error( 'Error reading command files:', error );
            return [];
        }
    }

    async registerCommands( token: string, clientId: string, guildId: string, commandDir: string = './commands' ): Promise<boolean> {
        try {
            const commandFiles = await this.getCommandFiles( commandDir );

            for ( const file of commandFiles ) {
                console.log( 'Loading command', file );
                const { default: command } = await import(path.resolve( file ));
                this.client.commands.set( command.data.name, command );
            }

            const commands = Array.from( this.client.commands.values() ).map( cmd => cmd.data );
            const rest = new REST( { version: '10' } ).setToken( token );

            console.log( 'Started refreshing application (/) commands.' );
            await rest.put( Routes.applicationGuildCommands( clientId, guildId ), { body: commands } );
            console.log( 'Successfully reloaded application (/) commands.' );
            return true;
        } catch ( error ) {
            console.error( 'Failed to register commands:', error );
            return false;
        }
    }

    async interactionCreateListener( interaction: Interaction ): Promise<void> {
        if ( !interaction.isCommand() ) return;

        const command = this.client.commands.get( interaction.commandName );
        if ( !command ) {
            console.log( `Command ${ interaction.commandName } not found.` );
            return;
        }

        try {
            await command.execute( interaction, this.client );
        } catch ( error ) {
            console.error( `Error executing command ${ interaction.commandName }:`, error );
            const content = `Error: ${ error }`;

            if ( !interaction.replied && !interaction.deferred ) {
                await interaction.reply( {
                    content: content,
                    ephemeral: true
                } );
            } else if ( interaction.deferred ) {
                await interaction.followUp( {
                    content: content,
                    ephemeral: true
                } );
            } else {
                await interaction.editReply( {
                    content: content,
                } );
            }
        }
    }
}

export default CommandHandler;