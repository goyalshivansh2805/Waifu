const {devs } = require('../../../config.json');
require('dotenv').config();

const errorManager = require("../../utils/errorLogs");



module.exports = {
    callback:async (client , message,usedCommandObject) => {
        if(!devs.includes(message.author.id) ) return message.channel.send("You're not bot the owner! ")

    try {
    	let msg = "";
        client.guilds.cache.forEach(guild => {
        msg+=`${guild.name} - ${guild.id}\n`;
    });
    
    	message.reply(msg);
          } catch(e) {
            await errorManager(client,message,usedCommandObject,error);

    }
    },
    name:'listguilds',
    description:'list the guilds bot is in.',
    arguments:0,
    format:'!listguilds',
    alias:["listg"],
    deleted:true,
}