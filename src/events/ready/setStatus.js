const { ActivityType} = require('discord.js');

let status = [
    {
        name:'!help or /help',
        type:ActivityType.Listening,
    },
    {
        name:'dominatorsg',
        type:ActivityType.Watching,
    },
    {
        name:'Nekotsuki',
        type:ActivityType.Streaming,
    }
]

module.exports = async (client)=> {
    setInterval(() => {
        let random = Math.floor(Math.random() * status.length);
        client.user.setActivity(status[random]);
    }, 10000);
}