Information
******************
A music bot so that songs can be played for all users simultaneously. Made for local hosting. Running on raspberry pi 4 without issues. 

The bot supports youtube songs, youtube playlists and audio from livestreams.

Installation
--------------------
.. code-block:: javascript
    
    npm install

Packages used are in package.json

Features
--------------------
* Play songs, playlists and audio from livestreams. List current and up to 5 next songs. Possible to add skipped songs back to queue. Skip/stop the bot.
* Can be set up to respond only in specific channel.
* Search youtube using the discord chat

TODO
--------------------
* Auto leave the bot after 5 minutes of no activity, after song ended.
* Add status what/if the bot is playing music
* Fix all wanky for-loops to remove and add N songs. It works but it's janky code.
* Move all code from main loops to dedicated functions.
* Add a version command
* Add catch for all errors
* Fix dispatcher connection fix

Changelog
--------------------

* V1.3.5
    1. Fixed issue where bot crashed during loading of playlist with removed/blocked/missing content.

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