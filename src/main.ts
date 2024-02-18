import { config } from 'dotenv';
import VoiceToResponse from "./modules/VoiceToResponse";
import { addSpeechEvent } from "discord-speech-recognition";
import BotClient from "./modules/BotClient";
import "reflect-metadata";
import { DataSource } from "typeorm";
import SteamAPI from "steamapi";

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

// Entities
import { SupportTicket } from "./entity/SupportTicket";
import { StaffReport } from "./entity/StaffReport";
import { Appeal } from "./entity/Appeal";
import { RolePermission } from "./entity/RolePermission";
import { CommandPermission } from "./entity/CommandPermission";
import { AwaitingLink } from "./entity/steam/AwaitingLink";
import { Links } from "./entity/steam/Links";

async function configureDB(): Promise<DataSource> {
    return new Promise( async ( resolve, reject ) => {
        const AppDataSource = new DataSource( {
            type: "mysql",
            host: appDBHost,
            username: appDBUser,
            password: appDBPassword,
            database: appDBName,
            entities: [
                SupportTicket,
                StaffReport,
                Appeal,
                RolePermission,
                CommandPermission,
                AwaitingLink,
                Links
            ],
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
