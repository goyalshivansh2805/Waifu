const {EmbedBuilder,InteractionCollector,Message,ApplicationCommandOptionType, Client} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
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
        let authorId = null;
        if(messageOrInteraction instanceof Message){
          authorId = messageOrInteraction.author.id;
        }else{
          authorId = messageOrInteraction.user.id;
        };
        const authorUser = await client.users.fetch(authorId);
        let authorUserData = await User.findOne({
          userId:authorId
        });
        let authorLogs = await Log.find({
          userId:authorId,
        }).sort({ createdAt: -1 });
        if(!authorUserData || !authorLogs){
          const noDataEmbed = buildEmbed(embedColors.failure,'Records Not Found','Please Raid atleast Once,then use this command.',authorUser);
          messageOrInteraction.reply({embeds:[noDataEmbed]});
          return;
        };
        logsPerPage = 10;
        const logsArray =[];
        let index = 0;
        let i=0;
        let pageEmbed = null;
        for(const authorLog of authorLogs){
          if(index === 0) pageEmbed = buildEmbed(embedColors.info , `Raid Logs`,`<@${authorId}> : **${authorUserData.guildName?authorUserData.guildName:'Waifu'}**`,authorUser,logsArray.length +1);
          if(index<logsPerPage){
            const timestamp = Math.floor(authorLog.createdAt.getTime() / 1000);
            pageEmbed.addFields({
              name: ` `,
              value: `${++i} : Score:**${authorLog.score}** | Moves:**${authorLog.move}** | Damage:**${authorLog.damage}** | <t:${timestamp}:R>\n`,
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
        console.log(`Error While Using vl: ${error}`);
      }
    },
    name:'viewlogs',
    description:'View Your Raid Logs.',
    arguments:0,
    alias:['vl'],
    format:'!viewlogs',
}