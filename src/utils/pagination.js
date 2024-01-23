const {Interaction,Client,ActionRowBuilder,ComponentType,ButtonBuilder,ButtonStyle, Message} = require('discord.js');

/**
 * 
 * @param {Client} client 
 * @param {Message,Interaction} messageOrInteraction 
 * @param pages 
 * @param time 
 */
module.exports = async (client , messageOrInteraction,pages,time = 60_000)=> {
    await messageOrInteraction.deferReply();

    if(pages.length === 1){
        const page = await messageOrInteraction.editReply({
            embeds:page,
            fetchReply :true,
        });
        return page;
    };

    const previousButton = new ButtonBuilder()
        .setCustomId('previous')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);
    const homeButton = new ButtonBuilder()
        .setCustomId('home')
        .setEmoji('🏠')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true);
    const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(previousButton,homeButton,nextButton);
    let index = 0;

    const currentPage = await messageOrInteraction.editReply(
        {
            embeds:pages[index],
            components:[buttonRow],
            fetchReply:true,
        }
    );

    const collector = await currentPage.createMessageComponentCollector({
        componentType:ComponentType.Button,
        
    })
}