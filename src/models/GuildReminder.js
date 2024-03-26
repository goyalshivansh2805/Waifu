const {Schema,model} = require('mongoose');

const guildReminderSchema = new Schema(
    {
        guildName:{
            type:String,
            unique:true
        },
        status:{
            type:String,
            default:"disabled"
        },
        remindTime:{
            type:Number,
            default:60
        },
        noOfPings:{
            type:Number,
            default:0
        }
    }
)


module.exports = model('GuildReminder',guildReminderSchema);