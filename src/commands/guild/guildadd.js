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
            if(targetUser.bot){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','A bot cannot be added in a guild.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            };
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
            if(author.guildPosition===0){
                const failureMessage = buildEmbed(embedColors.failure,'Process Failed.',`<@${authorId}> , You do not have enough permission to add members into the guild **${author.guildName}**.`,authorUser);
                messageOrInteraction.reply({embeds:[failureMessage]});
                return;
            }
            if(author.guildName === target.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is already in your guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            if(target.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> is already in a guild.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('guild-add-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('guild-add-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

            const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${targetUserId}> , Do you want to be added into the guild **${author.guildName}** ?`,authorUser);
            const reply = await messageOrInteraction.reply(
                {
                    embeds:[confirmationEmbed],
                    components:[buttonRow]
                }
            );
            const filter = (i) => i.user.id === targetUserId;
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
                if(interaction.customId === 'guild-add-no'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    const failureMessage = buildEmbed(embedColors.failure,'Process Cancelled.',`<@${targetUserId}> did not want to join the guild **${author.guildName}** .`,authorUser);

                    reply.edit({
                        embeds:[failureMessage],
                        components:[buttonRow],
                    });
                    return;
                }
                if(interaction.customId === 'guild-add-yes'){
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
                        target.guildName = author.guildName;
                        userGuild.totalMembers += 1;
                        await target.save();
                        await userGuild.save();
                        const successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${targetUserId}> has been added to guild **${author.guildName}** Successfully.`,authorUser);

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
                    const failureMessage = buildEmbed(embedColors.failure,'Process Failed.',`<@${targetUserId}> did not responded in time.`,authorUser);
                    reply.edit({
                        embeds:[failureMessage],
                        components:[buttonRow],
                    });
                }
            });

        } catch (error) {
            console.log(`Error While Adding Player in the guild: ${error}`);
        }
    },
    name:'guildadd',
    description:'Adds a player to your guild.',
    options:[
        {
            name:'user',
            description:'The user you want to add in the guild.',
            type:ApplicationCommandOptionType.Mentionable,
            required:true,
        },
    ],
    alias:['ga'],
    arguments:1,
    format:'`!guildadd userid/user`',
}