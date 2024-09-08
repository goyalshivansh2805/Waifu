const {ApplicationCommandOptionType,Client,Interaction,Message,EmbedBuilder, Embed} = require('discord.js');
const User = require('../../models/User');
const { triggerAsyncId } = require('async_hooks');
const Image = require('../../models/Image');
const errorManager = require("../../utils/errorLogs");
defaultRcImageURL = "https://media1.tenor.com/m/mJ_Og97j5WwAAAAC/chipi-chapa.gif";
module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback:async(client , messageOrInteraction,usedCommandObject)=>{
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
            let currentImage = await Image.findOne({userId:targetUserId});
            let image = null;
            if(!currentImage){
                image = defaultRcImageURL;
            }else{
                image = currentImage.imageURL;
            }
            const averageScore = user.raidsParticipated?(user.totalScore/user.raidsParticipated).toFixed(2):0;
            const raidCountStatistics  = new EmbedBuilder()
                .setDescription(`<@${targetUserId}> Statistics\n> Guild: **${user.guildName || 'Waifu'}**`)
                .setThumbnail(`${targetUser.displayAvatarURL()}`)
                .setFields(
                    {name:'**Average Score**',value:`${averageScore}`,inline:true,},
                    {name:'**Total Raids**',value:`${user.raidsParticipated}`,inline:true,},
                    )
                .setImage(`${image}`)
                .setTimestamp()
                .setColor('Blue')
                .setFooter({text:`Requested by ${authorUser.displayName}`, iconURL:`${authorUser.displayAvatarURL()}`})
            messageOrInteraction.reply({
                embeds:[raidCountStatistics]
            });
            }
        catch (error) {
            await errorManager(client,messageOrInteraction,usedCommandObject,error);
        }   
    },
    name:'profile',
    description:'Shows Your Profile',
    options:[
        {
            name:'user',
            description:'The user whose raid count you want to see.',
            type:ApplicationCommandOptionType.User,
        },
    ],
    arguments:0,
    format:'`!profile`',
    alias:['pr'],
}