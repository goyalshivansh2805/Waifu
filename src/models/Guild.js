const {Schema,model} = require('mongoose');

const guildSchema = new Schema(
    {
        guildName:{
            type:String,
            unique:true,
        },
        ownerId:{
            type:String,
            required:true,
        },
        totalMembers:{
            type:Number,
        },
    }, 
    {
        timestamps: { timeZone: 'Asia/Kolkata' }
    }
)

module.exports = model('Guild',guildSchema);