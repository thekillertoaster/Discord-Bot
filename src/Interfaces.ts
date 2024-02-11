import { Client, CommandInteraction } from 'discord.js';
import { VoiceConnection } from "@discordjs/voice";
import CommandHandler from "./modules/CommandHandler";
import { DataSource } from "typeorm";
import SteamAPI from "steamapi";

interface BotClient extends Client {
    commands: Map<string, Command>;
    voiceConnection: Map<string, VoiceConnection>;
    commandHandler: CommandHandler;
    appDataSource: DataSource;
    steamAPI: SteamAPI;
}

interface Command {
    data: {
        name: string;
        description: string;
        options?: {
            name: string;
            description: string;
            type: number;
            required?: boolean;
        }[];
    };
    execute: ( interaction: CommandInteraction, client: BotClient ) => Promise<void>;
}

export default Command;
export type { BotClient };