import { config } from 'dotenv';
import VoiceToResponse from "./modules/VoiceToResponse";
import { addSpeechEvent } from "discord-speech-recognition";
import BotClient from "./modules/BotClient";

config();

const client = new BotClient();
addSpeechEvent( client );

const token = process.env.TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;
const openAIKey = process.env.OPENAI_API_KEY!;

async function main() {
    await client.start( token, clientId, guildId )
}

main().catch( console.error );

// voice to response module
const VoiceToResponseInstance = new VoiceToResponse( client, {
    apiKey: openAIKey,
} );
VoiceToResponseInstance.registerVoiceEvents();