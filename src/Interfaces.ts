import { CommandInteraction } from 'discord.js';

// Define an interface for the command
interface Command {
    data: {
        name: string;
        description: string;
    };
    execute: (interaction: CommandInteraction) => Promise<void>;
}

// Export the interface
export default Command;