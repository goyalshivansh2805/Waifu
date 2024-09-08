const {EmbedBuilder,InteractionCollector,Message,ApplicationCommandOptionType, Client} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const errorManager = require("../../utils/errorLogs");
const pagination = require('../../utils/pagination');

const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow',
    info:'Blue',
  };

function buildEmbed(color, title, description, authorUser,page) {
    return new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Requested by ${authorUser.displayName} : Page : ${page}`, iconURL: `${authorUser.displayAvatarURL()}` })
      .setTitle(title)
      .setColor(color)
      .setDescription(description);
  } 

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction  
     */
    callback:async (client,messageOrInteraction,usedCommandObject) => {
      try {
        
        if(!messageOrInteraction.inGuild()) return; 
        let targetUserId = null;  
        let authorId = null;
        if(messageOrInteraction instanceof Message){
            authorId = messageOrInteraction.author.id;
            targetUserId = messageOrInteraction.author.id;
            if(usedCommandObject.commandArguments.length){
                targetUserId = usedCommandObject.commandArguments[0];
                if (targetUserId.startsWith('<@')) {
                    const match = targetUserId.match(/^<@!?(\d+)>$/);
                    if (match) {
                        targetUserId = match[1];
                    }
                }
            }
        }else{
            authorId = messageOrInteraction.user.id;
            targetUserId = messageOrInteraction.user.id;
            const targetUserOption = await messageOrInteraction.options.get('user');
            if(targetUserOption){
                targetUserId = targetUserOption.value;
            }
        }
        const authorUser = await client.users.fetch(authorId);
        let targetUserData = await User.findOne({
          userId:targetUserId
        });
        let targetLogs = await Log.find({
          userId:targetUserId,
        }).sort({ createdAt: -1 });
        if(!targetUserData ||  targetLogs.length ===0){
          const noDataEmbed = buildEmbed(embedColors.failure,'Records Not Found','Please Raid atleast Once,then use this command.',authorUser);
          await messageOrInteraction.reply({embeds:[noDataEmbed]});
          return;
        };
        logsPerPage = 10;
        const logsArray =[];
        let index = 0;
        let i=0;
        let pageEmbed = null;
        for(const targetLog of targetLogs){
          if(index === 0) pageEmbed = buildEmbed(embedColors.info , `Raid Logs`,`<@${targetUserId}> : **${targetUserData.guildName?targetUserData.guildName:'Waifu'}**`,authorUser,logsArray.length +1);
          if(index<logsPerPage){
            const timestamp = Math.floor(targetLog.createdAt.getTime() / 1000);
            pageEmbed.addFields({
              name: ` `,
              value: `${++i} : Score:**${targetLog.score}** | Moves:**${targetLog.move}** | Damage:**${targetLog.damage}** | <t:${timestamp}:R>\n`,
          });
            index++;
          };
          if(index===logsPerPage){
            logsArray.push(pageEmbed);
            index = 0;
          }
        };
        if (index > 0) {
          logsArray.push(pageEmbed);
        };
        const currentPage = await pagination(client,messageOrInteraction,authorId,logsArray);
      } catch (error) {
        await errorManager(client,messageOrInteraction,usedCommandObject,error);
      }
    },
    name:'viewlogs',
    description:'View Your Raid Logs.',
    arguments:0,
    alias:['vl'],
    format:'!viewlogs',
    devsOnly:true,
}