const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../models/User');
const Log = require('../models/Log');
const Guild = require('../models/Guild');
const Raid = require('../models/Raid');
const GuildReminder = require('../models/GuildReminder');

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


module.exports = async (guildName,authorUser) =>{
            const guildPlayers = await User.find({
                guildName:guildName,
            });
            let raidRemindData = await GuildReminder.findOne({guildName:guildName});
            if(!raidRemindData){
                raidRemindData = new GuildReminder({guildName:guildName});
            }
            let i=0;
            const remainingRaiders = [];
            let remainingRaidersPageDescription = `**Pings : ${(raidRemindData.noOfManualPings)+(raidRemindData.noOfAutoPings)}**\n\n`;
            let raidsDoneDescription = '';
  
            const logsForPlayers = await Log.aggregate([
                { $match: { userId: { $in: guildPlayers.map(player => player.userId) } } },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', log: { $first: '$$ROOT' } } }
            ]);
            logsForPlayers.sort((a,b) => {
                return b.log.score - a.log.score;
            });
            
            const currentRaid = await Raid.findOne().sort({ createdAt: -1 });
            if(!currentRaid) {
                messageOrInteraction.reply('Please do sgr once or contact sg');
                return;
            };
            let raidDoneCount = 0;
            let remainingRaidersCount = 0;
            const userIdsInLogs = new Set(logsForPlayers.map(log => log._id));
            // Iterate over guildPlayers and add logs for users who don't have any
            for (const player of guildPlayers) {
                if (!userIdsInLogs.has(player.userId)) {
                    logsForPlayers.push({ _id: player.userId, log: null });
                }
            }
            const startingTimestamp = currentRaid.startingTimestamp;
            const endingTimestamp = currentRaid.endingTimestamp;
            let guildTotalScore = 0;
            for(let i = 0; i < logsForPlayers.length; i++){
                try {
                    const lastLog = logsForPlayers[i];
                    if(!lastLog.log){
                        remainingRaidersPageDescription += `• <@${lastLog._id}>\n`;
                        remainingRaiders.push(lastLog._id);
                        remainingRaidersCount++;
                        continue;
                    }
                    if (!lastLog ) {
                        remainingRaidersPageDescription += `• <@${lastLog.log.userId}>\n`;
                        remainingRaiders.push(lastLog.log.userId);
                        remainingRaidersCount++;
                        continue;
                    }
                    const logTimestamp = lastLog.log.createdAt.getTime();
                    const lastRaidTimestamp = Math.floor(logTimestamp / 1000);
                    if (lastRaidTimestamp<startingTimestamp || lastRaidTimestamp>endingTimestamp) {
                        remainingRaidersPageDescription += `• <@${lastLog.log.userId}>\n`;
                        remainingRaiders.push(lastLog.log.userId);
                        remainingRaidersCount++;
                        continue;
                    }
                    raidsDoneDescription += `• <@${lastLog.log.userId}> : ${lastLog.log.score} : <t:${lastRaidTimestamp}:R> \n`;
                    guildTotalScore += lastLog.log.score;
                    raidDoneCount++;
                } catch (error) {
                    console.error(`Error processing logs for user ${logsForPlayers[i].log.userId}: ${error}`);
                }
            };
            if(raidsDoneDescription==='') raidsDoneDescription = 'No Raids Within that time limit';
            else raidsDoneDescription += `\n> **Average Guild Score** : ${(guildTotalScore/raidDoneCount).toFixed(2)}\n> **Total Players** : ${raidDoneCount}`; 
            if(remainingRaidersPageDescription==='') remainingRaidersPageDescription = 'No players Remaining.';
            else remainingRaidersPageDescription +=   `\n> **Total Players** : ${remainingRaidersCount}`;
            const raidsDoneEmbed = buildEmbed(embedColors.info,`Raid Status [Ends : <t:${endingTimestamp}:R> ]`,raidsDoneDescription,authorUser);
            const remainingRaidersEmbed = buildEmbed(embedColors.info,`Remaining Players [Ends : <t:${endingTimestamp}:R> ]`,remainingRaidersPageDescription,authorUser);
            const returnArray = [];
            returnArray.push(remainingRaiders,raidsDoneEmbed,remainingRaidersEmbed);
            return returnArray;
}