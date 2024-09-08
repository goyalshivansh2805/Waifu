const User = require('../models/User');
const Log = require('../models/Log');
const {Client,Message,EmbedBuilder} = require('discord.js');
const {clientId} = require('../../config.json');
const errorManager = require("./errorLogs");
const elixirPerRaid = 100;
const shardPerRaid = 50;
const raidLogChannelId = '1180155049620549724';

/**
 * 
 * @param {Client} client 
 * @param {Message} message 
 */

module.exports = async (client,message) =>{
    try {
        const timeoutPromise = () => {
            return new Promise((resolve) => {
                setTimeout(async () => {
                    description = message.embeds[0].description;
                    if(!description.includes(authorDisplayName)) return;
                    const match = description.match(/(\d+) XP/);
                    if(match) targetUserScore = parseInt(match[1], 10);
                    let authorLogs = await Log.find({
                        userId:targetUserId,
                      }).sort({ createdAt: -1 });
                    const threeHoursInMilliseconds = 3 * 60 * 60 * 1000; 
        
                    for (const log of authorLogs) {
                        const logTimestamp = log.createdAt.getTime();
                        const currentTimestamp = Date.now();
                        if (currentTimestamp - logTimestamp > threeHoursInMilliseconds) {
                            break; 
                          }
                        if (log.score === targetUserScore) return;
                    };
                    
                    resolve();
                }, 2000);
            });
        };
        const embeds = message.embeds;
        if(embeds.length===0) return;
        const embed = embeds[0];
        let description = embed.description;
        let targetUserScore = 0;
        const originalMessage = await message.channel.messages.fetch(message.reference.messageId);
        const authorDisplayName = originalMessage.author.username;
        let targetUserId = originalMessage.author.id;
        let targetUserMoves = 0;
        let targetUserDamage = 0;
        
        if(description === '**Loading Raid** <a:loading:876610443148406794>') { 
            await timeoutPromise();

            } else{
            const userIdMatch = description.match(/<@(\d+)>/);
            const scoreMatch = description.match(/Score: \*\*(\d+)\*\*/);
            const damageMatch = description.match(/Damage: *\*\*(\d+) *\*\*\/\*\*(\d+)\*\*/);
            const moveMatch = description.match(/Total moves used: \*\*(\d+)\*\*/);
            targetUserScore = scoreMatch?parseInt(scoreMatch[1]):0;
            targetUserDamage = damageMatch?damageMatch[1]:0;
            targetUserMoves = moveMatch ? moveMatch[1] : 0;
        }
        if(!targetUserScore) return;
        if(!targetUserId) return;
        let user = await User.findOne(
            {
                userId:targetUserId,
            }
        )
        //console.log(targetUserId);
        if(user){
           user.raidsParticipated += 1;
           user.totalScore += targetUserScore;  
           user.elixir += elixirPerRaid;
           user.shard += shardPerRaid;
        }
        else{
            user = new User(
                {
                    userId:targetUserId,
                    raidsParticipated:1,
                    totalScore:targetUserScore,
                    elixir:elixirPerRaid,
                    shard:shardPerRaid,
                }
            )
        }
        logDetails = new Log(
            {
                userId:targetUserId,
                score:targetUserScore,
                move:targetUserMoves,
                damage:targetUserDamage,
                addedby:clientId,
                serverId:message.guild.id,
            }
        );
        await user.save();
        await logDetails.save();
        const logMessage = new EmbedBuilder()
            .setTitle('📜 Raid Logged.')
            .setDescription(`User: <@${targetUserId}>\nGuild: **${user.guildName}**\nScore: **${targetUserScore}**\nServerID:${message.guild.id}`)
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({text:`Added by ${message.guild.members.me.displayName}` , iconURL: `${message.guild.members.me.displayAvatarURL()}`})
        const channel = await client.channels.fetch(raidLogChannelId);
        channel.send(
            {
                embeds:[logMessage]
            }
        );

    } catch (error) {
        
        await errorManager(client,message,"NA",error);
    }
}