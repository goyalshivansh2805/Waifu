const {Message,Interaction,InteractionCollector,Client,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ApplicationCommandOptionType,ComponentType} = require('discord.js');
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
            let authorId = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
            }else{
                authorId = messageOrInteraction.user.id;
            }
            const authorUser = await client.users.fetch(authorId);
            let author = await User.findOne(
                {
                    userId:authorId,
                }
            );
            if(!author){
                author = new User({
                    userId:authorId,
                });
                await author.save();
            };
            let userGuild = await Guild.findOne(
                {
                    guildName:author.guildName,
                }
            );
            const guildName = author.guildName;
            if(!guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            };
            if(!userGuild){
                messageOrInteraction.reply('Error while Deleting guild. Please contact Developers.');
                return;
            };
            if(authorId !== userGuild.ownerId){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`You Do not have permission to delete the guild **${guildName}**.`,authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }

            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('guild-delete-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('guild-delete-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

            const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to Delete the guild **${guildName}** ?`,authorUser);
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
                if(interaction.customId === 'guild-delete-no'){
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
                if(interaction.customId === 'guild-delete-yes'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    try {
                        const users = await User.find({guildName:guildName});
                        users.forEach(async (user)=>{
                            user.guildName = null;
                            user.guildPosition = 0;
                            await user.save();
                        });
                        await Guild.findOneAndDelete({guildName:guildName});
                        const successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${authorId}> , You have Deleted the Guild **${guildName}** Successfully.`,authorUser);
  
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
            console.log(`Error while deleting guild: ${error}`);
        }
    },
    name:'guilddelete',
    description:'Deletes Your guild.',
    alias:['gd'],
    arguments:0,
    format:'`!guilddelete`',
    devsOnly:true,
}