require('dotenv').config();

const {Client,IntentsBitField,Collection} = require('discord.js');
const eventHandler = require('./handlers/eventHandler');
const mongoose = require('mongoose');

const client = new Client({
    intents:[
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
        console.log('Successfully Connected to Database...');
        client.cooldowns = new Collection();
        eventHandler(client);
        client.login(process.env.TOKEN);
    } catch (error) {
        console.log(`Error While Connecting to Database: ${error}`);
    }
})();