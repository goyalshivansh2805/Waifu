const { default: test } = require("node:test");
const { testServer, devs, sofiId ,admins} = require("../../../config.json");
const getLocalCommands = require("../../utils/getLocalCommands");
const prefixRemover = require("../../utils/prefixRemover");
const autoLog = require("../../utils/autolog.js");
const { Message, Client,Collection } = require("discord.js");
const raidTimings = require("../../utils/raidTimings.js");
const pingCmd = require("../../commands/devs/stats.js");
const errorManager = require("../../utils/errorLogs.js")

/**
 *
 * @param {Client} client
 * @param {Message} message
 * @returns
 */
module.exports = async (client, message) => {
  const localCommands = getLocalCommands();
  try {
      if(message.content.includes("<@1147915233202024489>")){
          await pingCmd.callback(client, message);
      }
    if (
      message.author.id === sofiId &&
      message.reference &&
      message.reference.messageId
    ) {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
      if (
        referencedMessage &&
        referencedMessage.content.toLowerCase().startsWith('sgr')
      ) {
          try{
           	raidTimings(client,message);
            autoLog(client, message);   
          }
          catch(error){
              const sg = await client.users.fetch(devs[0]);
              await sg.send({
                  content:`{error}`
              })
          }
        return;
      }
    }
     if(message.author.id === sofiId){
      const mes = message.content;
      //console.log(mes);
      if(!mes.startsWith('<@')) return;

      if(!mes.includes("Could not find any cards matching your selected filter")) return;

      const mention = mes.split(" ")[0];
      let targetUserId = null;
      const match = mention.match(/^<@!?(\d+)>$/);
      if (match) {
          targetUserId = match[1];
      }
      if(!targetUserId) return;
      const chicho = "934379893549060126";
      //if(admins.includes(targetUserId)){}
      if(targetUserId === chicho || devs.includes(targetUserId)){
      try{
        if(message.deletable){
          await message.delete();
        }else{
          message.reply("I am not able to delete this message, check my perms or contact sg.");
        }
      }
      catch(error){
        await errorManager(client,message,"NA",error);
      }
    }
    }
    if(message.author.bot) return;
    const usedCommandObject = prefixRemover(message);
    if (usedCommandObject.commandName === null) return;
    const commandObject = localCommands.find((cmd) => {
      return cmd.name === usedCommandObject.commandName ||
        (cmd.alias && cmd.alias.includes(usedCommandObject.commandName));
    });
    if (!commandObject) return;

    if (commandObject.devOnly) {
      if (!devs.includes(message.member.id)) {
        message.reply({
          content: "Only Developers Can Use This Command!",
        });
        return;
      }
    }
    if (commandObject.testOnly) {
      if (!message.guild.id === testServer) {
        message.reply({
          content: "This Command Cannot Be Ran Here!",
        });
        return;
      }
    }
    if (commandObject.permissionRequired?.length) {
      for (const permission of commandObject.permissionRequired) {
        if (!message.member.permissions.has(permission)) {
          message.reply({
            content: "Not Enough Permission to use this command",
          });
          return;
        }
      }
    }
    if (commandObject.botsPermission?.lenght) {
      for (const permission of commandObject.botsPermission) {
        const bot = message.members.me;
        if (!bot.permissions.has(permission)) {
          message.reply({
            content: "I Don't have enough Permission to use this command",
          });
          return;
        }
      }
    }
    if(commandObject.arguments>usedCommandObject.commandArguments.length){
      message.reply(
        {
          content:`Format - ${commandObject.format}`,
        }
      );
      return;
    }
	const { cooldowns } = message.client;
    if (!cooldowns.has(commandObject.name)) {
      cooldowns.set(commandObject.name, new Collection());
    }
    const now = Date.now();
    const timestamps = cooldowns.get(commandObject.name);
    const defaultCooldownDuration = 5;
    const cooldownAmount = (commandObject.cooldown ?? defaultCooldownDuration) * 1000;
    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
      if (now < expirationTime) {
        const remainingTimeInSeconds = Math.ceil((expirationTime - now) / 1000);
        const expiredTimestamp = Math.round(expirationTime / 1000);
        const interval = expirationTime - now;
        let replyMessage = null;
        replyMessage = await message.reply({ content:  `[\`${commandObject.name}\`] , Try again in **${remainingTimeInSeconds}**s.` });
        setTimeout(async () => {
          if(replyMessage){
            try {
              await replyMessage.delete();
            } catch (error) {
              console.log(error)
            }
    
          }
          }, interval-1000);
        return;
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(async () => {
      timestamps.delete(message.author.id);
      }, cooldownAmount);
    await commandObject.callback(client, message,usedCommandObject);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
};
