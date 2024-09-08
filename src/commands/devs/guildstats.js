const {Message,Client,EmbedBuilder} = require('discord.js');
const User = require('../../models/User');
const Log = require('../../models/Log');
const errorManager = require("../../utils/errorLogs");
const Guild = require('../../models/Guild');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} message
     */
    callback:async (client,message,usedCommandObject)=>{
        try {
            const botUser = await client.users.fetch(client.user.id);
            const botUsername = botUser.username;
            const guildCreated = await Guild.countDocuments();
            const raidsLogged = await Log.countDocuments();
            const usersRegistered = await User.countDocuments();
            const stats = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`**${botUsername}** Guild Stats`)
                .addFields({name:`> Guilds Created: ${guildCreated}`,value:' ',inline:false},
                           {name:`> Users Registered: ${usersRegistered}`,value:' ',inline:false},
                           {name:`> Raids Logged: ${raidsLogged}`,value:` `,inline:false},)
                .setFooter({text:`Requested by ${message.author.displayName}`,iconURL:message.author.displayAvatarURL()})
                .setTimestamp();
            message.reply({embeds:[stats]});
        } catch (error) {
            await errorManager(client,message,usedCommandObject,error);
        }
    },
    name:'guildstats',
    description:'Shows guild stats.',
    deleted:true,
    devOnly:true,
    arguments:0,
    alias:['gs'],
}