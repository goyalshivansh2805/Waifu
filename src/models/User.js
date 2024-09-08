const {Schema,model} = require('mongoose');

const userSchema  = new Schema(
    {
        userId:{
            type:String,
            required:true,
            unique:true,
        },
        guildName:{
            type:String,
            default:null,
        },
        guildPosition:{
            type:Number,
            default:0,
        },
        raidsParticipated:{
            type:Number,
            default:0,
        },
        totalScore:{
            type:Number,
            default:0,
        },
        elixir:{
            type:Number,
            default:0,
        },
        shard:{
            type:Number,
            default:0,
        },

    }
)

module.exports = model('User', userSchema);