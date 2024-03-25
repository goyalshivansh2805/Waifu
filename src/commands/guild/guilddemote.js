const {Message,Interaction,InteractionCollector,Client,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ApplicationCommandOptionType,ComponentType} = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');

function rankToPosition(rank){
    rank = rank.toLowerCase();
    if(rank === 'newbie' || rank === 'n') return 0;
    return -1;
};

function positionToRank(position){
    if(position === 0) return 'Newbie';
    if(position === 1) return 'GuildMaster';
    if(position === 2) return 'Founder';
};
const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow'
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
     * @param {Message} messageOrInteraction 
     */
    callback:async (client , messageOrInteraction,usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let targetUserId = null;  
            let authorId = null;
            let targetUserNewRank = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                targetUserId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    targetUserId = usedCommandObject.commandArguments[0];
                    targetUserNewRank = rankToPosition(usedCommandObject.commandArguments[1])
                    if (targetUserId.startsWith('<@')) {
                        const match = targetUserId.match(/^<@!?(\d+)>$/);
                        if (match) {
                            targetUserId = match[1];
                        }
                    }
                }
            }else{
                authorId = messageOrInteraction.user.id;
                targetUserId = await messageOrInteraction.options.get('user').value;
                targetUserNewRank = await messageOrInteraction.options.get('rank').value;
            }
            const authorUser = await client.users.fetch(authorId);
            const targetUser = await client.users.fetch(targetUserId);
            const authorData = await User.findOne({userId:authorId});
            const targetUserData = await User.findOne({userId:targetUserId});
            const authorGuildData = await Guild.findOne({guildName:authorData.guildName});
            if(!authorData || !authorData.guildName){
                const notInGuildEmbed = buildEmbed(embedColors.failure,'Demotion Failed',`<@${authorId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({embeds:[notInGuildEmbed]});
                return;
            };
            if(!targetUserData || !targetUserData.guildName){
                const notInGuildEmbed = buildEmbed(embedColors.failure,'Demotion Failed',`<@${targetUserId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({embeds:[notInGuildEmbed]});
                return;
            };
            if(!authorGuildData){
                messageOrInteraction.reply('An error Occured. Please Contact Developers.');
                return;
            };
            if(authorData.guildName !== targetUserData.guildName){
                const notInSameGuildEmbed = buildEmbed(embedColors.failure,'Demotion Failed',`<@${targetUserId}> is not in the guild **${authorData.guildName}** .`,authorUser);
                messageOrInteraction.reply({embeds:[notInSameGuildEmbed]});
                return;
            };
            if(authorId===targetUserId){
                const cannotDemoteYourselfEmbed = buildEmbed(embedColors.failure,'Demotion Failed','You cannot demote yourself.',authorUser);
                messageOrInteraction.reply({embeds:[cannotDemoteYourselfEmbed]});
                return;
            };
            if(authorData.guildPosition<=targetUserData.guildPosition){
                const notEnoughPermsEmbed = buildEmbed(embedColors.failure,'Demotion Failed',`You do not have enough permission to Demote <@${targetUserId}>.`,authorUser);
                messageOrInteraction.reply({embeds:[notEnoughPermsEmbed]});
                return;
            };
            if(targetUserNewRank === -1){
                const notValidRankEmbed = buildEmbed(embedColors.failure,'Demotion Failed','Please Provide a Valid Rank.',authorUser);
                messageOrInteraction.reply({embeds:[notValidRankEmbed]});
                return;
            };
            targetUserData.guildPosition = targetUserNewRank;
            await targetUserData.save();
            const promotionSuccessEmbed = buildEmbed(embedColors.success,'Demotion Successful',`<@${targetUserId}> has been Demoted to **${positionToRank(targetUserNewRank)}** Successfully.`,authorUser);
            messageOrInteraction.reply({embeds:[promotionSuccessEmbed]});
            return;
        } catch (error) {
            console.log(`Error while demoting user: ${error}`);
        }
    },
    name:'guilddemote',
    description:'Demotes a player in the guild.',
    options:[
        {
            name:'user',
            description:'The user you want to demote.',
            type:ApplicationCommandOptionType.Mentionable,
            required:true,
        },
        {
            name:'rank',
            description:'To which rank you want to demote the user.',
            type:ApplicationCommandOptionType.Number,
            required:true,
            choices:[
                {
                    name:'Newbie',
                    value:0,
                },
            ]
        }
    ],
    arguments:2,
    format:'`!guilddemote user rank`',
    alias:['gdu'],
}