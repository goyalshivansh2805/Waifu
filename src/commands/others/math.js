const {Client,Message} = require('discord.js');

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     */
    callback:async (client, message)=>{
        try {
            if(!message.inGuild()) return;
            const args = message.content.split(' ').slice(1).join(' ');
            
            if (!args) {
                message.reply('Please provide a mathematical expression.');
                return;
            }

            let result = null;
            try {
                result = eval(args);
            } catch (evalError) {
                throw new Error('Invalid mathematical expression.');
            }

            if (typeof result === 'number') {
                message.reply(`The result is: ${result}`);
            } else {
                message.reply('Invalid mathematical expression.');
            } 
        } catch (error) {
            message.reply(error.message);
        }

    },
    name:'math',
    description:'Evaluates a mathematical expression.',
    deleted:true,
    format:'`!math expression`',
    alias:[],
    arguments:0,
}