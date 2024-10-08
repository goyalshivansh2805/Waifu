const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const Raid = require('../../models/Raid');
const RaidDetails = require('../../utils/raidedAndRemaining');
const GuildReminder = require('../../models/GuildReminder');
const errorManager = require("../../utils/errorLogs");

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

module.exports={
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback:async (client,messageOrInteraction,usedCommandObject)=>{
        try {
            
            if(!messageOrInteraction.inGuild()) return;
            let authorId = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
            }else{
                authorId = messageOrInteraction.user.id;
            };
            const authorUser = await client.users.fetch(authorId);
            const author = await User.findOne(
                {
                    userId:authorId,
                }
            );
            if(!author || !author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                messageOrInteraction.reply({
                    embeds:[messageEmbed]
                });
                return;
            };
            
            const details = await RaidDetails(author.guildName , authorUser);
            const remainingRaiders = details[0];
            const raidsDoneEmbed = details[1];
            const remainingRaidersEmbed = details[2];
            
            const raidsDoneButton  = new ButtonBuilder()
                .setCustomId('raids-done')
                .setStyle(ButtonStyle.Primary)
                .setLabel('Raids Done')
            const remainingRaidersButton = new ButtonBuilder()
                .setLabel('Remaining Raiders')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('remaining-raiders')
            const pingRemainingRaidersButton = new ButtonBuilder()
                .setLabel('Ping them?')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('ping-remaining-raiders')
            const buttonRow = new ActionRowBuilder().addComponents(remainingRaidersButton);
            const reply = await messageOrInteraction.reply({embeds:[raidsDoneEmbed],components:[buttonRow]});

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
                if(interaction.customId === 'remaining-raiders'){
                    isResponded = true;
                    buttonRow.setComponents(raidsDoneButton,pingRemainingRaidersButton);
                    reply.edit(
                        {
                            embeds:[remainingRaidersEmbed],
                            components:[buttonRow],
                        },
                    );
                    return;
                };
                if(interaction.customId === 'raids-done'){
                    isResponded = true;
                    buttonRow.setComponents(remainingRaidersButton);
                    reply.edit(
                        {
                            embeds:[raidsDoneEmbed],
                            components:[buttonRow],
                        },
                    );
                    return;
                };
                if(interaction.customId === 'ping-remaining-raiders'){
                    isResponded = true;
                    if(!remainingRaiders.length) {
                        const notEnoughPlayersEmbed = buildEmbed(embedColors.failure,'Not Enough Players','No Players To ping.',authorUser);
                        reply.edit(
                            {
                                embeds:[notEnoughPlayersEmbed],
                                components:[buttonRow],
                            },
                        );
                        return;
                    };
                    buttonRow.setComponents(raidsDoneButton,remainingRaidersButton);
                    if(author.guildPosition===0){
                        const notEnoughPermsEmbed = buildEmbed(embedColors.failure,'Not Enough Permission','You do not have permission to use this command.',authorUser);
                        reply.edit(
                            {
                                embeds:[notEnoughPermsEmbed],
                                components:[buttonRow],
                            },
                            );
                            return;
                        };
                
                    let raidPingMessage = '';
                    let raidRemindData = await GuildReminder.findOne({guildName:author.guildName});
                    raidRemindData.noOfManualPings += 1 ;
                    await raidRemindData.save();
                    for(const remainingRaider of remainingRaiders){
                        raidPingMessage += `• <@${remainingRaider}>\n`
                    };
                    raidPingMessage += '\n Please Do Raid As Soon As Possible.\n||If Done , Do `sgr` Once||';
                    messageOrInteraction.channel.send(raidPingMessage);
                    const message = buildEmbed(embedColors.failure,'Pinging Remaining Raiders','Remaining Raiders Have been successfully Pinged.',authorUser);
                    reply.edit(
                        {
                            embeds:[message],
                            components:[buttonRow],
                        },
                    );
                    return;
                };
            });
            collector.on('end',async ()=> {
                if(!isResponded){
                    raidsDoneButton.setDisabled(true);
                    remainingRaidersButton.setDisabled(true);
                    pingRemainingRaidersButton.setDisabled(true);
                    reply.edit({
                         components:[buttonRow],
                    });
                };
            });
        } catch (error) {
            await errorManager(client,messageOrInteraction,usedCommandObject,error);
        }
    },
    name:'raidstatus',
    description:'Shows Raid Status after a certain time.',
    arguments:0,
    format:'`!rs `',
    alias:['rs',],
}
