const {devs } = require('../../../config.json');
require('dotenv').config();
const Raid = require('../../models/Raid');
const errorManager = require("../../utils/errorLogs");



module.exports = {
    callback:async (client , message,usedCommandObject) => {
        if(!devs.includes(message.author.id) ) return message.channel.send("You're not bot the owner! ")

    try {
   			 const currentRaid = await Raid.findOne().sort({ createdAt: -1 });
            if(!currentRaid) {
                messageOrInteraction.reply('Please do sgr once or contact sg');
                return;
            };
            
            currentRaid.startingTimestamp = usedCommandObject.commandArguments[0];
            currentRaid.endingTimestamp = usedCommandObject.commandArguments[1];
    		await currentRaid.save();
            message.reply("DONE");
          } catch(e) {
            await errorManager(client,message,usedCommandObject,error);

    }
    },
    name:'changeraidtiming',
    description:'Change raid timings.',
    arguments:0,
    format:'!changeraidtiming',
    alias:["crt"],
    deleted:true,
}