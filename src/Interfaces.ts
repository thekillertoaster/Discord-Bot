import { Client, CommandInteraction } from 'discord.js';
import { VoiceConnection } from "@discordjs/voice";

interface BotClient extends Client {
    commands: Map<string, Command>;
    voiceConnection: Map<string, VoiceConnection>;
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