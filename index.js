//  #region Requirements & setup
const Discord = require('discord.js');
const config = require('./config.json');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');

const prefix = '--';
//  ID of text channel the bot speaks in
const txtChannel = '340879469722206208';

//  Creating a new construct of the client and a map for the songs
const client = new Discord.Client();
const queue = new Map();

// #endregion

client.login(config.token);

//  Continously reading the messages in chat
client.on('message', async message => {
    //  If the author is a bot
    if (message.author.bot) { return; }

    //  If no prefix, ignore message
    if (!message.content.startsWith(prefix)) { return; }
    //  Checking if the user writes in the right channel
    if (message.content.startsWith(prefix) && message.channel.id != txtChannel && message.content != '--shaking') { return message.reply(`Wrong channel, I only work in <#${txtChannel}>`); }

    //  Splice prefix
    const commandBody = message.content.slice(prefix.length);

    //  Splitting message
    const args = commandBody.split(' ');

    //  Setting all characters to lowercase
    const command = args.shift().toLowerCase();

    //  Adding support for queuing of messages
    const serverQueue = queue.get(message.guild.id);

    //  -----------------------------------------------------
    //                  Command lists
    //  -----------------------------------------------------

    switch(command) {
        case ('play' || 'spill'): {
        const songURL = args[0];
        //  This check returns a false for songs and a true for playlists
        const plCheck = ytpl.validateID(songURL);

        // Parses the song/playlist -url to a function that handles it
        addSong(message, songURL, serverQueue, plCheck);

        // Add check to check queue limit
        break; }

    case 'skip': {
        if (typeof args[0] === 'undefined') { skip(message, serverQueue, 1); }
        else { skip(message, serverQueue, Math.round(args[0]));}
        if(serverQueue) { client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - 1} songs are left in the queue.`);}
        break; }

    case 'stop': { stop(message, serverQueue); break;}
    case 'list': { listSongs(serverQueue); break; }
    case ('bug' || 'bugs'): {client.channels.cache.get(txtChannel).send('Report bugs here: (REF)'); break; }
    case 'test': { console.log(prefix); break; }
    case ('help' || 'commands') : {client.channels.cache.get(txtChannel).send('\
    Valid commands are: \
    \n--play "URL" (Plays the video or playlist link) \
    \n--list  (Lists the current song and up to the next 5 in queue)\
    \n--skip or -- skip "number" (Skips the current song, alternatively say how many you want to skip) \
    \n--stop (Stop the bot)'); break; }

    case 'shaking': {message.channel.send('https://tenor.com/view/oh-omg-fish-gif-9720855'); break;}
    default: { client.channels.cache.get(txtChannel).send('Command not recognized. Valid commands are: \
    \n--play "URL" \
    \n--skip or -- skip "number" \
    \n--stop \
    \nBug can be registered here: (REF)'); break; }
    }
});


function listSongs(serverQueue) {

    let listSongstxt = `Current Playing:  **${serverQueue.songs[0].title}**`;

    for (let i = 1; i < serverQueue.songs.length && i <= 5; i++) { listSongstxt += `,\n${i}:    **${serverQueue.songs[i].title}**`; }
    return client.channels.cache.get(txtChannel).send(`${listSongstxt}.`);
}

//  Function for checking the existence of playing queue
async function addSong(message, songURL, serverQueue, plCheck) {

    //  Setting the voicechannel where the bot is called from
    const voiceChannel = message.member.voice.channel;

    //  Checking that the user calling the bot is in a voice channel
    if (!voiceChannel) {
        return client.channels.cache.get(txtChannel).send('You need to be in a voice channel to play music');
    }

    // Permission Check
    const permission = voiceChannel.permissionsFor(message.client.user);
    if (!permission.has('CONNECT') || !permission.has('SPEAK')) {
        return client.channels.cache.get(txtChannel).send('I need permission to both connect AND speak in the channel');
    }

    // If there is NO queue and adding song do
    if (!serverQueue && !plCheck) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        // Song information and saving it into a struct
        const songInfo = await ytdl.getInfo(songURL);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct);

        // Pushing the song to our songs array
        queueContruct.songs.push(song);

        // Try and catch block for playing the song
        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        }
        catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    }
    // If there is NO queue and adding playlist
    else if (!serverQueue && plCheck) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };

        // Playlist information
        const playlistInfo = await ytpl(songURL);
        const listLength = playlistInfo.items.length;

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct);

        // Itterate trough every song
        for (let i = 0; i < listLength; i++) {
            const song = {
                title: playlistInfo.items[i].title,
                url: playlistInfo.items[i].url_simple,
            };

            // Pushing the song to our songs array
            queueContruct.songs.push(song);
        }
        client.channels.cache.get(txtChannel).send(`${queueContruct.songs.length}/${listLength} Songs was successfully added to the queue!`);

        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        }
        catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    }
    // If there is queque and adding playlist
    else if (plCheck) {
        const playlistInfo = await ytpl(songURL);
        const listLength = playlistInfo.items.length;
        const prevSongsLength = serverQueue.songs.length;
        for (let i = 0; i < listLength; i++) {

            const songpl = {
                title: playlistInfo.items[i].title,
                url: playlistInfo.items[i].url_simple,
            };
            serverQueue.songs.push(songpl);
        }
        client.channels.cache.get(txtChannel).send(`${serverQueue.songs.length - prevSongsLength}/${listLength} Songs was successfully added to the queue!`);
    }
    // If there is queque and adding song
    else {
        const songInfo = await ytdl.getInfo(songURL);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        serverQueue.songs.push(song);
        return client.channels.cache.get(txtChannel).send(`${song.title} has been added to the queue!`);
    }
}


//  #region play, pause, skip functions
function play(server, song) {
    const serverQueue = queue.get(server.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(server.id);
        return;
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url, { quality: 'highestaudio', highWaterMark: 1 << 25 })).on('finish', () => {
        serverQueue.songs.shift();
        play(server, serverQueue.songs[0]);
    }).on('error', error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Now playing: **${song.title}**`);
}


function skip(message, serverQueue, skipNR) {
    if (!message.member.voice.channel) {
        return client.channels.cache.get(txtChannel).send('You have to be in a voice channel to skip the music!');
    }
    if (!serverQueue) {
        return client.channels.cache.get(txtChannel).send('There is no song that I could skip!');
    }

    for (let i = 1; i < skipNR; i++) {
        serverQueue.songs.shift();
    }
    serverQueue.connection.dispatcher.end();
}


function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return client.channels.cache.get(txtChannel).send('You have to be in a voice channel to stop the music!');
    }
    if (serverQueue) {
        serverQueue.songs = [];
    }
    serverQueue.connection.dispatcher.end();
}

// #endregion