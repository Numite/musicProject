Information
******************
The bot is built so that it can run on a raspberry pi 4 without any issues in terms of process power and with limited RAM usage. 

Musicbot that plays youtube: songs, playlists and livestreams. The bot can also list the current songs and up to the next 5 songs in queue, it can skip the current song or the N number of songs spesified by input. 

Installation
--------------------
* No installation support as of now. Packages used are listed in package.json

Features
--------------------
* Play both songs and playlists. List current and up to 5 next songs. Skip/stop the bot.
* Can be set up to respon in spesific channel.
* Seach youtube video using the discord chat

TODO
--------------------
* Auto leave the bot after 5 minutes of no activity, after song ended.
* Add status what/if the bot is playing music
* Fix all wanky for-loops to remove and add N songs. It works but it's janky code.
* Move all code from main loops to dedicated functions.
* Add a version command

Changelog
--------------------

* V1.3
    1. Added timer to restart function and .then() nesting to ensure execution order
    
* V1.2
    1. Added a skiped-songs queue so that a mistake skip can be undone
    #. Added a 150 max songs in queue 
    #. Added a restart function which clears all structs and resets the connection
    #. Added youtube search into the bot directly

* V1.1 
    1. Updated play function to support playing playlists
    #. Cleaned up a lot of the bugs
    #. Added more bugs for later
    #. Added a function to list the current songs and up the 5 next songs

* V1.0
    * Started project. Added play, skip, stop functions.