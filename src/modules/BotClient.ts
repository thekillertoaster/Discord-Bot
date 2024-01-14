import { Client, GatewayIntentBits } from "discord.js";
import { VoiceConnection } from "@discordjs/voice";
import CommandHandler from "./CommandHandler";

class BotClient extends Client {
    commands = new Map<string, any>();
    voiceConnection = new Map<string, VoiceConnection>();
    commandHandler: CommandHandler;

    constructor() {
        super( {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        } );
        this.commandHandler = new CommandHandler( this ); // Initialize CommandHandler
    }

    async start( token: string, clientId: string, guildId: string ): Promise<void> {
        this.on( 'ready', () => console.log( 'Bot is ready!' ) );
        this.on( 'interactionCreate', ( interaction ) => this.commandHandler.interactionCreateListener( interaction ) );
        await this.login( token );
        const commandStatus = await this.commandHandler.registerCommands( token, clientId, guildId )
        console.log( commandStatus ? "Successfully registered commands" : "Failed to register commands" )
    }
}

export default BotClient;