const {ApplicationCommandOptionType,Client,Interaction,Message,EmbedBuilder, Embed} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const pagination = require('../../utils/pagination');

const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow',
    info:'Blue'
  };

sortTypes = ['rewards','reward','score','raids','raid','combined'];
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
    callback: async (client,messageOrInteraction,usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let targetUserId = null;  
            let authorId = null;
            let type = 'score';
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                targetUserId = messageOrInteraction.author.id;
                if(usedCommandObject.commandArguments.length){
                    type = usedCommandObject.commandArguments[0]?usedCommandObject.commandArguments[0]:'score';
                    type.toLowerCase();
                    const targetUserOption = usedCommandObject.commandArguments[1];
                    if (targetUserOption && targetUserOption.startsWith('<@')) {
                        const match = targetUserOption.match(/^<@!?(\d+)>$/);
                        if (match) {
                            targetUserOption = match[1];
                        }
                    }
                    if(!sortTypes.includes(type)) {messageOrInteraction.reply('Please Enter a valid sort type.'); return;}
                }
            }else{
                authorId = messageOrInteraction.user.id;
                targetUserId = messageOrInteraction.user.id;
                const targetUserOption = await messageOrInteraction.options.get('user');
                type = await messageOrInteraction.options.get('type')?.value;
                if(targetUserOption){
                    targetUserId = targetUserOption.value;
                }
            };

            const authorUser = await client.users.fetch(authorId);
            const targetUser = await client.users.fetch(targetUserId);
            let user = await User.findOne(
                {
                    userId:targetUserId
                }
            );
            if(!user || !user.guildName){
                const messageEmbed = new EmbedBuilder()
                    .setTitle('Records Not Found ')
                    .setDescription(`<@${targetUserId}> is not in a guild.`)
                    .setTimestamp()
                    .setColor('Red')
                    .setFooter({text:`Requested by ${authorUser.displayName}`, iconURL:`${authorUser.displayAvatarURL()}`})
                messageOrInteraction.reply({embeds:[messageEmbed]});
                return;
            }
            let guildInfo = await Guild.findOne(
                {
                    guildName:user.guildName,
                },
            );
            let guildPlayers =await  User.find({
                guildName:user.guildName,
            });
            const leaderboardPages = [];
            let pageDescription = '';
            const recordsPerPage = 10;
            let combinedRecords = {};
            let index = 0;
            let i=0
            if(type === 'raids' || type === 'raid') guildPlayers.sort((a,b)=> b.raidsParticipated - a.raidsParticipated);
            if(type === 'score') guildPlayers.sort((a,b)=> (b.raidsParticipated ? b.totalScore / b.raidsParticipated.toFixed(2) : 0) -
            (a.raidsParticipated ? a.totalScore / a.raidsParticipated.toFixed(2) : 0));
            if(type === 'rewards' || type === 'reward') guildPlayers.sort((a,b)=> b.elixir - a.elixir);
            if (type === 'combined') {
                // Assign points for score
                const scorePoints = guildPlayers
                    .map((player, index) => ({ user: player.userId, points: guildPlayers.length - index }))
                    .reduce((acc, curr) => {
                        acc[curr.user] = curr.points;
                        return acc;
                    }, {});
                // Assign points for raids
                const raidPoints = guildPlayers
                    .map((player, index) => ({ user: player.userId, points: guildPlayers.length - index }))
                    .reduce((acc, curr) => {
                        acc[curr.user] = curr.points;
                        return acc;
                    }, {});
                // Calculate combined points
                combinedRecords = guildPlayers.map(player => {
                    const totalPoints = (scorePoints[player.userId] || 0) + (raidPoints[player.userId] || 0);
                    return { user: player.userId, totalPoints };
                });
                // Sort by combined points
                combinedRecords.sort((a, b) => b.totalPoints - a.totalPoints);
            }
            for(const guildPlayer of guildPlayers){
                if(type === 'combined') break;
                if(index<recordsPerPage){
                    if(type === 'raids' || type === 'raid') pageDescription+=`${++i} : <@${guildPlayer.userId}> : **${guildPlayer.raidsParticipated}**\n`;
                    if(type == 'score') pageDescription+=`${++i} : <@${guildPlayer.userId}> : **${guildPlayer.raidsParticipated?guildPlayer.totalScore/guildPlayer.raidsParticipated.toFixed(2):0}**\n`;
                    if(type === 'reward' || type === 'rewards') pageDescription+=`${++i} : <@${guildPlayer.userId}> : **${guildPlayer.elixir}** <:Elixir:1198549045732442178> : **${guildPlayer.shard}** <:Shard:1198548958654517289> \n`;
                    index++;
                };
                if(index===recordsPerPage){
                    const pageEmbed = buildEmbed(embedColors.info , `Leaderboard : **${user.guildName}** : **${type.toUpperCase()}**`,pageDescription,authorUser);
                    pageDescription='';
                    leaderboardPages.push(pageEmbed);
                    index = 0;
                }
            };
            if (type === 'combined') {
                combinedRecords.forEach((record) => {
                    pageDescription += `${++i} : <@${record.user}> : **${record.totalPoints}** Points\n`;
                    index++;
                    if (index === recordsPerPage) {
                        const pageEmbed = buildEmbed(embedColors.info, `Leaderboard : **${user.guildName}** : **${type.toUpperCase()}**`, pageDescription, authorUser);
                        leaderboardPages.push(pageEmbed);
                        pageDescription = '';
                        index = 0;
                    }
                });
            }
            
            if (index > 0) {
                const pageEmbed = buildEmbed(
                    embedColors.info,
                    `Leaderboard : **${user.guildName}** : **${type.toUpperCase()}**`,
                    pageDescription,
                    authorUser
                );
                leaderboardPages.push(pageEmbed);
            }
            const currentPage = await pagination(client,messageOrInteraction,authorId,leaderboardPages);
            }
        catch (error) {
            console.log(`Error While Using lb: ${error}`);
        }   
    },
    name:'leaderboard',
    description:"Shows Your's or any other guild's leaderboard .",
    options:[
        {
            name:'user',
            description:'The user whose guild leaderboard you want to see.',
            type:ApplicationCommandOptionType.User,
        },
        {
            name:'type',
            description:'Sorting Type',
            type:ApplicationCommandOptionType.String,
            choices:[
                {
                    name:'Combined',
                    value:'combined'
                },
                {
                    name:'Score',
                    value:'score',
                },
                {
                    name:'Raids',
                    value:'raid',
                },
                {
                    name:'Rewards',
                    value:'reward'
                },
            ]
        }
    ],
    alias:['lb'],
    arguments:0,
    format:'`!leaderboard`',

};