const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const ms = require('ms');

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
            let time = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                time = usedCommandObject.commandArguments[0];
            }else{
                authorId = messageOrInteraction.user.id;
                time = await messageOrInteraction.options.get('time').value;
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
            const msTime = ms(time);
            if(isNaN(msTime)){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','Please enter a vaild time interval.',authorUser);
                    messageOrInteraction.reply({
                        embeds:[messageEmbed]
                    });
                    return;
            };
            let i=0;
            let remainingRaidersPageDescription = '';
            let raidsDoneDescription = '';
            const logPromises = guildPlayers.map(async (player) => {
                const logs = await Log.find({ userId: player.userId }).sort({ createdAt: -1 });
                return { userId: player.userId, logs };
            });
            const logsForPlayers = await Promise.all(logPromises);
            guildPlayers.sort((a, b) => {
                const logsA = logsForPlayers.find((playerLogs) => playerLogs.userId === a.userId)?.logs || [];
                const logsB = logsForPlayers.find((playerLogs) => playerLogs.userId === b.userId)?.logs || [];

                const scoreA = logsA.length > 0 ? logsA[0].score : 0;
                const scoreB = logsB.length > 0 ? logsB[0].score : 0;

                return scoreB - scoreA;
            
            });
            for(let i = 0; i < guildPlayers.length; i++){
                try {
                    const guildPlayer = guildPlayers[i];
                    if (guildPlayer.raidsParticipated === 0) {
                        remainingRaidersPageDescription += `• <@${guildPlayer.userId}>\n`;
                        remainingRaiders.push(guildPlayer);
                        continue;
                    };
                    const logs = await Log.find({ userId: guildPlayer.userId }).sort({ createdAt: -1 });
                    if (!logs || !logs.length) {
                        remainingRaidersPageDescription += `• <@${guildPlayer.userId}>\n`;
                        remainingRaiders.push(guildPlayer);
                        continue;
                    }
                    const lastLog = logs[0];
                    const logTimestamp = lastLog.createdAt.getTime();
                    const currentTimestamp = Date.now();
                    if (currentTimestamp - logTimestamp > msTime) {
                        remainingRaidersPageDescription += `• <@${guildPlayer.userId}>\n`;
                        remainingRaiders.push(guildPlayer);
                        continue;
                    }
                    const lastRaidTimestamp = Math.floor(logTimestamp / 1000);
                    raidsDoneDescription += `• <@${guildPlayer.userId}> : ${lastLog.score} : <t:${lastRaidTimestamp}:R> \n`;
                } catch (error) {
                    console.error(`Error processing logs for user ${guildPlayers[i].userId}: ${error}`);
                }
            };
            if(raidsDoneDescription==='') raidsDoneDescription = 'No Raids Within that time limit';
            if(remainingRaidersPageDescription==='') remainingRaidersPageDescription = 'No players Remaining.';
            const raidsDoneEmbed = buildEmbed(embedColors.info,'Raid Status.',raidsDoneDescription,authorUser);
            const remainingRaidersEmbed = buildEmbed(embedColors.info,'Remaining Players.',remainingRaidersPageDescription,authorUser);
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
                        raidPingMessage += `• <@${remainingRaider.userId}>\n`
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
    arguments:1,
    format:'`!rs time\n\n> time -> 1h for last hour raids.`',
    options:[
        {
            name:'time',
            description:'Time interval for raid status. (30m,1h)',
            type:ApplicationCommandOptionType.String,
            required:true,
        },
    ],
    alias:['rs',],
    devsOnly:true,
}