const {Client,Message} = require('discord.js');
const errorManager = require("../../utils/errorLogs");


module.exports = {
    callback:async (client,message,usedCommandObject)=>{
        try {
            message.channel.send('Loading data').then (async (msg) =>{
                msg.delete()
                message.channel.send(`🏓Latency is ${msg.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
              })
        } catch (error) {
            await errorManager(client,message,usedCommandObject,error);
        }
    },
    name:"ping",
    description:"Shows ping",
    format:"`!ping`",
    deleted:true,
    arguments:0,
    alias:["pg"]
}