const {Message,Client,EmbedBuilder} = require('discord.js');
const errorManager = require("../../utils/errorLogs");
const Raid = require('../../models/Raid');
const {devs } = require('../../../config.json');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} message
     */
    callback:async (client,message,usedCommandObject)=>{
        try {
            if(!devs.includes(message.author.id) ) return;
            const currentRaid = await Raid.findOne().sort({ createdAt: -1 });
            if(!currentRaid) {
                messageOrInteraction.reply('Please do sgr once or contact sg');
                return;
            };

            const startingTimestamp = currentRaid.startingTimestamp;
            const endingTimestamp = currentRaid.endingTimestamp;

            message.reply(`Starting : <t:${startingTimestamp}:R>\nEnding : <t:${endingTimestamp}:R>`);
            return;
        } catch (error) {
            await errorManager(client,message,usedCommandObject,error);
        }
    },
    name:'raid',
    description:'Shows current raid.',
    deleted:true,
    devOnly:true,
    arguments:0,
    alias:['raid'],
}