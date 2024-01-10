// import command interface
import Command from '../Interfaces';

const command: Command = {
    data: {
        name: 'example',
        description: 'This is an example command!'
    },
    // @ts-ignore
    async execute(interaction) {
        await interaction.reply('Hello from the example command!');
    },
};

export default command;