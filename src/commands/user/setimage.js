const {ApplicationCommandOptionType,Client,Interaction,Message,EmbedBuilder, Embed,ButtonBuilder,ActionRowBuilder,ComponentType,ButtonStyle} = require('discord.js');
const User = require('../../models/User');
const {devs} = require('../../../config.json');
const Image = require('../../models/Image');


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
     * @param {Message} message
     */
    callback:async (client,message,usedCommandObject)=>{
        if(!message.inGuild()) return;
        const authorId = message.author.id;
        const authorUser = await client.users.fetch(authorId);
        const newImageURL = usedCommandObject.commandArguments[0];
        let targetUserId = authorId;
        let targetUser = null;
        if(devs.includes(authorId)){
            if(usedCommandObject.commandArguments.length === 2){
                targetUserId = usedCommandObject.commandArguments[1];
                if(usedCommandObject.commandArguments[1].startsWith('<@')){
                    const match = targetUserId.match(/^<@!?(\d+)>$/);
                        if (match) {
                            targetUserId = match[1];
                        }
                }
            }
        };
        try {
            targetUser = await client.users.fetch(targetUserId);
        } catch (error) {
            return message.reply('Please Provide a valid user');
        };

        const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('set-image-yes');
        const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('set-image-no');
        const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);

        const confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to change your image to the following image?`,authorUser);
        confirmationEmbed.setImage(`${newImageURL}`);
        const reply = await message.reply(
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
            if(interaction.customId === 'set-image-no'){
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
            if(interaction.customId === 'set-image-yes'){
                isResponded = true;
                successButton.setDisabled(true);
                failureButton.setDisabled(true);
                try {
                    let previousImage = await Image.findOne({
                        userId:targetUserId,
                    });
                    if(!previousImage){
                        previousImage = new Image(
                            {
                                userId:targetUserId,
                                imageURL:newImageURL,
                            },
                        );
                        await previousImage.save();
                    }else{
                        previousImage.imageURL = newImageURL;
                        await previousImage.save();
                    };
                    const successMessage = buildEmbed(embedColors.success,'Process Successful.','Your image has been successfully changed',authorUser);

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
    },
    name:'setimage',
    description:'Sets your image for `!pr` command',
    arguments:1,
    alias:['si'],
    format:'`!si <imgURL>`     \n> PS : format `jpg` Preferred. ',
    deleted:true,
}