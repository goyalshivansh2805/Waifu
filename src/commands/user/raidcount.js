const {ApplicationCommandOptionType,Client,Interaction,Message,EmbedBuilder, Embed} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback: async (client,messageOrInteraction,usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let targetUserId = null;  
            let authorId = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                targetUserId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    targetUserId = usedCommandObject.commandArguments[0];
                    if (targetUserId.startsWith('<@')) {
                        const match = targetUserId.match(/^<@!?(\d+)>$/);
                        if (match) {
                            targetUserId = match[1];
                        }
                    }
                }
            }else{
                authorId = messageOrInteraction.user.id;
                targetUserId = messageOrInteraction.user.id;
                const targetUserOption = await messageOrInteraction.options.get('user');
                if(targetUserOption){
                    targetUserId = targetUserOption.value;
                }
            }
            const authorUser = await client.users.fetch(authorId);
            const targetUser = await client.users.fetch(targetUserId);
            let user = await User.findOne(
                {
                    userId:targetUserId
                }
            )
            let logs = await Log.find(
                {
                    userId:targetUserId,
                }
            )
            if(!user){
                const messageEmbed = new EmbedBuilder()
                    .setTitle('Records Not Found ')
                    .setDescription(`<@${targetUserId}> does not have any raid records.`)
                    .setTimestamp()
                    .setColor('Red')
                    .setFooter({text:`Requested by ${authorUser.displayName}`, iconURL:`${authorUser.displayAvatarURL()}`})
                messageOrInteraction.reply({embeds:[messageEmbed]});
                return;
            }
            const averageScore = user.raidsParticipated?user.totalScore/user.raidsParticipated.toFixed(2):0;
            const raidCountStatistics  = new EmbedBuilder()
                .setDescription(`<@${targetUserId}> Statistics\n> Guild: **${user.guildName || 'Waifu'}**`)
                .setThumbnail(`${targetUser.displayAvatarURL()}`)
                .setFields(
                    {name:'**Statistics**',value:`> Total Raids: ${user.raidsParticipated}\n> Average Score: ${averageScore}`},
                    {name:'**Previous Scores**',value:`> 1. ${logs[0]?.score || 0}\n> 2. ${logs[1]?.score || 0}`},
                    {name:'**Rewards**',value:`> Elixir: ${user.elixir} <:Elixir:1198549045732442178> \n> Shard: ${user.shard} <:Shard:1198548958654517289>`},
                    )
                .setTimestamp()
                .setColor('Blue')
                .setFooter({text:`Requested by ${authorUser.displayName}`, iconURL:`${authorUser.displayAvatarURL()}`})
            messageOrInteraction.reply({
                embeds:[raidCountStatistics]
            });
            }
        catch (error) {
            console.log(`Error While Using rc: ${error}`);
        }   
    },
    name:'raidcount',
    description:"Shows Your's or any other user's RaidCount Statistics..",
    options:[
        {
            name:'user',
            description:'The user whose raid count you want to see.',
            type:ApplicationCommandOptionType.User,
        },
    ],
    alias:['rc'],
    arguments:0,
    format:'`!raidcount`',
};