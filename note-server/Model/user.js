const moongose = require("mongoose");
const Schema = moongose.Schema


const UserSchema = new Schema({
    name:{
        type:String,
        required: true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true,
    },

},{
    timestamps: true
})

module.exports = moongose.model('User',UserSchema);