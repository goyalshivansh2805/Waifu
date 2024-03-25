const {ApplicationCommandOptionType,Client,Interaction,Message,EmbedBuilder, Embed} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');

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

function positionToRole(position){
    if(position === 0) return 'N';
    if(position === 1) return 'G';
    if(position === 2) return 'F';
}
module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback:async (client , messageOrInteraction , usedCommandObject)=>{
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
            const targetUser = await client.users.fetch(targetUserId);
            let targetUserData = await User.findOne({
                userId:targetUserId,
            });
            if(!targetUserData){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            };
            const guildName = targetUserData.guildName;
            if(!guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            };
            const users = await User.find({
                guildName:guildName,
            });
            const guildData = await Guild.findOne({guildName:guildName});
            users.sort((a,b)=> b.guildPosition-a.guildPosition );
            let guildInfo = '';
            users.forEach((user)=>{
                const averageScore = user.raidsParticipated?(user.totalScore/user.raidsParticipated).toFixed(2):0;
                const role = positionToRole(user.guildPosition);
                guildInfo += `**${role}** : <@${user.userId}> : ${averageScore} Avg\n`
            });

            const guildInfoEmbed = buildEmbed(embedColors.info,`Guild : **${guildName}** : ${guildData.totalMembers} Players`,guildInfo,authorUser);
            messageOrInteraction.reply({embeds:[guildInfoEmbed]});
            
        } catch (error) {
            console.log(`Error while showing guild info: ${error}`);
        }
    },
    name:'guildinfo',
    description:'Shows someones guild info.',
    options:[
        {
            name:'user',
            description:'The user whose guildinfo you want to see.',
            type:ApplicationCommandOptionType.User,
        },
    ],
    alias:['gi'],
    arguments:0,
    format:'`!guildinfo`',
}