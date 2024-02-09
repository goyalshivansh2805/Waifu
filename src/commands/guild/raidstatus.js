const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const Raid = require('../../models/Raid');

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
            const remainingRaiders = [];
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
            const guildPlayers = await User.find({
                guildName:author.guildName,
            });
            if(!author || !author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                    messageOrInteraction.reply({
                        embeds:[messageEmbed]
                    });
                    return;
            };
            let i=0;
            let remainingRaidersPageDescription = '';
            let raidsDoneDescription = '';
  
            const logsForPlayers = await Log.aggregate([
                { $match: { userId: { $in: guildPlayers.map(player => player.userId) } } },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', log: { $first: '$$ROOT' } } }
            ]);
            logsForPlayers.sort((a,b) => {
                return b.log.score - a.log.score;
            });
            const currentRaid = await Raid.findOne().sort({ createdAt: -1 });
            if(!currentRaid) {
                messageOrInteraction.reply('Please do sgr once or contact sg');
                return;
            };
            let raidDoneCount = 0;
            let remainingRaidersCount = 0;
            const startingTimestamp = currentRaid.startingTimestamp;
            const endingTimestamp = currentRaid.endingTimestamp;
            let guildTotalScore = 0;
            for(let i = 0; i < logsForPlayers.length; i++){
                try {
                    const lastLog = logsForPlayers[i];
                    if (!lastLog ) {
                        remainingRaidersPageDescription += `• <@${lastLog.log.userId}>\n`;
                        remainingRaiders.push(lastLog.log.userId);
                        remainingRaidersCount++;
                        continue;
                    }
                    const logTimestamp = lastLog.log.createdAt.getTime();
                    const lastRaidTimestamp = Math.floor(logTimestamp / 1000);
                    if (lastRaidTimestamp<startingTimestamp || lastRaidTimestamp>endingTimestamp) {
                        remainingRaidersPageDescription += `• <@${lastLog.log.userId}>\n`;
                        remainingRaiders.push(lastLog.log.userId);
                        remainingRaidersCount++;
                        continue;
                    }
                    raidsDoneDescription += `• <@${lastLog.log.userId}> : ${lastLog.log.score} : <t:${lastRaidTimestamp}:R> \n`;
                    guildTotalScore += lastLog.log.score;
                    raidDoneCount++;
                } catch (error) {
                    console.error(`Error processing logs for user ${logsForPlayers[i].log.userId}: ${error}`);
                }
            };
            if(raidsDoneDescription==='') raidsDoneDescription = 'No Raids Within that time limit';
            else raidsDoneDescription += `\n> **Average Guild Score** : ${(guildTotalScore/raidDoneCount).toFixed(2)}\n> **Total Players** : ${raidDoneCount}`; 
            if(remainingRaidersPageDescription==='') remainingRaidersPageDescription = 'No players Remaining.';
            else remainingRaidersPageDescription +=   `\n> **Total Players** : ${remainingRaidersCount}`;
            const raidsDoneEmbed = buildEmbed(embedColors.info,`Raid Status [Ends : <t:${endingTimestamp}:R> ]`,raidsDoneDescription,authorUser);
            const remainingRaidersEmbed = buildEmbed(embedColors.info,`Remaining Players [Ends : <t:${endingTimestamp}:R> ]`,remainingRaidersPageDescription,authorUser);
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
            console.log(`Error : ${error}`);
        }
    },
    name:'raidstatus',
    description:'Shows Raid Status after a certain time.',
    arguments:0,
    format:'`!rs `',
    alias:['rs',],
}
