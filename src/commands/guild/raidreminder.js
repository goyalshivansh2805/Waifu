const {Client,ModalBuilder,ChannelSelectMenuBuilder,TextInputBuilder,TextInputStyle,Interaction,Message,EmbedBuilder,ApplicationCommandOptionType, embedLength,ButtonBuilder,ButtonStyle,ActionRowBuilder,ComponentType, ChannelType, SelectMenuBuilder, StringSelectMenuBuilder}  = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');
const GuildReminder = require('../../models/GuildReminder');

""
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

function status(reminderStatus){
    if(reminderStatus === "disabled"){
        return "<:toggle_off:1221901480332886140>";
    }
    return "<:toggle_on:1221901449953542144>"
}
module.exports = {
    /**
     * 
     * @param {Client} client 
     * @param {Message} messageOrInteraction 
     */
    callback: async (client , message , usedCommandObject) => {
        try{
            if(!message.inGuild()) return;
            const authorId = message.author.id;
            const authorUser = await client.users.fetch(authorId);
            const authorUserData = await User.findOne({userId:authorId});
            if(!authorUserData || !authorUserData.guildName){
                const messageEmbed = buildEmbed(embedColors.failure,'Process Failed.',`<@${authorId}> is not in any guild.`,authorUser);
                message.reply({
                    embeds:[messageEmbed]
                });
                return;
            }
            const guildName = authorUserData.guildName;
            let raidRemindData = await GuildReminder.findOne({guildName:guildName})

            if(!raidRemindData){
                raidRemindData = new GuildReminder({guildName:guildName});
            }
            let channelId = raidRemindData.channelId;
            let channelMention = `<#${channelId}>`;
            if(!channelId) channelMention = "**NOT SELECTED**";
            const msg = buildEmbed(embedColors.process, `Raid Reminder : ${guildName.toUpperCase()}` , `Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`,authorUser )
            if(authorUserData.guildPosition === 0){
                message.reply({
                    embeds:[msg]
                });
                return;
            }
            const enableButton = new ButtonBuilder()
                .setCustomId('enable-button')
                .setLabel('Enable')
                .setStyle(ButtonStyle.Primary)
            const disableButton = new ButtonBuilder()
                .setCustomId('disable-button')
                .setLabel('Disable')
                .setStyle(ButtonStyle.Primary)
            const changeTimeButton = new ButtonBuilder()
                .setCustomId("change-time-button")
                .setLabel("Change Timer")
                .setStyle(ButtonStyle.Secondary)
            const changeChannelButton = new ButtonBuilder()
            .setCustomId("change-channel-button")
            .setLabel("Channel Id")
            .setStyle(ButtonStyle.Secondary)

            const row = new ActionRowBuilder();
            if(raidRemindData.status === "disabled"){
                row.addComponents(enableButton,changeTimeButton,changeChannelButton);
            }
            else{
                row.addComponents(disableButton,changeTimeButton,changeChannelButton);
            }

            const reply = await message.reply({
                embeds:[msg],
                components:[row]
            });

            const filter = (i) => i.user.id === authorId;

            const buttonCollector = reply.createMessageComponentCollector(
                {
                    componentType:ComponentType.Button,
                    filter,
                    time:30_000,
                }
            );

            
            // let isResponded = false;
            // selectMenuCollector.on("collect",async (interaction)=>{
            //     if(interaction.customId === "channel-select-menu"){
            //         interaction.deferUpdate();
            //         isResponded = true;
            //         let newChannelId = null;
            //         if(!interaction.values.length){
            //             channelMention = "**NOT SELECTED**";
            //         }else{
            //             newChannelId = interaction.values[0];
            //             channelMention = `<#${newChannelId}>`;
            //         }
            //         raidRemindData.channelId = newChannelId;
            //         await raidRemindData.save();
            //         msg.setDescription(`Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`);
            //         await reply.edit({
            //             embeds:[msg],
            //             components:[firstRow,row],
            //         })
            //     }
            // });
            buttonCollector.on("collect", async(interaction)=>{
                if(interaction.customId === "enable-button"){
                    interaction.deferUpdate();
                    isResponded = true;
                    raidRemindData.status = "enabled";
                    row.setComponents(disableButton,changeTimeButton,changeChannelButton);
                    msg.setDescription(`Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`)
                    reply.edit({
                        embeds:[msg],
                        components:[row]
                    })
                    await raidRemindData.save();
                }
                if(interaction.customId === "disable-button"){
                    interaction.deferUpdate();
                    isResponded = true;
                    raidRemindData.status = "disabled";
                    row.setComponents(enableButton,changeTimeButton,changeChannelButton);
                    msg.setDescription(`Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`)
                    reply.edit({
                        embeds:[msg],
                        components:[row]
                    })
                    await raidRemindData.save();
                }
                if(interaction.customId === "change-time-button"){
                    isResponded = true;
                    const modal = new ModalBuilder()
                        .setCustomId(`raidReminderModel-${authorId}`)
                        .setTitle("Guild Raid Reminder")

                    const raidTimer = new TextInputBuilder()
                        .setCustomId("raid-timer")
                        .setLabel("Input time (min) before raid ends to ping.")
                        .setStyle(TextInputStyle.Short)
                    const actionRow = new ActionRowBuilder().addComponents(raidTimer);

                    modal.addComponents(actionRow);
                    await interaction.showModal(modal);

                    const filterForTimer = (interaction) => interaction.customId === `raidReminderModel-${authorId}`;
                    interaction.awaitModalSubmit({filter:filterForTimer , time:30_000})
                        .then(async (modalInteraction)=>{
                            const newTimer  = modalInteraction.fields.getTextInputValue("raid-timer");
                            if(isNaN(newTimer) || newTimer<10 || newTimer>150){
                                modalInteraction.reply({
                                    content:"Please enter valid time.",
                                    ephemeral:true
                                })
                                return;
                            }
                            modalInteraction.deferUpdate();
                            raidRemindData.remindTime = newTimer;
                            msg.setDescription(`Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`)
                            reply.edit({
                                embeds:[msg],
                                components:[row]
                            })
                            await raidRemindData.save();
                        })
                        .catch((err)=>{
                            console.log(err)
                        })
                }
                if(interaction.customId === "change-channel-button"){
                    isResponded = true;
                    const modal = new ModalBuilder()
                        .setCustomId(`raidReminderModelChannel-${authorId}`)
                        .setTitle("Guild Raid Reminder")

                    const changeChannel = new TextInputBuilder()
                        .setCustomId("channel-id")
                        .setLabel("Input the Channel Id.")
                        .setStyle(TextInputStyle.Short)
                    const actionRow = new ActionRowBuilder().addComponents(changeChannel);

                    modal.addComponents(actionRow);
                    await interaction.showModal(modal);
                    const filterForChannel = (interaction) => interaction.customId === `raidReminderModelChannel-${authorId}`;
                    interaction.awaitModalSubmit({filter:filterForChannel , time:30_000})
                        .then(async (modalInteraction)=>{
                            const newChannelId  = modalInteraction.fields.getTextInputValue("channel-id");
                            const channel =  client.channels.resolve(newChannelId);
                            if(!channel || channel.guildId !== message.guildId) {
                                await modalInteraction.reply({
                                    content:"Invalid Channel Id.",
                                    ephemeral:true});
                                return;
                            }
                            else{

                                channelMention = `<#${newChannelId}>`;
                                modalInteraction.deferUpdate();
                               
                                raidRemindData.channelId = newChannelId;
                                await raidRemindData.save();
                                msg.setDescription(`Reminder : ${status(raidRemindData.status)}\nRemind Before : ${raidRemindData.remindTime} Minutes\nChannel : ${channelMention}`);
                                await reply.edit({
                                    embeds:[msg],
                                    components:[row],
                                })
                            }
                        })
                        .catch((err)=>{
                            console.log(err)
                        })
                    
                }
            });

            buttonCollector.on("end" ,()=>{
                
                reply.edit({
                    embeds:[msg],
                    components:[]
                });
                
                return;
            });



            
        }
        catch (error){
            console.log(error);
        }
    },
    name:'raidreminder',
    description:'Reminds the players to raid.',
    alias:['rr'],
    arguments:0,
    deleted:true,
    format:'`!raidreminder`',
}