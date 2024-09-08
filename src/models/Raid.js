const {model,Schema} = require('mongoose');

const raidSchema = new Schema(
    {
        startingTimestamp:{
            type:Number,
            default:null,
        },
        endingTimestamp:{
            type:Number,
            default:null,
        },
    },
    {
        timestamps: { timeZone: 'Asia/Kolkata' }
    }
);

module.exports = model('Raid',raidSchema);