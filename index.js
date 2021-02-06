//  #region Requirements & Setup
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const yts = require('yt-search');

const {
    token,
    prefix,
} = require('./config.json');

//  Creating a new construct of the client and a map for the songs
const client = new Discord.Client();
const queue = new Map();
const defaultActivityString = 'nothing | --play.';

// #endregion

// Logging in with the token set in config.json
client.login(token);

// On ready-event
client.on('ready', () => {
    client.user.setActivity(defaultActivityString);
});

// On message-event
client.on('message', async message => {

    // If the author is a bot or no prefix, ignore
    if (message.author.bot || !message.content.startsWith(prefix)) { return; }

    // Splice prefix
    let commandBody = message.content.slice(prefix.length);

    // Removing double spaces
    commandBody = commandBody.replace(/\s\s+/g, ' ');

    // Splitting message
    const args = commandBody.split(' ');

    // Setting all characters to lowercase
    const command = args.shift().toLowerCase();

    // Reading where the message came from and assigning it to a variable
    const txtChannel = message.channel.id;


    //  -----------------------------------------------------
    //                  Command lists
    //  -----------------------------------------------------
    switch (command) {

        case ('play'): {

            // Check if valid youtube-URL (songs, playlists and livestreams returns true)
            if (ytdl.validateURL(args[0])) {
                try {
                    await playContent(message, args[0]);
                }
                catch (err) {
                    if(err.message == 'BlockedContent') { client.channels.cache.get(txtChannel).send('There was an error with the playlist or songs in the playlist.');}
                    if(err.message == 'FailedPlaySong') { client.channels.cache.get(txtChannel).send('Song failed to play, aborting...');}
                    console.error(err);
                }

            }
            else if (queue.get(message.guild.id) && !isNaN(args[0])) {

                // Getting the current serverqueue
                const serverQueue = queue.get(message.guild.id);

                const songNumber = args[0] - 1;

                // Parses the song/playlist -url to a function that handles it and then removed all urls from search queue.
                try{
                await playContent(message, serverQueue.searchQueue.url[songNumber])
                    .then(serverQueue.searchQueue.url.length = 0);
                }
                catch(err) {
                    if(err.message == 'FailedPlaySong') { client.channels.cache.get(txtChannel).send('Song failed to play, aborting...');}
                    console.error(err);
                }
            }
            // If ( number of arguments greater than 1 or doesn't start with 1-5) AND there is more than 1 argument.
            else if ((args.length > 1 || !['1', '2', '3', '4', '5'].includes(args[0])) && args.length >= 1) {
                const searchTerm = args.join(' ');
                await searchSong(searchTerm, message, txtChannel);
            }

            break;
        }

        case 'skip': {
            skip(message, args[0]);
            break;
        }

        case 'unskip': {
            unskip(message, args[0], txtChannel);
            break;
        }

        case 'stop': {
            stop(message);
            break;
        }

        case 'queue': case 'list': {
            listSongs(message, txtChannel, txtChannel);
            break;
        }

        case 'shaking': {
            easterEgg(txtChannel);
            break;
        }

        default: {
            client.channels.cache.get(txtChannel).send('Command not recognized');
            listCommands(txtChannel);
            break;
        }
    }
});

async function playContent(message, songURL) {

    //  Setting the voicechannel where the bot is called from
    const voiceChannel = message.member.voice.channel;

    // Setting the textchannel the bot was called from
    const txtChannel = message.channel.id;

    //  Checking that the user calling the bot is in a voice channel
    if (!voiceChannel) { return client.channels.cache.get(txtChannel).send('You need to be in a voice channel to play music'); }

    // Permission Check
    const permission = voiceChannel.permissionsFor(message.client.user);
    if (!permission.has('CONNECT') || !permission.has('SPEAK')) { return client.channels.cache.get(txtChannel).send('I need permission to both connect AND speak in the channel'); }

    //  This check returns a false for songs and a true for playlists
    const plCheck = ytpl.validateID(songURL);

    // If there is not a serverqueue
    if (!queue.get(message.guild.id)) {
       createQueue(message, voiceChannel);
    }

    // Getting the current serverqueue
    const serverQueue = queue.get(message.guild.id);

    // If song, else a playlist
    if (!plCheck) {
        let songInfo;
        try {
            songInfo = await ytdl.getInfo(songURL);
        }
        catch (err) {
            // Throw the error message, which is handled in the above-level
            console.log('Internal: the songinfo was not found.');
            throw new customError('FailedPlaySong');
        }

        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url };
        serverQueue.songs.push(song);

        if (serverQueue.connection) { return client.channels.cache.get(txtChannel).send(`${song.title} has been added to the queue!`); }
    }
    else {

        let playlistInfo;
        try {
            playlistInfo = await ytpl(songURL);
        }
        catch (err) {
            console.log('Internal: The playlist didn\'t work.');
            throw new customError('BlockedContent');
        }

        const listLength = playlistInfo.items.length;
        const prevSongsLength = serverQueue.songs.length;

        // Iterate trough every song
        for (let i = 0; i < listLength; i++) {
            const song = {
                title: playlistInfo.items[i].title,
                url: playlistInfo.items[i].shortUrl,
            };
            serverQueue.songs.push(song);
        }
        client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - prevSongsLength}/${listLength} Songs was successfully added to the queue!`);
    }

    if (!serverQueue.connection) {
        try {
            const connection = await voiceChannel.join();
            serverQueue.connection = connection;
            play(message.guild, serverQueue.songs[0]);
        }
    catch (err) {
            console.error(err);
            queue.delete(message.guild.id);
            throw new customError(err);
        }
    }
}

// Function for searching for songs
async function searchSong(searchMSG, message, txtChannel) {

    const searchResult = (await yts(searchMSG)).videos;

    //  Setting the voicechannel where the bot is called from
    const voiceChannel = message.member.voice.channel;

    //  Checking that the user calling the bot is in a voice channel
    if (!voiceChannel) { return client.channels.cache.get(txtChannel).send('You need to be in a voice channel to play music'); }

    // If there is not a serverqueue
    if (!queue.get(message.guild.id)) { createQueue(message, voiceChannel); }

    // Getting the current serverqueue
    const serverQueue = queue.get(message.guild.id);

    // Clearing the previous search
    serverQueue.searchQueue.title.length = 0;
    serverQueue.searchQueue.url.length = 0;
    serverQueue.searchQueue.songLength.length = 0;

    if (!searchResult.length) {
        return client.channels.cache.get(txtChannel).send('No songs found.');
    }

    let listResultstxt = 'Use --play 1-5 to select song';
    searchResult.length = 5;
    for (let i = 0; i < searchResult.length; i++) {
        serverQueue.searchQueue.title.push(searchResult[i].title);
        serverQueue.searchQueue.url.push(searchResult[i].url);
        serverQueue.searchQueue.songLength.push(searchResult[i].duration.timestamp);
        listResultstxt += `\n[${i + 1}] ${searchResult[i].title} (${searchResult[i].duration.timestamp})`;
    }

    return client.channels.cache.get(txtChannel).send(listResultstxt);
}


// Commands for listing the commands on the bot
function listCommands(txtChannel) {
    return client.channels.cache.get(txtChannel).send('\
    Valid commands are: \
    \n--play "URL or Search Term" (Use a direct youtube url or search trough the bot) \
    \n--list or --queue (Lists the current song and up to the next 5 in queue)\
    \n--skip or --skip "number" (Skips the current song or the "number" of songs) \
    \n--unskip or --unskip "numbers" (Skips 1 or the requested amount of songs)\
    \n--stop (Stops the bot)');
}

// Play function
async function play(guild, song) {

    const serverQueue = queue.get(guild.id);

    if (!song) {
        client.user.setActivity(defaultActivityString);
        // Add check here for last song in queue and leave after 5 minutes?
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    client.user.setActivity(song.title);

    const dispatcher = serverQueue.connection.play(ytdl(song.url, { quality: 'highestaudio', highWaterMark: 1 << 25 })).on('finish', () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
    }).on('error', (error) => {
        console.error(error);
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
        // throw new Error(error);
        });

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Now playing: **${song.title}**`);
}

// Function for skipping songs
function skip(message, skipNR) {

    const serverQueue = queue.get(message.guild.id);
    if(!serverQueue) { return; }

    // Setting the textchannel the bot was called from
    const txtChannel = message.channel.id;

    if (typeof skipNR === 'undefined') { skipNR = 1; }
    else { skipNR = Math.round(skipNR); }

    if (!message.member.voice.channel) { return client.channels.cache.get(txtChannel).send('You have to be in the voice channel to skip the music!'); }
    if (!serverQueue) { return client.channels.cache.get(txtChannel).send('There are no songs to skip!'); }
    client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - skipNR} songs are left in the queue.`);

    // Adding the current song to the unshift queue
    serverQueue.skippedQueue.songs.unshift(serverQueue.songs[0]);

    // Keep removing from play queue and add to the skipped queue
    for (let i = 1; i < skipNR; i++) {
        serverQueue.songs.shift();
        serverQueue.skippedQueue.songs.unshift(serverQueue.songs[0]);
    }

    // Ensure a maximum skipped length queue of 5
    if (serverQueue.skippedQueue.songs.length > 5) { serverQueue.skippedQueue.songs.length = 5; }

    // Ending the connection
    serverQueue.connection.dispatcher.end();
    client.user.setActivity('nothing | --play');
}

// Stop function
function stop(message) {
    // Setting the textchannel the bot was called from
    const txtChannel = message.channel.id;

    if (!message.member.voice.channel) { return client.channels.cache.get(txtChannel).send('You have to be in the voice channel to stop the music!'); }

    const serverQueue = queue.get(message.guild.id);
    if(!serverQueue) { return; }

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();

    client.user.setActivity('nothing | --play');
}

// Function for returning error with custom message property
function customError(msg) {
    return new Error(msg);
  }

// Easter eggs goes here
function easterEgg(txtChannel) {
    client.channels.cache.get(txtChannel).send('You need to be in a voice channel to play music');
}

// Function for listing the next songs in queue
function listSongs(message, txtChannel) {

    // Getting the current serverqueue
    const serverQueue = queue.get(message.guild.id);

    if(!serverQueue) {return;}

    let listSongstxt = `Current Playing:  **${serverQueue.songs[0].title}**\n`;

    for (let i = 1; i < serverQueue.songs.length && i <= 5; i++) { listSongstxt += `\n${i}:   **${serverQueue.songs[i].title}**.`; }

    listSongstxt += `\nThere are a total of ${serverQueue.songs.length - 1} songs in queue`;
    return client.channels.cache.get(txtChannel).send(`${listSongstxt}.`);
}

// Function for un-skipping songs
function unskip(message, arg, txtChannel) {

    const serverQueue = queue.get(message.guild.id);
    if(!serverQueue) { return; }

    if (serverQueue.skippedQueue.songs.length == 0) {
        return client.channels.cache.get(txtChannel).send('There doesn\'t seem to be any songs skipped in memory');
    }
    if (typeof arg === 'undefined') {
        let skippedSongs = 'Here are the most recently skipped songs;';
        for (let i = 0; i < serverQueue.skippedQueue.songs.length && i <= 4; i++) {
            skippedSongs += `,\n${i + 1}:   **${serverQueue.skippedQueue.songs[i].title}**`;
        }
        return client.channels.cache.get(txtChannel).send(`${skippedSongs}.\nUse --unskip "1-5" to indicate which song you want to add back to the queue.`);
    }
    if (arg <= serverQueue.skippedQueue.songs.length) {
        serverQueue.songs.splice(1, 0, serverQueue.skippedQueue.songs[arg - 1]);
        return client.channels.cache.get(txtChannel).send(`**${serverQueue.songs[1].title}** was added to the first place in queue`);
    }
}

// Function for creating queue
function createQueue(message, voiceChannel) {

    // Create a struct for the searchQueue
    const searchQueue = {
        title: [],
        url: [],
        songLength: [],
    };

    // Create a struct for the skippedQueue
    const skippedQueue = {
        songs: [],
    };

    // Creating the queue body
    const queueContruct = {
        searchQueue: searchQueue,
        textChannel: message.channel,
        skippedQueue: skippedQueue,

        // Setting current voice channel to null
        voiceChannel: voiceChannel,
        // Setting current connection to null
        connection: null,
        songs: [],
        volume: 5,
        playing: true,
        };
    return queue.set(message.guild.id, queueContruct);
}
