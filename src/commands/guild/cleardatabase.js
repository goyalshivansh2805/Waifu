const {Message,Interaction,InteractionCollector,Client,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ApplicationCommandOptionType,ComponentType} = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');
const errorManager = require("../../utils/errorLogs");
const Log = require('../../models/Log');
const {devs,admins} = require('../../../config.json');

const raidLogChannelId = '1180155049620549724';

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
     * @param {Message} messageOrInteraction 
     */
    callback : async (client,messageOrInteraction,usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let targetUserId = null;  
            let authorId = null;
            let allGuilds = false;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                targetUserId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    let argument = usedCommandObject.commandArguments[0]
                    if(argument.toLowerCase() === 'all'){
                        allGuilds =  true;
                    }else{
                        targetUserId = usedCommandObject.commandArguments[0];
                        if (targetUserId.startsWith('<@')) {
                            const match = targetUserId.match(/^<@!?(\d+)>$/);
                            if (match) {
                                targetUserId = match[1];
                            }
                        }
                    }
                }
            }else{
                authorId = messageOrInteraction.user.id;
            }
            let guildName = null;
            const authorUser = await client.users.fetch(authorId);
            const targetUser = await client.users.fetch(targetUserId);
            if(!allGuilds){
                let authorUserData = await User.findOne({
                    userId:authorId
                });
                let targetUserData = await User.findOne({
                    userId:targetUserId,
                });
                if(!authorUserData || !authorUserData.guildName && !devs.includes(authorId)){
                    const noDataEmbed = buildEmbed(embedColors.failure,'Guild Not Found','You are not in any guild.',authorUser);
                    messageOrInteraction.reply({embeds:[noDataEmbed]});
                    return;
                };
                if(!targetUserData || !targetUserData.guildName){
                    const noDataEmbed = buildEmbed(embedColors.failure,'Guild Not Found',`<@${targetUserId}> is not in any guild.`,authorUser);
                    messageOrInteraction.reply({embeds:[noDataEmbed]});
                    return;
                };
                if(authorUserData) guildName = authorUserData.guildName;
                if(guildName !== targetUserData.guildName && !devs.includes(authorId)){
                    const notInSameGuildEmbed = buildEmbed(embedColors.failure,'Not in Same Guild',`<@${targetUserId}> is not in the guild **${guildName}**.`,authorUser);
                    messageOrInteraction.reply({embeds:[notInSameGuildEmbed]});
                    return;
                };
                if(authorUserData.guildPosition===0 && !devs.includes(authorId)){
                    const notEnoughPermsEmbed = buildEmbed(embedColors.failure,'Not Enough Permission','You do not have permission to use this command.',authorUser);
                    messageOrInteraction.reply({embeds:[notEnoughPermsEmbed]});
                    return;
                };
            }else{
                if(!devs.includes(authorId) && !admins.includes(authorId)){
                    const notEnoughPermsEmbed = buildEmbed(embedColors.failure,'Not Enough Permission','You do not have permission to use this command.',authorUser);
                    messageOrInteraction.reply({embeds:[notEnoughPermsEmbed]});
                    return;
                };
            };
            const successButton = new ButtonBuilder()
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success)
                .setCustomId('database-clear-yes');
            const failureButton = new ButtonBuilder()
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('database-clear-no');
            const buttonRow = new ActionRowBuilder().addComponents(successButton,failureButton);
			let confirmationEmbed = null;
            if(!allGuilds) confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to clear the database for guild **${guildName}** ?`,authorUser);
            else confirmationEmbed = buildEmbed(embedColors.process,'Confirmation Needed.',`<@${authorId}> , Do you want to clear the database for all guilds?`,authorUser);
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
                if(interaction.customId === 'database-clear-no'){
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
                if(interaction.customId === 'database-clear-yes'){
                    isResponded = true;
                    successButton.setDisabled(true);
                    failureButton.setDisabled(true);
                    try {
                        let guildPlayers = null;
                        if(!allGuilds) guildPlayers = await User.find({guildName:guildName});
                        else guildPlayers = await User.find();
                        guildPlayers.forEach(async (guildPlayer) => {
                            guildPlayer.raidsParticipated = 0;
                            guildPlayer.elixir = 0;
                            guildPlayer.totalScore = 0;
                            guildPlayer.shard = 0;
                            await Log.deleteMany({userId:guildPlayer.userId});
                            await guildPlayer.save();
                        });
                        let successMessage = null;
                        if(!allGuilds) successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${authorId}> , Data for Guild with name **${guildName}** has been Deleted Successfully.`,authorUser);
                        else successMessage = buildEmbed(embedColors.success,'Process Successful.',`<@${authorId}> , Data for all guilds have been successfully deleted.`,authorUser);
                        reply.edit({
                            embeds:[successMessage],
                            components:[buttonRow],
                        });
                        let logMessage = null;
                        if(!allGuilds){
                            logMessage = new EmbedBuilder()
                                .setTitle('🗑️ Guild Database Deleted')
                                .setDescription(`Guild: **${guildName}**\nDatabase has been cleared.`)
                                .setColor(0xff0000)  // Red color to indicate deletion
                                .setTimestamp()
                                .setFooter({ text: `Deleted by ${authorUser.displayName}`, iconURL: `${authorUser.displayAvatarURL()}` });
                        }else{
                            logMessage = new EmbedBuilder()
                            .setTitle('🗑️ Guild Database Deleted')
                            .setDescription('Database for all guilds have been deleted')
                            .setColor(0xff0000)  // Red color to indicate deletion
                            .setTimestamp()
                            .setFooter({ text: `Deleted by ${authorUser.displayName}`, iconURL: `${authorUser.displayAvatarURL()}` });
                        }
                        const channel = await client.channels.fetch(raidLogChannelId);
                        channel.send(
                        {
                            embeds:[logMessage]
                        }
        );
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
    name:'cleardatabase',
    description:'Clears the guild Database',
    format:'`!cleardatabase`',
    alias:['cleardb','cdb'],
    arguments:0,
    deleted:true,
    devsOnly:true,
}