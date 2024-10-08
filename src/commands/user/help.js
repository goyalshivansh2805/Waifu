const {EmbedBuilder,InteractionCollector,Message,ApplicationCommandOptionType, Client} = require('discord.js');
const errorManager = require("../../utils/errorLogs");
const helpType = ['user','guild'];

const userCommands = [
    {
        name:'raidcount',
        alias:'rc',
        format:'rc user',
        description:'Shows your raid statistics.',
    },
    {
        name:'viewlogs',
        alias:'vl',
        format:'vl',
        description:'Shows your raid history.',
    },
    {
        name:'globalleaderboard',
        alias:'glb',
        format:'glb type',
        description:'Shows global leaderboard.',
    },
];

const guildCommands = [
    {
        name:'guildcreate',
        alias:'gc',
        format:'gc name',
        description:'Creates a new guild.',
    },
    {
        name:'guilddelete',
        alias:'gd',
        format:'gd',
        description:'Deletes your guild.',
    },
    {
        name:'guildadd',
        alias:'ga',
        format:'ga user',
        description:'Adds a user in your guild.',
    },
    {
        name:'guildremove',
        alias:'gr',
        format:'gr user',
        description:'Removes user from your guild',
    },
    {
        name:'guildpromote',
        alias:'gpu',
        format:'gpu user rank',
        description:'Promotes a user in your guild.',
    },
    {
        name:'guilddemote',
        alias:'gdu',
        format:'gdu user rank',
        description:'Demotes a user in your guild.',
    },
    {
        name:'guildinfo',
        alias:'gi',
        format:'gi',
        description:`Shows your Guild's information.`,
    },
    {
        name:'guildleave',
        alias:'gl',
        format:'gl',
        description:`Leave's your current guild.`,
    },
    {
        name:'leaderboard',
        alias:'lb',
        format:'lb type user',
        description:'Shows your Guild leaderboard.',
    },
    {
        name:'raidstatus',
        alias:'rs',
        format:'rs',
        description:'Shows Raid Status for current raid.',
    },
    {
      name:'raidremind',
        alias:'rr',
        format:'rr',
        description:'Pings all user of guild who didnt raided before a set time.'
    },
    {
        name:'sheet',
        alias:'sh',
        format:'sh',
        description:'Generates a sheet with Players Stats.',
    }
];


const embedColors = {
    success: 0x00ff00,
    failure: 'Red',
    process:'Yellow',
    info:'Blue',
  };

function buildEmbed(color, title, description, authorUser,page) {
    return new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Requested by ${authorUser.displayName} : Page : ${page}`, iconURL: `${authorUser.displayAvatarURL()}` })
      .setTitle(title)
      .setColor(color)
      .setDescription(description);
  } 

module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction  
     */
    callback:async (client , messageOrInteraction , usedCommandObject) => {
        try {
            if(!messageOrInteraction.inGuild()) return;
            let type = 'user'
            let authorId = null;
            let authorUser = null;
            if(messageOrInteraction instanceof Message){
                authorId = messageOrInteraction.author.id;
                authorUser = await client.users.fetch(authorId);
                if(usedCommandObject.commandArguments.length){
                    type = usedCommandObject.commandArguments[0];
                    type = type.toLowerCase();
                    if(!helpType.includes(type)){
                        const notValidHelpTypeEmbed = buildEmbed(embedColors.failure,'Invalid Help Type','Please enter a valid help type or just **!help**.',authorUser);
                        messageOrInteraction.reply({embeds:[notValidHelpTypeEmbed]});
                        return;
                    };
                };
            }else{
                authorId = messageOrInteraction.user.id;
                authorUser = await client.users.fetch(authorId);
                type = await messageOrInteraction.options.get('type').value;
            };

            let pageDescription = '';
            if (type === 'user') {
                for (const userCommand of userCommands) {
                  pageDescription += `• **${userCommand.name}** (${userCommand.alias}): ${userCommand.description}\n    Format: \`${userCommand.format}\`\n\n`;
                }
              } else if (type === 'guild') {
                for (const guildCommand of guildCommands) {
                  pageDescription += `• **${guildCommand.name}** (${guildCommand.alias}): ${guildCommand.description}\n    Format: \`${guildCommand.format}\`\n\n`;
                }
              }
            if(type === 'user'){
                			pageDescription += '> PS : Use `!help guild` for guild related commands'
            };
            const helpEmbed = buildEmbed(embedColors.info,`Waifu - Prefix  **!**  : **${type.toUpperCase()}** Commands`,pageDescription,authorUser,1);
            helpEmbed.setThumbnail(messageOrInteraction.guild.members.me.displayAvatarURL())
            messageOrInteraction.reply({embeds:[helpEmbed]});
        } catch (error) {
            await errorManager(client,messageOrInteraction,usedCommandObject,error);
        }
    },
    name:'help',
    description:'Shows all commands.',
    options:[
        {
            name:'type',
            description:'Which type of commands.',
            type:ApplicationCommandOptionType.String,
            required:true,
            choices:[
                {
                    name:'User',
                    value:'user',
                },
                {
                    name:'Guild',
                    value:'guild',
                },
            ],
        },
    ],
    arguments:0,
    format:'`!help`',
    alias:[],
}