const {message} = require('discord.js');
const prefixs = ['!','?'];

module.exports = (message)=>{
    const messageContent = message.content;
    const messageContentLowered = messageContent.toLowerCase();
    for(const prefix of prefixs){
        if(messageContentLowered.startsWith(prefix)){
            const messageWithoutPrefix = messageContent.slice(prefix.length).trim();
            const loweredMessageWithoutPrefix = messageContentLowered.slice(prefix.length).trim();
            const actualCommandParts = messageWithoutPrefix.split(' ');
            const commandParts = loweredMessageWithoutPrefix.split(' ');
            const commandName = commandParts[0];
            const commandArguments = actualCommandParts.slice(1);
            return {
                commandName : commandName,
                commandArguments:commandArguments,
                prefixUsed:prefix,
            }
            break;
        }

    }
    return {
        commandName:null,
        commandArguments:null,
        prefixUsed:null,
    }
}