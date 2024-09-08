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
        noOfManualPings:{
            type:Number,
            default:0
        },
        noOfAutoPings:{
            type:Number,
            default:0
        },
        channelId:{
            type:String,
            default:null
        }
    }
)


module.exports = model('GuildReminder',guildReminderSchema);