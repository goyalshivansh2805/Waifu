const {Schema,model} = require('mongoose');
const {DateTime} = require('luxon');

const logSchema = new Schema(
    {
        userId:{
            type:String,
            required:true
        },
        score:{
            type:Number,
            default:0,
        },
        move:{
            type:Number,
            default:0,
        },
        damage:{
            type:Number,
            default:0,
        },
        addedby:{
            type:String,
            required:true,
        }
    }, {
        timestamps: { timeZone: 'Asia/Kolkata' }
    }
)

module.exports = model('Log',logSchema);