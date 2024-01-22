const {Client,Interaction,Message,EmbedBuilder,ApplicationCommandOptionType, embedLength,ButtonBuilder,ButtonStyle,ActionRowBuilder,ComponentType}  = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');

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
     * @param {Message,Interaction} messageOrInteraction 
     */
    callback:async (client,messageOrInteraction,usedCommandObject)=>{
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
            const author = await User.findOne(
                {
                    userId:authorId,
                }
            );
            let target = await User.findOne(
                {
                    userId:targetUserId,
                }
            );
            if(!author){
                messageOrInteraction.reply('Please Create a guild before adding someone.');
                return;
            };
            if(!target){
                target = new User({
                    userId:targetUserId,
                })
            };
            await target.save();
            if(!author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            if(!target.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is not in a guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            if(authorId===targetUserId){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You Cannot Remove Yourself.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            if(author.guildName !== target.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is not in your guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            if(author.guildPosition<target.guildPosition){
                const failureMessage = buildEmbed(embedColors.failure,'Process Failed.',`<@${authorId}> , You do not have enough permission to remove <@${targetUserId}> from the guild **${author.guildName}**.`,authorUser);
                messageOrInteraction.reply({embeds:[failureMessage]});
                return;
            }
            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('guild-remove-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('guild-remove-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

            const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to remove  <@${targetUserId}> from the guild **${author.guildName}** ?`,authorUser);
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
                if(interaction.customId === 'guild-remove-no'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    const failureMessage = buildEmbed(embedColors.failure,'Process Cancelled.',`<@${authorId}> decided to not remove <@${targetUserId}> from the guild **${author.guildName}** .`,authorUser);
                    interaction.reply({
                        embeds:[failureMessage],
                    });
                    reply.edit({
                        components:[buttonRow],
                    });
                    return;
                }
                if(interaction.customId === 'guild-remove-yes'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    try {
                        const userGuild = await Guild.findOne(
                            {
                                guildName:author.guildName,
                            }
                        );
                        if(!userGuild) {
                            interaction.reply('Guild not found.');
                            return;
                        }
                        target.guildName = null;
                        target.guildPosition = 0;
                        userGuild.totalMembers -= 1;
                        await target.save();
                        await userGuild.save();
                        const successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${targetUserId}> has been removed from the guild **${author.guildName}** Successfully.`,authorUser);
                        interaction.reply({
                            embeds:[successMessage],
                        });
                        reply.edit({
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
            console.log(`Error While Removing Player from the guild: ${error}`);
        }
    },
    name:'guildremove',
    description:'Removes a player from your guild.',
    options:[
        {
            name:'user',
            description:'The user you want to remove from the guild.',
            type:ApplicationCommandOptionType.Mentionable,
            required:true,
        },
    ],
    alias:['gr'],
    arguments:1,
    format:'`!guildremove userid/user`'
}