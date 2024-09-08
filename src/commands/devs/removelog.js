const {Message,Client,EmbedBuilder} = require('discord.js');
const errorManager = require("../../utils/errorLogs");
const User = require('../../models/User');
const Log = require('../../models/Log');
const {admins} = require('../../../config.json');

const logRemoveChannelId = "1227915184371138570";


const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow',
    info:'Blue',
  };

function buildEmbed(color, title, description, authorUser) {
    return new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Requested by ${authorUser.displayName}`, iconURL: `${authorUser.displayAvatarURL()}` })
      .setTitle(title)
      .setColor(color)
      .setDescription(description);
  } 


module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     */
    callback:async (client,message,usedCommandObject) => {
        try {
            if(!message.inGuild()) return;
            if(!admins.includes(message.author.id)) return message.reply("You cannot use this command..");
            let targetUserId = usedCommandObject.commandArguments[0];
            let targetUserScore = usedCommandObject.commandArguments[1];
            if (targetUserId.startsWith('<@')) {
                const match = targetUserId.match(/^<@!?(\d+)>$/);
                if (match) {
                    targetUserId = match[1];
                }
            };
            let targetUserData = await User.findOne({
                userId:targetUserId,
            });
            if(isNaN(targetUserScore)) return message.reply("Invalid Score.");
            if(!targetUserData) return message.reply("Target User does not have any data...");

            targetUserScore = parseInt(targetUserScore);

            const logs = await Log.findOne({
                userId:targetUserId,
                score:targetUserScore
            });
			const authorUser = message.author;
            if(!logs) {
                const embed = buildEmbed(embedColors.success, 'Log Not Removed', `Log of score ${targetUserScore} is not found for <@${targetUserId}>.`, authorUser);
                await message.reply({embeds:[embed]});
                return;
            }
            targetUserData.totalScore -= logs.score;
            targetUserData.raidsParticipated -= 1;

            await Log.deleteOne({_id:logs._id});

            await targetUserData.save();

            const logRemovalChannel = await client.channels.fetch(logRemoveChannelId);
            if (!logRemovalChannel) return message.reply('Log removal channel not found.');

            
            const embed = buildEmbed(embedColors.success, 'Log Removed', `Log of score ${targetUserScore} has been removed for <@${targetUserId}>.`, authorUser);
            await message.reply({embeds:[embed]});
            await logRemovalChannel.send({ embeds: [embed] });
            
            
        } catch (error) {
            await errorManager(client,message,usedCommandObject,error);
        }

    },
    name:"removelog",
    alias:["rl"],
    deleted:true,
    format:"`!rl <user> <score>`",
    arguments:2,

}