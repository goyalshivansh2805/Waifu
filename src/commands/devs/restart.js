const {devs } = require('../../../config.json');
require('dotenv').config();
const {EmbedBuilder} = require('discord.js');
const errorManager = require("../../utils/errorLogs");


const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow'
  };

function buildEmbed(color, title, description, authorUser) {
    return new EmbedBuilder()
      .setTimestamp()
      .setTitle(title)
      .setColor(color)
      .setDescription(description);
  } 


module.exports = {
    callback:async (client , message,usedCommandObject) => {
        if(!devs.includes(message.author.id) ) return message.channel.send("You're not bot the owner! ")

    try {
        const restartMessageEmbed = buildEmbed(embedColors.process,'ATTEMPTING RESTART',"<:Load:1199323337147564182> Attempting a restart...")
        message.channel.send({embeds:[restartMessageEmbed]}).then(msg => {
          //msg.react('🆗');
          setTimeout(function(){
            const successMessageEmbed = buildEmbed(embedColors.success,'Restart Successful',"<:Check:1199323669730697306> I should be back up now!")
             msg.edit({embeds:[successMessageEmbed]});
          }, 10000);
        })
        .then(await client.destroy())
        .then(await client.login(process.env.TOKEN))
          } catch(e) {
            await errorManager(client,message,usedCommandObject,error);

    }
    },
    name:'restart',
    description:'Restarts the bot.',
    arguments:0,
    format:'!restart',
    alias:[],
    deleted:true,
}