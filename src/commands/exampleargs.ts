// import command interface
import Command from '../Interfaces';

const command: Command = {
    data: {
        name: 'exampleargs',
        description: 'takes an argument and replies with the argument',
        options: [
            {
                name: 'argument',
                description: 'The argument to reply with',
                type: 3,
                required: true,
            },
        ],
    },

    async execute(interaction) {
        // @ts-ignore
        const argument = interaction.options.getString('argument');
        await interaction.reply(`You said ${argument}!`);
    },
};

export default command;