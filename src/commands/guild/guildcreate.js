const {Message,Interaction,InteractionCollector,Client,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ApplicationCommandOptionType,ComponentType} = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');
const errorManager = require("../../utils/errorLogs");

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
    callback:async (client , messageOrInteraction , usedCommandObject)=>{
        try {
            if(!messageOrInteraction.inGuild()) return;
            let authorId = null;
            let guildName = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    guildName = usedCommandObject.commandArguments[0];
                }
            }else{
                authorId = messageOrInteraction.user.id;
                guildName = await messageOrInteraction.options.get('guild-name').value;
            }
            if(!guildName){
                messageOrInteraction.reply('Please Provide a guild name.');
            };
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
            }
            if(author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are already in a guild.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('guild-create-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('guild-create-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

            const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to create the guild **${guildName}** ?`,authorUser);
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
                if(interaction.customId === 'guild-create-no'){
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
                if(interaction.customId === 'guild-create-yes'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    try {
                        let userGuild = await Guild.findOne(
                            {
                                guildName:guildName,
                            }
                        );
                        if(userGuild) {
                            successButton.setDisabled(true);
                            failureButton.setDisabled(true);
                            const failureMessage = buildEmbed(embedColors.failure,'Process Cancelled.',`<@${authorId}> , Guild with name **${guildName}** already exists.`,authorUser);
  
                            reply.edit({
                                embeds:[failureMessage],
                                components:[buttonRow],
                            });
                            return;
                        }
                        userGuild = new Guild({
                            guildName:guildName,
                            ownerId:authorId,
                            totalMembers:1,
                        });
                        author.guildName = guildName;
                        author.guildPosition = 2;
                        await author.save();
                        await userGuild.save();
                        const successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${authorId}> , Guild with name **${author.guildName}** has been Created Successfully.`,authorUser);
  
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
            await errorManager(client,messageOrInteraction,usedCommandObject,error);
        }
    },
    name:'guildcreate',
    description:'Creates a new guild.',
    options:[
        {
            name:'guild-name',
            description:'The name of the guild.',
            type:ApplicationCommandOptionType.String,
            required:true,
        },
    ],
    alias:['gc'],
    arguments:1,
    format:'`!guildcreate guild-name`',
}