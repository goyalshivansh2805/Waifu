const {EmbedBuilder,InteractionCollector,Message,ApplicationCommandOptionType, Client} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const {devs} = require('../../../config.json');

const elixirPerRaid = 100;
const shardPerRaid = 50;
const raidLogChannelId = '1198995652307325100';

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

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback:async (client , messageOrInteraction,usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let targetUserId = null;  
            let authorId = null;
            let targetUserScore = null;
            let targetUserMoves = 0;
            let targetUserDamage = 0;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    targetUserId = usedCommandObject.commandArguments[0];
                    targetUserScore = usedCommandObject.commandArguments[1];
                    if (targetUserId.startsWith('<@')) {
                        const match = targetUserId.match(/^<@!?(\d+)>$/);
                        if (match) {
                            targetUserId = match[1];
                        }
                    };
                    if(usedCommandObject.commandArguments[2]) targetUserMoves=usedCommandObject.commandArguments[2];
                    if(usedCommandObject.commandArguments[3]) targetUserDamage=usedCommandObject.commandArguments[3];
                }
            }else{
                authorId = messageOrInteraction.user.id;
                targetUserId = await messageOrInteraction.options.get('user').value;
                targetUserScore = await messageOrInteraction.options.get('score').value;
                targetUserMoves = await messageOrInteraction.options.get('move')?.value;
                targetUserDamage = await messageOrInteraction.options.get('damage')?.value;
                if(!targetUserDamage) targetUserDamage = 0;
                if(!targetUserMoves) targetUserMoves =0;

            };
            const authorUser = await client.users.fetch(authorId);
            const targetUser = await client.users.fetch(targetUserId);
            let authorUserData = await User.findOne({
                userId:authorId
            });
            let targetUserData = await User.findOne({
                userId:targetUserId,
            });
            if(isNaN(targetUserDamage) || isNaN(targetUserMoves)){
                const invalidInputEmbed = buildEmbed(embedColors.failure,'Invalid Input','Please Enter Valid Moves/Damage.',authorUser);
                messageOrInteraction.reply({embeds:[invalidInputEmbed]});
                return;
            };
            targetUserScore = parseInt(targetUserScore);
            targetUserMoves = parseInt(targetUserMoves);
            targetUserDamage = parseInt(targetUserDamage);
            if(!authorUserData || !authorUserData.guildName && !devs.includes(authorId)){
                const noDataEmbed = buildEmbed(embedColors.failure,'Guild Not Found','You are not in any guild.',authorUser);
                messageOrInteraction.reply({embeds:[noDataEmbed]});
                return;
            };
            let guildName = null;
            if(authorUserData) guildName = authorUserData.guildName;
            if(!targetUserData || !targetUserData.guildName && !devs.includes(authorId)){
                const noDataEmbed = buildEmbed(embedColors.failure,'Guild Not Found',`<@${targetUserId}> is not in any guild.`,authorUser);
                messageOrInteraction.reply({embeds:[noDataEmbed]});
                return;
            };
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
            if(!targetUserData){
                targetUserData = new User(
                    {
                        userId:targetUserId,
                        totalScore:targetUserScore,
                        raidsParticipated:1,
                        elixir:elixirPerRaid,
                        shard:shardPerRaid,
                    }
                )
            }else{
                targetUserData.raidsParticipated += 1;
                targetUserData.totalScore += targetUserScore;
                targetUserData.elixir += elixirPerRaid;
                targetUserData.shard += shardPerRaid;
            }
            logDetails = new Log(
                {
                    userId:targetUserId,
                    score:targetUserScore,
                    move:targetUserMoves,
                    damage:targetUserDamage,
                    addedby:authorId,
                }
            );
            await targetUserData.save();
            await logDetails.save();
            const confirmMessage = buildEmbed(embedColors.success,'Raid Successfully Logged',`Raid Logged for <@${targetUserId}> Successfully.\nScore: ${targetUserScore}\nMoves: ${targetUserMoves}`,authorUser);
            messageOrInteraction.reply({embeds:[confirmMessage]});
            const logMessage = new EmbedBuilder()
                .setTitle('📜 Raid Logged.')
                .setDescription(`User: <@${targetUserId}>\nGuild: **${guildName}**\nScore: **${targetUserScore}**`)
                .setColor(0x00ff00)
                .setTimestamp()
                .setFooter({text:`Added by ${authorUser.displayName}` , iconURL: `${authorUser.displayAvatarURL()}`})
            const channel = await client.channels.fetch(raidLogChannelId);
            channel.send(
                {
                    embeds:[logMessage]
                }
        );

        } catch (error) {
            console.log(`Error while using log: ${error}`);
        }
    },
    name:'log',
    description:'Logs a raid for a user.',
    options:[
        {
            name:'user',
            description:'The user whose raid is to be logged.',
            type:ApplicationCommandOptionType.User,
            required:true,
        },
        {
            name:'score',
            description:'Score of the user.',
            type:ApplicationCommandOptionType.Number,
            required:true,
        },
        {
            name:'moves',
            description:'Moves user used. (Default -> 0)',
            type:ApplicationCommandOptionType.Number,
        },
        {
            name:'damage',
            description:'Damage Dealt by the user. (Default -> 0)',
            type:ApplicationCommandOptionType.Number,
        },
    ],
    alias:['l'],
    arguments:2,
    format:'`!log user score moves damage`',
    devsOnly:true,
}