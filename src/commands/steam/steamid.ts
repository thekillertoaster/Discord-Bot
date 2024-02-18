import Command, { BotClient } from '../../Interfaces';
import SteamLinks from "../../modules/SteamLinks";

const command: Command = {
    data: {
        name: 'steamid',
        description: 'gets a steamid64 from steamid, steamid3, steam profile url, custom steam profile url',
        options: [
            {
                name: "steamid",
                description: "The steamid to convert",
                type: 3,
                required: true
            }
        ]
    },

    async execute( interaction, client: BotClient ) {
        return new Promise( async ( resolve, reject ) => {
            try {
                await interaction.deferReply();
                const SLI = new SteamLinks( client );

                // @ts-ignore
                const steamid = interaction.options.getString( "steamid" );
                const result = await SLI.getSteamID64( steamid );

                await interaction.followUp( `SteamID64: ${ result }` );

                resolve();
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    },
}

export default command;