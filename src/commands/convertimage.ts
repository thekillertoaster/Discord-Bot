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

    async execute( interaction ): Promise<void> {
        return new Promise( async ( resolve, reject ) => {
            try {
                await interaction.deferReply( { ephemeral: false })
                const imageMagick = new ImageMagick();

                // @ts-ignore
                const image = interaction.options.getAttachment( 'image' );

                // @ts-ignore
                const type: string = interaction.options.getString( 'type' );

                const convertedImagePath = await imageMagick.convert( image.url, type );

                if ( !convertedImagePath ) {
                    reject("error");
                    return;
                }

                console.log("attempting to reply")

                // generate a new discord reply with the converted image
                try {
                    if ( !interaction.replied && !interaction.deferred ) {
                        await interaction.reply( {
                            files: [ convertedImagePath ],
                        } );
                    } else if ( interaction.deferred ) {
                        await interaction.followUp( {
                            files: [ convertedImagePath ],
                        } );
                    } else {
                        await interaction.editReply( {
                            files: [ convertedImagePath ],
                        } );
                    }
                } catch ( error ) {
                    reject( error );
                    return;
                }

                // delete the converted image from the filesystem post-reply
                fs.unlinkSync( convertedImagePath )
                resolve();
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    },
};

export default command;