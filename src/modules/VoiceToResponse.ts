import { Client, User } from "discord.js";
import { SpeechEvents } from "discord-speech-recognition";
import OpenAI, { ClientOptions } from 'openai';
import { Chat, ChatCompletion, ChatCompletionMessageParam } from "openai/resources";
import ChatCompletionCreateParamsNonStreaming = Chat.ChatCompletionCreateParamsNonStreaming;

interface coolDown {
    userID: string;
    time: number;
    createdAt: number;
}

class VoiceToResponse {
    private client: Client;
    private openAI: OpenAI;
    private readonly defaultPrompts: ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: "You are an ai assistant named 'Toaster', you are a helpful chat assistant who responds and answers questions from the user, depending on the current day of the week you can have slightly different moods, your goal is to be helpful to the user"
        }
    ];
    private readonly defaultOptions: ChatCompletionCreateParamsNonStreaming = {
        model: "gpt-3.5-turbo",
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        messages: this.defaultPrompts,
    };
    private readonly clientOptions: ClientOptions;
    private readonly activationSynonym: string[] = [
        "toaster",
        "toast",
        "poster",
        "coaster",
    ];
    private coolDowns: coolDown[] = [];

    constructor( client: Client, apiKey: { apiKey: string } ) {
        this.client = client;
        this.clientOptions = {
            apiKey: apiKey.apiKey,
        }
        this.openAI = new OpenAI( this.clientOptions );
    }

    async sendPrompt( promptText: string, options?: ChatCompletionCreateParamsNonStreaming ): Promise<string | undefined> {
        const prompts: ChatCompletionMessageParam[] = [
            ...this.defaultPrompts,
            {
                role: 'user',
                content: promptText,
            },
        ];

        const finalOptions: ChatCompletionCreateParamsNonStreaming = {
            ...this.defaultOptions,
            ...options,
            messages: prompts,
        }

        try {
            let response: ChatCompletion = await this.openAI.chat.completions.create( finalOptions );
            const content_exists = !!response.choices[0].message.content;
            if ( !content_exists ) {
                console.log( 'No content in response' );
                return undefined;
            }
            return response.choices[0].message.content?.trim().replace( /\n/g, " " );
        } catch ( error ) {
            console.error( 'Error in sending prompt:', error );
            throw error;
        }
    }

    registerVoiceEvents(): void {
        this.client.on( SpeechEvents.speech, async ( msg ) => {
            if ( !msg.content ) return;
            if ( msg.content.split( " " ).length < 5 ) return;

            const messageAuthor: User | null = msg.author;
            if ( !messageAuthor ) return;
            const authorId: string = messageAuthor.id;

            // check if user is on coolDown
            const cooldown: coolDown | undefined = this.coolDowns.find( ( cooldown: coolDown ) => cooldown.userID === authorId );
            if ( cooldown ) {
                const timeLeft: number = cooldown.time - (Date.now() - cooldown.createdAt);
                // print some info about the coolDown
                console.log( `User ${ authorId } is on cooldown for ${ timeLeft }ms` );
                if ( timeLeft > 0 ) return;
            }

            // remove coolDowns that have expired
            this.coolDowns = this.coolDowns.filter( ( cooldown: coolDown ) => cooldown.time - (Date.now() - cooldown.createdAt) > 0 );

            const lowerCaseContent: string = msg.content.toLowerCase();
            const words: string[] = lowerCaseContent.split( " " ).slice( 0, 5 );
            const activationSynonym: string | undefined = words.find( word => this.activationSynonym.includes( word ) );

            if ( activationSynonym ) {
                const response: string | undefined = await this.sendPrompt( msg.content )
                if ( response ) {
                    await msg.author.send( response );
                } else {
                    await msg.author.send( "No response from api" );
                }

                // set coolDown
                this.coolDowns.push( {
                    userID: authorId,
                    time: 10000,  // 10 seconds
                    createdAt: Date.now(),
                } );
            }
        } );
    }
}

export default VoiceToResponse;