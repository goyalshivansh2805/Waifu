const { default: test } = require("node:test");
const { testServer, devs, sofiId } = require("../../../config.json");
const getLocalCommands = require("../../utils/getLocalCommands");
const prefixRemover = require("../../utils/prefixRemover");
const autoLog = require("../../utils/autolog.js");
const { Message, Client } = require("discord.js");

/**
 *
 * @param {Client} client
 * @param {Message} message
 * @returns
 */
module.exports = async (client, message) => {
  const localCommands = getLocalCommands();
  try {
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
        ['smr', 'sgr'].includes(referencedMessage.content.toLowerCase())
      ) {
        autoLog(client, message);
        return;
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

    await commandObject.callback(client, message,usedCommandObject);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
};
