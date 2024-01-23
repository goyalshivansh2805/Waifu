const User = require('../models/User');
const Log = require('../models/Log');
const {Client,Message,EmbedBuilder} = require('discord.js');

const elixirPerRaid = 100;
const shardPerRaid = 50;
const raidLogChannelId = '1198995652307325100';

/**
 * 
 * @param {Client} client 
 * @param {Message} message 
 */

module.exports = async (client,message) =>{
    try {
        
        const embeds = message.embeds;
        if(embeds.length===0) return;
        const embed = embeds[0];
        const description = embed.description;
        const userIdMatch = description.match(/<@(\d+)>/);
        const scoreMatch = description.match(/Score: \*\*(\d+)\*\*/);
        const xpMatch = description.match(/XP: \*\*(\+\d+)\*\*/);
        const damageMatch = description.match(/Damage: *\*\*(\d+) *\*\*\/\*\*(\d+)\*\*/);
        const moveMatch = description.match(/Total moves used: \*\*(\d+)\*\*/);
        const targetUserId = userIdMatch?userIdMatch[1]:null;
        const targetUserScore = scoreMatch?parseInt(scoreMatch[1]):null;
        const targetUserXp = xpMatch?xpMatch[1].slice(1):null;
        const targetUserDamage = damageMatch?damageMatch[1]:null;
        const targetUserMoves = moveMatch ? moveMatch[1] : null;
        if(!targetUserId || !targetUserScore || !targetUserXp || !targetUserDamage || !targetUserMoves) return;
        let user = await User.findOne(
            {
                userId:targetUserId,
            }
        )
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
            }
        );
        await user.save();
        await logDetails.save();
        const logMessage = new EmbedBuilder()
            .setTitle('📜 Raid Logged.')
            .setDescription(`User: <@${targetUserId}>\nGuild: **${user.guildName}**\nScore: **${targetUserScore}**`)
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
        console.log(`Error While AutoLogging: ${error}`);
    }
}