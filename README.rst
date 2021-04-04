Information
******************
A music bot so that songs can be played for all users simultaneously. Made for local hosting. Tested hosting on linux-based OS. 

The bot supports youtube songs, youtube playlists and livestreams (link only).

This project is mainly for having a bot that doesn't lag or compromises on audio quality. Built in javascript because I wanted to learn it.

Config-file
-------------------
Create a file called config.json and paste the following inside the file. The prefix can be chosen freely and the token is the token for your discord bot

.. code-block:: javascript

    {
        "prefix": "--",
        "token": "your-token-here"
    }


Installation
--------------------
* Download repository from stable branch and run the command below when inside the folder:

.. code-block:: javascript
    
    npm install

Use code below to ensure a clean update, if updating.

.. code-block:: javascript
    
    npm ci

Features
--------------------
* Play songs, playlists and audio from livestreams. List current and up to 5 next songs. Possible to add skipped songs back to queue. Skip/stop the bot.
* Search youtube using the discord chat
* Using the bot on multiple serves with only 1 instance required. Performance depends on local hardware.

TODO
--------------------
* Add so that the bots stops after all users has left the channel.
* Auto leave the bot waits to leave until 5 minutes after last song ended.

Changelog
--------------------
* 1.5.2
    1. Fixed bug related to search function of the bot. Added error handling for said bug.
    #. Updated all packages.
    #. Fixed incompatibility with opus, discord/opus and nodejs.

* 1.5
    1. Added support for custom error messages so they can be handled by if() statements.
    #. Added try/catch for most critical and common errors.
    #. Fixed dispatcher connection fix on restart while not connected
    #. Moved all code to dedicated functions
    #. Fixed all unnecessary for()-loops that has alternative javascript functions

* V1.4
    1. Added status of what the bot is playing.
    #. Minor Bugfixes
    #. Fixed major issue with node causing the bot to crash repeatedly

* V1.3.5
    1. Fixed issue where bot crashed during loading of playlist with removed/blocked/missing content.

* V1.3
    1. Added timer to restart function and nesting to ensure execution order
    
* V1.2
    1. Added a skiped-songs queue so that a mistake skip can be undone
    #. Added a 150 max songs in queue 
    #. Added a restart function which clears all data and resets the connection
    #. Added youtube search into the bot directly

* V1.1 
    1. Updated play function to support playing playlists
    #. Cleaned up a lot of the bugs
    #. Added more bugs for later
    #. Added a function to list the current songs and up the 5 next songs

* V1.0
    * Started project. Added play, skip, stop functions.