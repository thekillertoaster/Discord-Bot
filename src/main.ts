// Third-party module imports
import { config } from 'dotenv';
import { addSpeechEvent } from "discord-speech-recognition";
import { DataSource } from "typeorm";
import SteamAPI from "steamapi";

// Polyfills and global modifications
import "reflect-metadata"; // This modifies global scope, keep it separate for clarity

// Local module imports
import BotClient from "./modules/BotClient";
import EntityHandler from "./modules/EntityHandler";
import VoiceToResponse from "./modules/VoiceToResponse";

config();

// Environment Variables
const token = process.env.TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;
const openAIKey = process.env.OPENAI_API_KEY!;

const appDBHost = process.env.DB_HOST!;
const appDBUser = process.env.DB_USER!;
const appDBPassword = process.env.DB_PASSWORD!;
const appDBName = process.env.DB_NAME!;

const steamAPIKey = process.env.STEAM_API_KEY!;

const EntityHandlerInstance = new EntityHandler("./entity");

async function configureDB(): Promise<DataSource> {
    return new Promise( async ( resolve, reject ) => {
        const Entities: any[] = await EntityHandlerInstance.getEntities();
        const AppDataSource = new DataSource( {
            type: "mysql",
            host: appDBHost,
            username: appDBUser,
            password: appDBPassword,
            database: appDBName,
            entities: Entities,
            synchronize: true,
            logging: true,
            entityPrefix: "app_",
        } );
        await AppDataSource.initialize().catch( ( err ) => {
            reject( err );
            return;
        } );
        resolve( AppDataSource );
    } );
}


async function main() {
    const AppDataSource = await configureDB().catch( ( err ) => {
        console.error( err );
        process.exit( 1 );
    } );

    const steam = new SteamAPI( steamAPIKey );

    const client = new BotClient( AppDataSource, steam );
    addSpeechEvent( client );

    await client.start( token, clientId, guildId )

    // Voice To Response Module
    const VoiceToResponseInstance = new VoiceToResponse( client, {
        apiKey: openAIKey,
    } );
    VoiceToResponseInstance.registerVoiceEvents();
}

main().catch( console.error );
