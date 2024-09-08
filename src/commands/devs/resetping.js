const {devs } = require('../../../config.json');
const User = require('../../models/User');
const errorManager = require("../../utils/errorLogs");
const GuildReminder = require('../../models/GuildReminder');


module.exports = {
    callback:async (client,message,usedCommandObject)=>{
        
        try {
            let resetAll = false;
            if(!devs.includes(message.author.id) ) return;
            const authorId = message.author.id;
            let targetUserId = message.author.id;
            if(usedCommandObject.commandArguments.length){
                targetUserId = usedCommandObject.commandArguments[0];
                if(targetUserId === "all"){
                    resetAll = true;
                }
                if (targetUserId.startsWith('<@')) {
                    const match = targetUserId.match(/^<@!?(\d+)>$/);
                    if (match) {
                        targetUserId = match[1];
                    }
                }
            }

            const authorUser = await client.users.fetch(authorId);
            if(!resetAll){
                let target = await User.findOne(
                    {
                        userId:targetUserId,
                    }
                );
                if(!target || !target.guildName) return message.reply(`<@${targetUserId}> is Not in any guild.`);
                let guildName = target.guildName;
                const guildRemindData = await GuildReminder.findOne({guildName});
    
                if(!guildRemindData) return message.reply("Guild's data not found.");
    
                guildRemindData.noOfAutoPings = 0;
                await guildRemindData.save();
    
                message.reply(`No of pings has been reset for guild : **${guildName}**`);
            }else{
                let guilds = await GuildReminder.find();
                for(const guild of guilds){
                    guild.noOfAutoPings = 0;
                    await guild.save();
                }
                message.reply(`No of pings has been reset for all guilds`);
            }
            

        } catch (error) {
            await errorManager(client,message,usedCommandObject,error);
        }
    },
    name:'resetping',
    deleted:true,
    alias:["rp"],
    description:"Reset's the pings",
    format:"`!resetping`",
    arguments:0
}

