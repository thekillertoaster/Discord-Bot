import { BotClient } from "../Interfaces";
import fs from "fs";
import path from "node:path";
import { Interaction, REST, Routes } from "discord.js";

class CommandHandler {
    client: BotClient;

    constructor( client: BotClient ) {
        this.client = client
    }

    private async getCommandFiles( dir: string ): Promise<string[]> {
        const files = await fs.promises.readdir( dir );
        let commandFiles: string[] = [];
        for ( const file of files ) {
            const filePath = path.join( dir, file );
            const stats = await fs.promises.stat( filePath );
            if ( stats.isDirectory() ) {
                commandFiles = commandFiles.concat( await this.getCommandFiles( filePath ) );
            } else if ( stats.isFile() && file.endsWith( '.js' ) ) {
                commandFiles.push( filePath );
            }
        }
        return commandFiles;
    }

    async registerCommands( token: string, clientId: string, guildId: string ): Promise<void> {
        const commandFiles = await this.getCommandFiles( './commands' );

        for ( const file of commandFiles ) {
            console.log( 'Loading command', file );
            const { default: command } = await import(path.resolve( file ));
            this.client.commands.set( command.data.name, command );
        }

        const commands = Array.from( this.client.commands.values() ).map( cmd => cmd.data );
        const rest = new REST( { version: '10' } ).setToken( token );

        try {
            console.log( 'Started refreshing application (/) commands.' );
            await rest.put( Routes.applicationGuildCommands( clientId, guildId ), { body: commands } );
            console.log( 'Successfully reloaded application (/) commands.' );
        } catch ( error ) {
            console.error( error );
        }
    }

    async interactionCreateListener( interaction: Interaction ) {
        if ( !interaction.isCommand() ) return;

        const command = this.client.commands.get( interaction.commandName );
        if ( command ) {
            try {
                await command.execute( interaction, this.client );
            } catch ( error ) {
                console.error( error );
                if ( !interaction.replied ) {
                    await interaction.reply( {
                        content: 'There was an error executing that command!',
                        ephemeral: true
                    } );
                }
            }
        }
    }
}

export default CommandHandler;