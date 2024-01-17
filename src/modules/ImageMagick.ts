import { exec } from 'child_process';
import axios from 'axios';
import fs from 'fs';

interface dimensionLimits {
    input: {
        min: {
            width: number,
            height: number
        },
        max: {
            width: number,
            height: number
        }
    },
    output: {
        min: {
            width: number,
            height: number
        },
        max: {
            width: number,
            height: number
        }
    }
}

interface imageDownloadReturn {
    success: boolean,
    filename: string,
    fileDetails: {
        width: number,
        height: number,
        type: string
        totalSize: number
    }
}

interface imageDetailsReturn {
    width: number,
    height: number,
    type: string
    totalSize: number
}

class ImageMagick {
    private command: string = 'magick';
    private workingDir: string = './imagemagick';
    readonly imageTypes: string[] = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/bmp",
        "image/tiff",
        "image/webp"
    ]

    readonly dimensionLimits: dimensionLimits = {
        input: {
            min: {
                width: 1,
                height: 1
            },
            max: {
                width: 3000,
                height: 3000
            }
        },
        output: {
            min: {
                width: 1,
                height: 1
            },
            max: {
                width: 3000,
                height: 3000
            }
        }
    }

    constructor() {
        if ( !fs.existsSync( this.workingDir ) ) {
            fs.mkdirSync( this.workingDir );
        }
    }

    public async convert( url: string, type: string ): Promise<string> {
        return new Promise( async ( resolve, reject ) => {
            const downloadedImage = await this.downloadImage( url ).catch( ( error ) => {
                reject( error );
                return;
            } ) as imageDownloadReturn;

            if ( !downloadedImage ) {
                reject( 'Invalid downloaded image' );
                return;
            }

            // validate against input dimensions
            if ( !this.validateDimensions( downloadedImage.fileDetails.width, downloadedImage.fileDetails.height, 'input' ) ) {
                reject( 'Invalid dimensions' );
                return;
            }

            // check the wanted type is valid
            if ( !this.validate_type( type ) ) {
                fs.unlinkSync( downloadedImage.filename );
                reject( 'Invalid desired type' );
                return;
            }

            if ( !type.includes( 'image/' ) ) {
                type = `image/${ type }`;
            }

            const filename = downloadedImage.filename;
            const convertedFilename = `${ filename }.${ type.split( '/' )[1] }`;

            exec( `${ this.command } convert ${ filename } ${ convertedFilename }`, ( error ) => {
                if ( error ) {
                    reject( error );
                    return;
                }
                fs.unlinkSync( filename );
                resolve( convertedFilename );
            } );
        } );
    }

    public validate_type( type: string ): boolean {
        if ( !type.includes( 'image/' ) ) {
            type = `image/${ type }`;
        }
        return this.imageTypes.includes( type );
    }

    public validateDimensions( width: number, height: number, IO: 'input' | 'output' ): boolean {
        const limits = this.dimensionLimits[IO];
        return !(width < limits.min.width || width > limits.max.width || height < limits.min.height || height > limits.max.height);
    }

    public async downloadImage( url: string ): Promise<imageDownloadReturn> {
        return new Promise( async ( resolve, reject ) => {
            const response = await axios.get( url, { responseType: 'arraybuffer' } );

            // validate the response
            if ( !response.data ) {
                reject( 'Invalid response' );
                return;
            }

            const buffer: Buffer = Buffer.from( response.data, 'binary' );

            // validate the buffer
            if ( !buffer ) {
                reject( 'Invalid buffer' );
                return;
            }

            const randHex: string = Math.floor( Math.random() * 16777215 ).toString( 16 );
            let filename: string = `${ this.workingDir }/${ randHex }`;

            try {
                fs.writeFileSync( filename, buffer );
            } catch ( error ) {
                reject( error );
                return;
            }

            const type: string = response.headers['content-type'];
            if ( !this.validate_type( type ) ) {
                fs.unlinkSync( filename );
                reject( 'Invalid file type (not an image)' );
                return;
            }

            const extension: string = type.split( '/' )[1];
            fs.renameSync( filename, `${ filename }.${ extension }` );
            filename = `${ filename }.${ extension }`;

            resolve( {
                success: true,
                filename: filename,
                fileDetails: await this.getFileDetails( filename ) as {
                    width: number,
                    height: number,
                    type: string
                    totalSize: number
                }
            } );
        } );
    }

    private async getFileDetails( filename: string ): Promise<imageDetailsReturn> {
        return new Promise( ( resolve, reject ) => {
            // make sure that the folder we're looking into is within our working directory
            if ( !filename.includes( this.workingDir ) ) {
                reject( 'Invalid filename (dir mismatch)' );
                return;
            }
            exec( `${ this.command } identify -format "%wx%h,%m,%b" ${ filename }`, ( error, stdout ) => {
                if ( error ) {
                    reject( error );
                    return;
                }

                const details = stdout.split( ',' );
                const width = parseInt( details[0].split( 'x' )[0] );
                const height = parseInt( details[0].split( 'x' )[1] );
                const type = details[1];
                const totalSize = parseInt( details[2] );

                resolve( {
                    width: width,
                    height: height,
                    type: type,
                    totalSize: totalSize
                } );
            } );
        } );
    }
}

export default ImageMagick;