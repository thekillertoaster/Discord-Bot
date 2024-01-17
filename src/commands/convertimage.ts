import Command from '../Interfaces';
import ImageMagick from '../modules/ImageMagick';
import fs from "fs";

const command: Command = {
    data: {
        name: 'convertimage',
        description: 'converts an image to the wanted type',
        options: [
            {
                name: 'image',
                description: 'The image to resize (jpeg, png, gif, bmp, tiff, webp)',
                type: 11,
                required: true,
            },
            {
                name: 'type',
                description: 'jpeg, png, gif, bmp, tiff, webp',
                type: 3,
                required: true,
            },
        ],
    },

    async execute( interaction ) {
        const imageMagick = new ImageMagick();

        // @ts-ignore
        const image = interaction.options.getAttachment( 'image' );

        // @ts-ignore
        const type: string = interaction.options.getString( 'type' );

        const convertedImagePath = await imageMagick.convert( image.url, type ).catch( async ( error ) => {
            await interaction.reply( {
                content: `Error: ${ error || "unknown error" }`,
                ephemeral: true
            } );
            return;
        } ) as string;

        if ( !convertedImagePath ) return;

        // generate a new discord reply with the converted image
        await interaction.reply( {
            files: [ convertedImagePath ],
        } );

        // delete the converted image from the filesystem post-reply
        fs.unlinkSync( convertedImagePath )
    },
};

export default command;