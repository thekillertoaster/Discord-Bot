import { promises as fsPromises } from "fs";
import { resolve, join } from "path";

class EntityHandler {
    entityDir: string;
    entities: any[] = [];

    constructor( entityDir: string ) {
        this.entityDir = entityDir;
    }

    private async getEntityFiles( dir: string ): Promise<string[]> {
        try {
            const files = await fsPromises.readdir( dir );
            const filePromises = files.map( async ( file ) => {
                const filePath = join( dir, file );
                const stats = await fsPromises.stat( filePath );

                if ( stats.isDirectory() ) {
                    return this.getEntityFiles( filePath ); // Recursively scan directories
                } else if ( stats.isFile() && file.endsWith( '.js' ) ) {
                    return filePath; // Return file path if it's a JavaScript file
                }
            } );

            const fileList = await Promise.all( filePromises );
            return fileList.flat().filter( ( path ): path is string => !!path ); // Flatten and filter out undefined values
        } catch ( error ) {
            console.error( 'Error reading entity files:', error );
            return [];
        }
    }

    public async getEntities(): Promise<any[]> {
        try {
            const entityFiles = await this.getEntityFiles( this.entityDir );

            const entityPromises = entityFiles.map( async ( file ) => {
                console.log( 'Loading entity', file );
                const { default: entity } = await import(resolve( file ));
                return entity;
            } );

            const entities = await Promise.all( entityPromises );
            this.entities = entities;
            return entities;
        } catch ( error ) {
            console.error( 'Error loading entities:', error );
            return [];
        }
    }
}

export default EntityHandler;