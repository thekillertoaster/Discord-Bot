import {
    GuildMember,
} from "discord.js";
import { BotClient } from "../Interfaces";

// entities
import { AwaitingLink } from "../entity/steam/AwaitingLink";
import { Links } from "../entity/steam/Links";
import { PlayerSummary } from "steamapi";

interface createLinkRequestResponse {
    linkID: number;
    linkCode: string;
    existing: boolean;
}

class SteamLinks {
    private client: BotClient;

    constructor( client: BotClient ) {
        this.client = client;
    }

    /**
     * Generates a unique code
     * @param length
     * @returns unique code
     */
    public generateUniqueCode( length: number ): string {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for ( let i = 0; i < length; i++ ) {
            result += characters.charAt( Math.floor( Math.random() * charactersLength ) );
        }
        return result;
    }

    /**
     * Gets a users steamid64 from:
     * - Full Steam Profile URL
     * - Custom Steam Profile URL
     * - SteamID
     * - SteamID3
     *
     * @param inputString
     * @returns steamID64
     */
    public getSteamID64( inputString: string ): Promise<string> {
        return new Promise( async ( resolve, reject ) => {
            const truth_table = [
                inputString.includes( "steamcommunity.com/profiles/" ),  // Full Steam Profile URL
                inputString.includes( "steamcommunity.com/id/" ),  // Custom Steam Profile URL
                inputString.match( /^STEAM_0:\d:\d{1,10}$/ ) != null,  // SteamID
                inputString.match( /^\[U:\d:\d{1,10}\]$/ ) != null // SteamID3
            ];

            console.log( truth_table );

            // validate that at least one of the truth table values is true
            if ( !truth_table.includes( true ) ) {
                reject( "Invalid input" );
                return;
            }

            const resolvedID = await this.client.steamAPI.resolve( inputString ).catch( ( error ) => {
                reject( error );
                return;
            } ) as string;

            resolve( resolvedID );
        } );
    }

    /**
     * Creates a link request
     * @param member
     * @param steamID
     * @returns linkID, linkCode, existing
     */
    public async createLinkRequest( member: GuildMember, steamID: string ): Promise<createLinkRequestResponse> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const existingLink = await this.client.appDataSource.manager.findOne( Links, {
                    where: {
                        userID: member.id
                    }
                } ) as Links;

                if ( existingLink ) {
                    reject( "user already has a link" );
                    return;
                }

                // check if the user already has a link request
                const existingLinkReq = await this.client.appDataSource.manager.findOne( AwaitingLink, {
                    where: {
                        userID: member.id
                    }
                } ) as AwaitingLink;

                if ( existingLinkReq ) {
                    resolve( {
                        linkID: existingLinkReq.id,
                        linkCode: existingLinkReq.linkCode,
                        existing: true
                    } );
                    return;
                }

                const link = new AwaitingLink();
                link.userID = member.id;
                link.steamID = steamID;
                link.linkCode = this.generateUniqueCode( 6 );

                await this.client.appDataSource.manager.save( link ).catch( ( error ) => {
                    reject( error );
                    return;
                } );

                resolve( {
                    linkID: link.id,
                    linkCode: link.linkCode,
                    existing: false
                } );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    /**
     * Removes a link request
     * @param member
     * @returns boolean
     */
    public async removeLinkRequest( member: GuildMember ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const link = await this.client.appDataSource.manager.findOne( AwaitingLink, {
                    where: {
                        userID: member.id
                    }
                } ) as AwaitingLink;

                if ( !link ) {
                    reject( "no link found" );
                    return;
                }

                await this.client.appDataSource.manager.remove( link ).catch( ( error ) => {
                    reject( error );
                    return;
                } );

                resolve( true );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    /**
     * Validates a link request
     * @param member
     * @param linkCode
     * @returns boolean
     */
    public async validateLinkRequest( member: GuildMember, linkCode: string ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const link = await this.client.appDataSource.manager.findOne( AwaitingLink, {
                    where: {
                        userID: member.id
                    }
                } ) as AwaitingLink;

                if ( !link ) {
                    reject( "no link found" );
                    return;
                }

                // check if the user has the link code in their profile realname
                const steamProfile = await this.client.steamAPI.getUserSummary( link.steamID ).catch( ( error ) => {
                    reject( error );
                    return;
                } ) as PlayerSummary;

                console.log( steamProfile );

                if ( !steamProfile ) {
                    reject( "cannot find user profile" );
                    return;
                }

                // if we didnt get a single result but a multi result, reject
                if ( Array.isArray( steamProfile ) ) {
                    reject( "multiple results" );
                    return;
                }

                if ( !steamProfile.realName ) {
                    reject( "no realname set" );
                    return;
                }

                if ( steamProfile.realName.includes( linkCode ) ) {
                    resolve( true );
                    return;
                } else {
                    resolve( false );
                    return;
                }
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }

    /**
     * Creates a link
     * @param member
     * @returns boolean
     */
    public async createLink( member: GuildMember ): Promise<boolean> {
        return new Promise( async ( resolve, reject ) => {
            try {
                const existingLink = await this.client.appDataSource.manager.findOne( Links, {
                    where: {
                        userID: member.id
                    }
                } ) as Links;

                if ( existingLink ) {
                    reject( "user already has a link" );
                    return;
                }

                const link = await this.client.appDataSource.manager.findOne( AwaitingLink, {
                    where: {
                        userID: member.id
                    }
                } ) as AwaitingLink;

                if ( !link ) {
                    reject( "user has no pending link request" );
                    return;
                }

                // validate the link request
                // get the unique text from the awaiting link
                const linkCode = link.linkCode;
                const isValid = await this.validateLinkRequest( member, linkCode ).catch( ( error ) => {
                    reject( error );
                    return;
                } ) as boolean;

                if ( !isValid ) {
                    reject( "link validation failed" );
                    return;
                }

                const newLink = new Links();
                newLink.userID = member.id;
                newLink.steamID = link.steamID;

                await this.client.appDataSource.manager.save( newLink ).catch( ( error ) => {
                    reject( error );
                    return;
                } );

                await this.removeLinkRequest( member ).catch( ( error ) => {
                    reject( error );
                    return;
                } );

                resolve( true );
                return;
            } catch ( error ) {
                reject( error );
                return;
            }
        } );
    }
}

export default SteamLinks;