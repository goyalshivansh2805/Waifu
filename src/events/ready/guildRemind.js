const {devs} = require("../../../config.json");
const Guild = require('../../models/Guild');
const Raid = require('../../models/Raid');
const RaidDetails = require('../../utils/raidedAndRemaining');
const GuildReminder = require('../../models/GuildReminder');

module.exports = async (client)=>{
    setInterval(async ()=>{
        try{

            const guilds = await Guild.find();
            const currentRaid = await Raid.findOne().sort({ createdAt: -1 });
            if(!currentRaid) {
                message.reply('Please do sgr once or contact sg');
                return;
            };
            const endingTimestamp = currentRaid.endingTimestamp;
            const currentTimeSeconds = Math.floor(new Date().getTime() / 1000);
            const timeDif = endingTimestamp-currentTimeSeconds;
            const resetTimer = 170*60;
            guilds.forEach(async (guild)=>{
                const guildData = await GuildReminder.findOne({guildName:guild.guildName});
                if(!guildData || guildData.status === "disabled" || !guildData.channelId) return;
                if(timeDif>resetTimer && (guildData.noOfAutoPings !== 0 || guildData.noOfManualPings !==0)){
                    guildData.noOfAutoPings = 0;
                    guildData.noOfManualPings = 0;
                    await guildData.save();
                    return;
                }
                if(guildData.noOfAutoPings !== 0){
                    return;
                }
                const timer = (guildData.remindTime)*60;
                if(timeDif<=timer && timeDif>0){
                    const botUser = client.user;
                    const details = await RaidDetails(guild.guildName,botUser);
                    const remainingRaiders = details[0];
                    if(!remainingRaiders.length) return;
                    let raidPingMessage = '';
                    guildData.noOfAutoPings +=1;
                    await guildData.save();
                    for(const remainingRaider of remainingRaiders){
                        raidPingMessage += `• <@${remainingRaider}>\n`
                    };
                    raidPingMessage += '\n Please Do Raid As Soon As Possible.\n||If Done , Do `sgr` Once||';
                    const channelId = guildData.channelId;
                    try{
                        const channel = await client.channels.fetch(channelId);
                        channel.send(raidPingMessage);
                    }catch(err){
                        console.log(err)
                    }
                }
            })
        }catch(err){
            console.log(err)
        }
    },60_000)
}