//  #region Requirements & setup
const Discord = require('discord.js');
const config = require('./config.json');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const yts = require('yt-search');

//  Prefix for commands
const prefix = '--';

//  ID of text channel the bot speaks in
const txtChannel = config.txtChannel;

//  Users with admin permission of the bot. Users ID are stored in config.json for not disclosuring permanent ID's
const adminPermission = [config.adm_USER1, config.adm_USER2, config.adm_USER3];

//  Creating a new construct of the client and a map for the songs
const client = new Discord.Client();
const queue = new Map();

// #endregion

// Creating an empty serverqueue
const skippedQueue = {
    songs: [],
};

const searchQueue = {
    title: [],
    url: [],
    songLength: [],
};

client.login(config.token);

// On ready-event
client.on('ready', () => {
    client.user.setActivity('nothing | --play');
});

// On message-event
client.on('message', async message => {

    //  If the author is a bot or no prefix, ignore
    if (message.author.bot || !message.content.startsWith(prefix)) { return; }

    //  Checking if the user writes in the right channel, checks:
    //  correct prefix, correct channel, admin permission
    if (message.content.startsWith(prefix) && message.channel.id != txtChannel && !adminPermission.indexOf(message.author.id) && message.content != '--shaking') {
         return message.reply(`Wrong channel, I only work in <#${txtChannel}>`);
    }

    //  Splice prefix
    const commandBody = message.content.slice(prefix.length);

    //  Splitting message
    const args = commandBody.split(' ');

    //  Setting all characters to lowercase
    const command = args.shift().toLowerCase();

    // Creating a serverqueue
    const serverQueue = queue.get(message.guild.id);

    //  -----------------------------------------------------
    //                  Command lists
    //  -----------------------------------------------------

    switch(command) {
        case ('restart'): {
                if(serverQueue) {
                    serverQueue.songs = [];
                    serverQueue.connection.dispatcher.end();
                }
                await restart();
                return;
                }
        case ('play'): {
            if(ytdl.validateURL(args[0])) {
                const songURL = args[0];
                await addSong(message, songURL, serverQueue);
            }
            else if (!isNaN(args[0]) && searchQueue.url.length > 0) {
                const songNumber = args[0] - 1;

                // Parses the song/playlist -url to a function that handles it
                await addSong(message, searchQueue.url[songNumber], serverQueue)
                .then(searchQueue.url.length = 0);
            }
            else if((args.length > 1 || !['1', '2', '3', '4', '5'].includes(args[0])) && args.length >= 1) {
                const searchTerm = args.join(' ');
                await searchSong(searchTerm);
            }
            break; }
        case 'skip': {
            skip(message, serverQueue, args[0]);
            break; }
        case 'unskip': {
            unskip(serverQueue, args[0]);
            break;}
        case 'stop': {
            stop(message, serverQueue);
            break;}
        case 'list': {
            listSongs(serverQueue);
            break; }
        case 'test': {
            const songURL = args[0];
            await addSong(message, songURL, serverQueue);
            // Add commands here for testing
        break; }
        case 'help': {
            listCommands(message);
            break;
        }
        case 'shaking': {
            easterEgg(message);
            break;}

        default: {
            client.channels.cache.get(txtChannel).send('Command not recognized');
            listCommands();
        break;}
        }
});

// #region re-written function

// Restart Function
async function restart() {

    skippedQueue.songs = [];
    searchQueue.songLength = [];
    searchQueue.title = [];
    searchQueue.url = [];

    const t0 = new Date().getTime();

    client.channels.cache.get(txtChannel).send('Restarting...')
    .then(await client.destroy())
    .then(await client.login(config.token))
    .then((message) =>{
        const t1 = new Date().getTime();
        message.edit(`Restart Complete, it took ${(t1 - t0) / 1000}s.`);
    })
    .catch(err =>{console.log('Restart Failed', err);});

    client.user.setActivity('nothing | --play.');
}

// Comand for listing the commands on the bot
function listCommands() {
    return client.channels.cache.get(txtChannel).send('\
    Valid commands are: \
    \n--play "URL" (Plays the video or playlist link) \
    \n--list  (Lists the current song and up to the next 5 in queue)\
    \n--skip or -- skip "number" (Skips the current song or the "number" of songs) \
    \n--unskip (Adds the last skipped song back to queue)\
    \n--stop (Stops the music)\
    \n--restart (restarts the bot)');
}

// Easter egs goes here
function easterEgg(message) {
    return message.channel.send('https://tenor.com/view/oh-omg-fish-gif-9720855');
}

// Function for listing the next songs in queue
function listSongs(serverQueue) {
    let listSongstxt;

    if(!serverQueue) { listSongstxt = 'No song(s) found in queue'; }
    else {
        listSongstxt = `Current Playing:  **${serverQueue.songs[0].title}**\n`;

        for (let i = 1; i < serverQueue.songs.length && i <= 5; i++) { listSongstxt += `\n${i}:   **${serverQueue.songs[i].title}**.`; }

        listSongstxt += `\nThere are a total of ${serverQueue.songs.length - 1} songs in queue`;
        }
    return client.channels.cache.get(txtChannel).send(`${listSongstxt}.`);
}

// Function for adding previously skipped songs back into queue
function unskip(serverQueue, arg) {
    if(skippedQueue.songs.length == 0) {
        return client.channels.cache.get(txtChannel).send('There doesn\'t seem to be any songs skipped recently');
    }
    else if(typeof arg == 'undefined') {
        let skippedSongs = 'Here are the most recently skipped songs;';
        for (let i = 0; i < skippedQueue.songs.length && i <= 4; i++) {
            skippedSongs += `,\n${i + 1}:   **${skippedQueue.songs[i].title}**`;
        }
        return client.channels.cache.get(txtChannel).send(`${skippedSongs}.\nUse --unskip "1-5" to indicate which song you want to add back to the queue.`);
    }
    else if(arg <= skippedQueue.songs.length) {
            serverQueue.songs.splice(1, 0, skippedQueue.songs[arg - 1 ]);
            return client.channels.cache.get(txtChannel).send(`**${serverQueue.songs[1].title}** was added to the first place in queue`);
        }

}

// Function for skipping songs
function skip(message, serverQueue, skipNR) {

    if(typeof skipNR == 'undefined') {skipNR = 1;}
    else {skipNR = Math.round(skipNR);}

    if (!message.member.voice.channel) { return client.channels.cache.get(txtChannel).send('You have to be in the voice channel to skip the music!');}
    if (!serverQueue) { return client.channels.cache.get(txtChannel).send('There are no songs to skip!');}
    else { client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - skipNR} songs are left in the queue.`); }

    // Adding the current song to the unshift queue
    skippedQueue.songs.unshift(serverQueue.songs[0]);

    // Keep removing from play queue and add to the skipped queue
    for (let i = 1; i < skipNR; i++) {
        serverQueue.songs.shift();
        skippedQueue.songs.unshift(serverQueue.songs[0]);
    }

    // Ensure a maximum skipped length queue of 5
    if(skippedQueue.songs.length > 5) { skippedQueue.songs.length = 5; }

    // Stopping the connection. Since play() is a recursive function more songs will play if there are more in queue
    serverQueue.connection.dispatcher.end();
    client.user.setActivity('nothing.');
}

// Function for searching for songs
async function searchSong(message) {

    const searchResult = (await yts(message)).videos;

    // Clearing the previous search
    searchQueue.title.length = 0;
    searchQueue.url.length = 0;
    searchQueue.songLength.length = 0;

    if(!searchResult.length) {
        return client.channels.cache.get(txtChannel).send('No songs found.');
    }
    else {
        let listResultstxt = 'Use --play 1-5 to select song';
        searchResult.length = 5;
        for(let i = 0; i < searchResult.length; i++) {
            searchQueue.title.push(searchResult[i].title);
            searchQueue.url.push(searchResult[i].url);
            searchQueue.songLength.push(searchResult[i].duration.timestamp);
            listResultstxt += `\n[${i + 1}] ${searchResult[i].title} (${searchResult[i].duration.timestamp})`;
        }

        return client.channels.cache.get(txtChannel).send(listResultstxt);
    }
}
//  Function for checking the existence of playing queue
async function addSong(message, songURL, serverQueue) {

    //  Setting the voicechannel where the bot is called from
    const voiceChannel = message.member.voice.channel;

    //  Checking that the user calling the bot is in a voice channel
    if (!voiceChannel) {return client.channels.cache.get(txtChannel).send('You need to be in a voice channel to play music');}

    // Permission Check
    const permission = voiceChannel.permissionsFor(message.client.user);
    if (!permission.has('CONNECT') || !permission.has('SPEAK')) {return client.channels.cache.get(txtChannel).send('I need permission to both connect AND speak in the channel');}

    //  This check returns a false for songs and a true for playlists
    const plCheck = ytpl.validateID(songURL);

    // If there is NO queue add one
    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        // Setting the queue and re-assigning the variable serverQueue
        queue.set(message.guild.id, queueContruct);
        serverQueue = queue.get(message.guild.id);
        }

    if(!plCheck) {
        try {
            const songInfo = await ytdl.getInfo(songURL);
            const song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
            };
            serverQueue.songs.push(song);

            if(serverQueue.connection) {
                return client.channels.cache.get(txtChannel).send(`${song.title} has been added to the queue!`);
            }
        }
        catch (err) {
            console.log(err);
        }

    }
    else{
        // Playlist information
        const playlistInfo = await ytpl(songURL);

        const listLength = playlistInfo.items.length;
        const prevSongsLength = serverQueue.songs.length;

        // Itterate trough every song
        for (let i = 0; i < listLength; i++) {
            const song = {
                title: playlistInfo.items[i].title,
                url: playlistInfo.items[i].url_simple,
            };
            serverQueue.songs.push(song);
        }
        return client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - prevSongsLength}/${listLength} Songs was successfully added to the queue!`);
    }

    if(!serverQueue.connection) {
        try {
            const connection = await voiceChannel.join();
            serverQueue.connection = connection;
            play(message.guild, serverQueue.songs[0]);
        }
        catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    }
}
// #endregion

//  #region play, pause, skip functions
function play(server, song) {
    const serverQueue = queue.get(server.id);
    if (!song) {
        client.user.setActivity('nothing | --play.');
        // Add check here for last song in queue and leave after 5 minutes?
        serverQueue.voiceChannel.leave();
        queue.delete(server.id);
        return;
    }

    client.user.setActivity(song.title);

    const dispatcher = serverQueue.connection.play(ytdl(song.url, { quality: 'highestaudio', highWaterMark: 1 << 25 })).on('finish', () => {
        serverQueue.songs.shift();
        play(server, serverQueue.songs[0]);

    }).on('error', error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Now playing: **${song.title}**`);
}


function stop(message, serverQueue) {
    if (!message.member.voice.channel) { return client.channels.cache.get(txtChannel).send('You have to be in the voice channel to stop the music!');}
    if (serverQueue) {
        serverQueue.songs = [];
    }
    client.user.setActivity('nothing.');
    serverQueue.connection.dispatcher.end();
}

// #endregion

