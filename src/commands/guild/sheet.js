const {ApplicationCommandType,Client,Message,EmbedBuilder,ActionRow,ComponentType,ActionRowBuilder,ButtonBuilder,ButtonStyle, ApplicationCommandOptionType} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const Guild = require('../../models/Guild');
const Raid = require('../../models/Raid');
const {Workbook} = require('exceljs');
const fs = require('fs');

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


function calculateAverageScore(totalScore, raidCount) {
    return raidCount !== 0 ? totalScore / raidCount : 0;
}

function combinedPoints(guildPlayers){
    guildPlayers.sort((a,b)=> (b.raidsParticipated ? b.totalScore / b.raidsParticipated.toFixed(2) : 0) -
            (a.raidsParticipated ? a.totalScore / a.raidsParticipated.toFixed(2) : 0));
        const scorePoints = guildPlayers
                    .map((player, index) => ({ user: player.userId, points: guildPlayers.length - index }))
                    .reduce((acc, curr) => {
                        acc[curr.user] = curr.points;
                        return acc;
                    }, {});
        // Assign points for raids
        guildPlayers.sort((a,b)=> b.raidsParticipated - a.raidsParticipated);
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
        return combinedRecords;
}
module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     */
    callback:async (client , message,usedCommandObject)=>{
        try {
            
            if(!message.inGuild()) return;
            const authorId = message.author.id;
            const authorUser = await client.users.fetch(authorId);
            const author = await User.findOne(
                {
                    userId:authorId,
                }
            );
            if(!author || !author.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.','You are not in any guild.',authorUser);
                    message.reply({
                        embeds:[messageEmbed]
                    });
                    return;
            };
            if(author.guildPosition===0){
                const failureMessage = buildEmbed(embedColors.failure,'Process Failed.',`<@${authorId}> , You do not have enough permission to use this command.`,authorUser);
                message.reply({embeds:[failureMessage]});
                return;
            };
            const reply = await message.reply('Please wait while Sheet is being generated.');
            const guildName = author.guildName;
            const guildPlayers = await User.find({
                guildName:guildName,
            }).lean();
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet(`${guildName.toUpperCase()}`);
            worksheet.columns = [
                { header: 'UserName', key: 'username', width: 20 },
                { header: 'Total Score', key: 'score', width: 20 },
                { header: 'Total Raids', key: 'raids', width: 20 },
                { header: 'Average Score',key:'avgscore',width:20 },
                { header: 'Points', key: 'points' , width:20}
            ];
            const combinedRecords = combinedPoints(guildPlayers);
    
            for(const combinedRecord of combinedRecords){
                try {
                    const data = await User.findOne({userId:combinedRecord.user});
                    const user = await client.users.fetch(data.userId);
                    const username = user.displayName;
                    const totalScore = data.totalScore;
                    const raidsParticipated = data.raidsParticipated;
                    const points = combinedRecord.totalPoints;
                    const averageScore = calculateAverageScore(totalScore,raidsParticipated).toFixed(2);
                    worksheet.addRow({username:username,score:totalScore,raids:raidsParticipated,avgscore:averageScore,points:points});
                } catch (error) {
                    console.log(`Error: ${error}`);
                }
            }
            const filePath = 'src/sheets/output.xlsx';
            await workbook.xlsx.writeFile(filePath);
            reply.edit(`<@${authorId}> , Please Check your dm.`);
            await authorUser.send(
                {
                    content:'Here is your Guild Sheet',
                    files:[
                        {
                            attachment:filePath,
                            name:`${guildName}.xlsx`
                        }
                    ]
                }
            )
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    },
    name:'sheet',
    arguments:0,
    format:'`!sheet`',
    description:'Provides a detailed sheet for your guild',
    alias:['sh'],
    deleted:true,
    cooldown:15,
}