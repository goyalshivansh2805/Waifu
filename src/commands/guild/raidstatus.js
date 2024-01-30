const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const ms = require('ms');

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

module.exports={
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback:async (client,messageOrInteraction,usedCommandObject)=>{
        try {
            
            if(!messageOrInteraction.inGuild()) return;
            let authorId = null;
            let time = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                time = usedCommandObject.commandArguments[0];
            }else{
                authorId = messageOrInteraction.user.id;
                time = await messageOrInteraction.options.get('time').value;
            };
            const authorUser = await client.users.fetch(authorId);
            const author = await User.findOne(
                {
                    userId:authorId,
                }
            );
            const guildPlayers = await User.find({
                guildName:author.guildName,
            });
            if(!author || !author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                    messageOrInteraction.reply({
                        embeds:[messageEmbed]
                    });
                    return;
            };
            const msTime = ms(time);
            if(isNaN(msTime)){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','Please enter a vaild time interval.',authorUser);
                    messageOrInteraction.reply({
                        embeds:[messageEmbed]
                    });
                    return;
            };
            let i=0;
            let pageDescription = '';
            const logPromises = guildPlayers.map(async (player) => {
                const logs = await Log.find({ userId: player.userId }).sort({ createdAt: -1 });
                return { userId: player.userId, logs };
            });
            const logsForPlayers = await Promise.all(logPromises);
            guildPlayers.sort((a, b) => {
                const logsA = logsForPlayers.find((playerLogs) => playerLogs.userId === a.userId)?.logs || [];
                const logsB = logsForPlayers.find((playerLogs) => playerLogs.userId === b.userId)?.logs || [];

                const scoreA = logsA.length > 0 ? logsA[0].score : 0;
                const scoreB = logsB.length > 0 ? logsB[0].score : 0;

                return scoreB - scoreA;
            
            });
            for(let i = 0; i < guildPlayers.length; i++){
                try {
                    const guildPlayer = guildPlayers[i];
                    if (guildPlayer.raidsParticipated === 0) {
                        continue;
                    };
                    const logs = await Log.find({ userId: guildPlayer.userId }).sort({ createdAt: -1 });
                    if (!logs || !logs.length) continue;
                    const lastLog = logs[0];
                    const logTimestamp = lastLog.createdAt.getTime();
                    const currentTimestamp = Date.now();
                    if (currentTimestamp - logTimestamp > msTime) continue;
                    const lastRaidTimestamp = Math.floor(logTimestamp / 1000);
                    pageDescription += `• <@${guildPlayer.userId}> : ${lastLog.score} : <t:${lastRaidTimestamp}:R> \n`;
                } catch (error) {
                    console.error(`Error processing logs for user ${guildPlayer.userId}: ${error}`);
                }
            };
            if(pageDescription==='') pageDescription = 'No Raids Within that time limit';
            const raidsDoneDescription = pageDescription;
            const embed = buildEmbed(embedColors.info,'Raid Status.',pageDescription,authorUser);
            messageOrInteraction.reply({embeds:[embed]});
        } catch (error) {
            console.log(`Error : ${error}`);
        }
    },
    name:'raidstatus',
    description:'Shows Raid Status after a certain time.',
    arguments:1,
    format:'`!rs time\n\n> time -> 1h for last hour raids.`',
    options:[
        {
            name:'time',
            description:'Time interval for raid status. (30m,1h)',
            type:ApplicationCommandOptionType.String,
            required:true,
        },
    ],
    alias:['rs',],
    devsOnly:true,
}