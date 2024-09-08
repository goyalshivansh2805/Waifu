const {Interaction,Client,ActionRowBuilder,ComponentType,ButtonBuilder,ButtonStyle, Message} = require('discord.js');

/**
 * 
 * @param {Client} client 
 * @param {Message,Interaction} messageOrInteraction 
 * @param pages 
 * @param time 
 */
module.exports = async (client , messageOrInteraction,authorId,pages,time = 60_000)=> {
    const isInteraction = false;
    if(!messageOrInteraction instanceof Message) {
        await messageOrInteraction.deferReply();
        isInteraction = true;
    }
    if(pages.length === 1){
        if(isInteraction){
            const page = await messageOrInteraction.editReply({
                embeds:pages,
                fetchReply :true,
            });
            return page;
        };
        const page = await messageOrInteraction.reply({
            embeds:pages,
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
    let currentPage = null;
    if(isInteraction){
        currentPage = await messageOrInteraction.editReply(
            {
                embeds:[pages[index]],
                components:[buttonRow],
            }
        );
    }
    if(!isInteraction) {
        currentPage = await messageOrInteraction.reply(
            {
                embeds:[pages[index]],
                components:[buttonRow],
            }
        );
    }
    try {
        const filter = (i) => i.user.id === authorId;
        const collector = await currentPage.createMessageComponentCollector({
            componentType:ComponentType.Button,
            filter,
            time,
        });
    
        collector.on('collect', async (i)=>{
            i.deferUpdate();
            if(i.customId === 'previous'){
                if(index > 0 ) index--;
            };
            if(i.customId === 'home'){
                index = 0;
            };
            if(i.customId === 'next'){
                if(index < pages.length - 1) index++;
            }
    
            if(index === 0) previousButton.setDisabled(true);
            else previousButton.setDisabled(false);
    
            if(index === 0) homeButton.setDisabled(true);
            else homeButton.setDisabled(false);
    
            if(index === pages.length - 1) nextButton.setDisabled(true);
            else nextButton.setDisabled(false);
    
            await currentPage.edit({
                embeds:[pages[index]],
                components:[buttonRow],
            });
    
            collector.resetTimer();
        });
    
        collector.on('end',async () => {
            await currentPage.edit({
                embeds:[pages[index]],
                components:[],
            });
        });
    } catch (error) {
        console.log(`Error in interaction : ${error}`);
    }

    return currentPage;
}