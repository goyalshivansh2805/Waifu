const { Client, Message, EmbedBuilder, version: discordJsVersion } = require('discord.js');
const os = require('os');

module.exports = {
    callback: async (client, message, usedCommandObject) => {
        try {
            // Get information about the bot
            const botUser = await client.users.fetch(client.user.id);
            const botUsername = botUser.username;
            const guildCount = client.guilds.cache.size;

            // Get system information
            const operatingSystem = os.platform();
            const nodeVersion = process.version;
            const discordJsVersion = require('discord.js').version;

            // Get bot uptime
            const uptime = formatUptime(client.uptime);

            // Get memory usage
            const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
            const usedMemory = process.memoryUsage();
            const toMB = bytes => Math.round(bytes / (1024 * 1024) * 100) / 100;
			const { rss, heapTotal, heapUsed } = usedMemory;

            // Get CPU information
            const cpuCores = os.cpus().length;
            const cpuModel = os.cpus()[0].model;

            // Create an embed to display the bot stats
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`**${botUsername}** Statistics`)
                .addFields({name:'Guild Count',value: `${guildCount}`,inline: true},
                           {name:'Uptime',value: uptime,inline: true},
                           {name:'Memory',value: `${toMB(rss)}/512 MB`,inline: true},
                           {name:'Heap Memory',value: `${toMB(heapUsed)}/${toMB(heapTotal)} MB`,inline: true},
                           {name:'Node Version',value: `${nodeVersion}`,inline: true},
                           {name:'DiscordJs Version',value: `${discordJsVersion}`,inline: true},
                           {name:'Operating System',value: `${operatingSystem} `,inline: true},
                           {name:'Cpu Cores',value: `${cpuCores} `,inline: true},
                           {name:'Cpu Model',value: `${cpuModel} `,inline: true},)
                .setTimestamp();

            // Send the embed as a reply
            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in stats command: ${error}`);
        }
    },
    name: 'stats',
    description: 'Displays detailed statistics about the bot.',
    format: '`!stats`',
    arguments: 0,
    alias: ['botinfo'],
    devOnly:true,
    deleted:true,
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}
