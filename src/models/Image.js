const {Schema,model}  = require('mongoose');

const imageSchema  = new Schema(
    {
        userId:{
            type:String,
            required:true,
            unique:true,
        },
        imageURL:{
            type:String,
            default:"https://media1.tenor.com/m/mJ_Og97j5WwAAAAC/chipi-chapa.gif",
        },
    },
);

module.exports = new model('Image',imageSchema);