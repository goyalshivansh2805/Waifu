const {Client,Message,EmbedBuilder} = require("discord.js");
const {devs} = require("../../config.json");

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
module.exports = async (client,messageOrInteraction,usedCommandObject,err)=>{
    try {
        const sg = devs[0];
        const errorChannelId = "1222559882461315122";
        const errorChannel =  await client.channels.fetch(errorChannelId);
        const botUser =client.user;
        const cmdUsed = usedCommandObject.commandName;
        const cmdArguments = usedCommandObject.commandArguments.join(" ");
        let authorId = null;
        let guildId = messageOrInteraction.guild.id;
        if(messageOrInteraction instanceof Message){
            authorId = messageOrInteraction.author.id;
        }
        else{
            authorId = messageOrInteraction.user.id;
        }
        const description = `Used By : ${authorId} \nGuild : ${guildId}\nCommand Used : ${cmdUsed}\nArguments : ${cmdArguments}\n\n**ERROR**\n\`${err}\``
        const errorMessage = buildEmbed(embedColors.failure,'Error',description,botUser)
        errorChannel.send({
            content:`<@${sg}>`,
            embeds:[errorMessage]
        })
    } catch (error) {
        console.log(error);
    }
}