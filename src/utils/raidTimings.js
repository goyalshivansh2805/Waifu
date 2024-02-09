const Raid = require('../models/Raid');
const {Message,Client} =  require('discord.js');

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
                    const raidEndTiming = title.match(/\<t\:(\d+)\:R\>/);
                    if(!raidEndTiming) return;
                    raidEndTimestamp = parseInt(raidEndTiming[1],10);
                    resolve();
                },3000);
            });
        };

        const embeds = message.embeds;
        if(embeds.length===0) return;
        const embed = embeds[0];
        let title = embed.title;
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
    } catch (error) {
        console.log(error);
    }
};