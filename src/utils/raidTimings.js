const Raid = require('../models/Raid');
const {Message,Client,EmbedBuilder} =  require('discord.js');


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
/**
 * 
 * @param {Client} client 
 * @param {Message} message 
 */
module.exports = async (client , message)=>{
    try {
        const timeoutPromise = () => {
            return new Promise((resolve) => {
                setTimeout(()=>{
                    title = message.embeds[0].title;
                    if(!title || title.startsWith("SOFI RAID: [Turn Ends")) return;
                    try{
                     	const raidEndTiming = title.match(/\<t\:(\d+)\:R\>/);   
                        if(!raidEndTiming) return;
                    	raidEndTimestamp = parseInt(raidEndTiming[1],10);
                    	resolve();
                    }
                    catch (error){
                        return console.log(error);
                    }
                },4000);
            });
        };

        const embeds = message.embeds;
        if(embeds.length===0) return;
        const embed = embeds[0];
        let title = embed.title;
        const botUser =client.user;
        let raidEndTimestamp = null;
        let description = embed.description;
        if(description === '**Loading Raid** <a:loading:876610443148406794>') { 
            await timeoutPromise();
        };
        if(raidEndTimestamp===null) return;
        let islastRaid = true;
        const previousRaids = await Raid.find().sort({ createdAt: -1 });
        if(!previousRaids[0]) islastRaid = false;
        let lastRaidEndingTimestamp = null;
        if(islastRaid) {
            const lastRaid = previousRaids[0];
            lastRaidEndingTimestamp = lastRaid.endingTimestamp;
            if(lastRaidEndingTimestamp === raidEndTimestamp) return;
        };
        const raid = new Raid(
            {
                startingTimestamp:islastRaid?lastRaidEndingTimestamp:null,
                endingTimestamp:raidEndTimestamp,
            }
        );
        await raid.save();
        const raidLogChannelId = "1224357057398837298";
        const raidLogChannel =  await client.channels.fetch(raidLogChannelId);
         const raidLogDescription = `Starting: <t:${raid.startingTimestamp}:R>\nEnding: <t:${raid.endingTimestamp}:R>\nMessage Id: ${message.id}\nChannel Id: ${message.channel.id}\nGuild Id: ${message.guild.id}\nTitle: ${title}`;
        const raidLogMessage = buildEmbed(embedColors.failure,'A new monster spawned',raidLogDescription,botUser)
        raidLogChannel.send({
            content:`Raid started`,
            embeds:[raidLogMessage]
        })
    } catch (error) {
        console.log(error);
    }
};