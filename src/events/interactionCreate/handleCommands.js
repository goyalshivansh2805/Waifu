const { default: test } = require("node:test");
const { testServer, devs } = require("../../../config.json");
const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const localCommands = getLocalCommands();
  try {
    const commandObject = localCommands.find(
      (cmd) => cmd.name === interaction.commandName
    );

    if(!commandObject) return;

    if(commandObject.devOnly){
        if(!devs.includes(interaction.member.id)){
            interaction.reply({
                content:'Only Developers Can Use This Command!',
                ephemerel:true,
            });
            return;
        };
    }
    if(commandObject.testOnly){
        if(!interaction.guild,id === testServer){
            interaction.reply({
                content:'This Command Cannot Be Ran Here!',
                ephemerel:true,
            });
            return;
        };
    }
    if(commandObject.permissionRequired?.length){
        for(const permission of commandObject.permissionRequired){
            if(!interaction.member.permissions.has(permission)){
                interaction.reply({
                    content:'Not Enough Permission to use this command',
                    ephemerel:true,
                })
                return;
            }
        }
    }
    if(commandObject.botsPermission?.lenght){
        for(const permission of commandObject.botsPermission){
            const bot = interaction.members.me;
            if(!bot.permissions.has(permission)) {
                interaction.reply({
                    content:"I Don't have enough Permission to use this command",
                    ephemerel:true,
                })
                return;
            }
        }
    }

    await commandObject.callback(client,interaction);
  } catch (error) {
    console.log(`Error: ${error}`);
  }
};
