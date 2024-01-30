const {Message,Interaction,InteractionCollector,Client,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ApplicationCommandOptionType,ComponentType} = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');

function rankToPosition(rank){
    rank = rank.toLowerCase();
    if(rank === 'newbie' || rank === 'n') return 0;
    if(rank === 'guildmaster' || rank === 'g') return 1;
    if(rank === 'founder' || rank === 'f') return 2;
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
                const notInGuildEmbed = buildEmbed(embedColors.failure,'Promoting Failed',`<@${authorId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({embeds:[notInGuildEmbed]});
                return;
            };
            if(!targetUserData || !targetUserData.guildName){
                const notInGuildEmbed = buildEmbed(embedColors.failure,'Promoting Failed',`<@${targetUserId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({embeds:[notInGuildEmbed]});
                return;
            };
            if(!authorGuildData){
                messageOrInteraction.reply('An error Occured. Please Contact Developers.');
                return;
            };
            if(authorData.guildName !== targetUserData.guildName){
                const notInSameGuildEmbed = buildEmbed(embedColors.failure,'Promoting Failed',`<@${targetUserId}> is not in the guild **${authorData.guildName}** .`,authorUser);
                messageOrInteraction.reply({embeds:[notInSameGuildEmbed]});
                return;
            };
            if(authorId===targetUserId){
                const cannotDemoteYourselfEmbed = buildEmbed(embedColors.failure,'Demotion Failed','You cannot demote yourself.',authorUser);
                messageOrInteraction.reply({embeds:[cannotDemoteYourselfEmbed]});
                return;
            };
            if(authorData.guildPosition<=targetUserData.guildPosition || (authorData.guildPosition<=targetUserNewRank && authorId !== authorGuildData.ownerId)){
                const notEnoughPermsEmbed = buildEmbed(embedColors.failure,'Promoting Failed',`You do not have enough permission to promote <@${targetUserId}>.`,authorUser);
                messageOrInteraction.reply({embeds:[notEnoughPermsEmbed]});
                return;
            };
            if(targetUserNewRank === -1){
                const notValidRankEmbed = buildEmbed(embedColors.failure,'Promoting Failed','Please Provide a Valid Rank.',authorUser);
                messageOrInteraction.reply({embeds:[notValidRankEmbed]});
                return;
            };
            if(targetUserNewRank<2){
                targetUserData.guildPosition = targetUserNewRank;
                await targetUserData.save();
                const promotionSuccessEmbed = buildEmbed(embedColors.success,'Promotion Successful',`<@${targetUserId}> has been promoted to **${positionToRank(targetUserNewRank)}** Successfully.`,authorUser);
                messageOrInteraction.reply({embeds:[promotionSuccessEmbed]});
                return;
            };
            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('guild-promote-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('guild-promote-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

            const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to make <@${targetUserId}> the **FOUNDER** of **${authorData.guildName}** ?`,authorUser);
            const reply = await messageOrInteraction.reply(
                {
                    embeds:[confirmationEmbed],
                    components:[buttonRow]
                }
            );
            const filter = (i) => i.user.id === authorId;
            const collector = reply.createMessageComponentCollector(
                {
                    componentType:ComponentType.Button,
                    filter,
                    time:30_000,
                }
            );
            let isResponded = false;
            collector.on('collect',async (interaction)=>{
                interaction.deferUpdate();
                if(interaction.customId === 'guild-promote-no'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    const failureMessage = buildEmbed(embedColors.failure,'Process Cancelled.',`<@${authorId}> Cancelled the process.`,authorUser);
                    reply.edit({
                        embeds:[failureMessage],
                        components:[buttonRow],
                    });
                    return;
                }
                if(interaction.customId === 'guild-promote-yes'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    try {
                        targetUserData.guildPosition = 2;
                        authorGuildData.ownerId = targetUserId;
                        authorData.guildPosition = 1;
                        await targetUserData.save();
                        await authorGuildData.save();
                        await authorData.save();
                        const successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${authorId}> , <@${targetUserId}> is the new **Founder** of the Guild **${authorData.guildName}** Successfully.`,authorUser);

                        reply.edit({
                            embeds:[successMessage],
                            components:[buttonRow],
                        });
                        return;
                    } catch (error) {
                        console.log(`Error after button yes is pressed: ${error}`);
                    }
                };
            });
            collector.on('end',()=>{
                if(!isResponded){
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    const failureMessage = buildEmbed(embedColors.failure,'Process Failed.',`<@${authorId}> did not responded in time.`,authorUser);
                    reply.edit({
                        embeds:[failureMessage],
                        components:[buttonRow],
                    });
                }
            });

        } catch (error) {
            console.log(`Error while promoting user: ${error}`);
        }
    },
    name:'guildpromote',
    description:'Promotes a player in the guild.',
    options:[
        {
            name:'user',
            description:'The user you want to promote.',
            type:ApplicationCommandOptionType.Mentionable,
            required:true,
        },
        {
            name:'rank',
            description:'To which rank you want to promote the user.',
            type:ApplicationCommandOptionType.Number,
            required:true,
            choices:[
                {
                    name:'Founder',
                    value:2,
                },
                {
                    name:'GuildMaster',
                    value:1,
                },
                {
                    name:'Newbie',
                    value:0,
                },
            ]
        }
    ],
    arguments:2,
    format:'`!guildpromote user rank`',
    alias:['gpu'],
    devsOnly:true,
}