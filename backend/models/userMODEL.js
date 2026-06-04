import mongoose from "mongoose";

const userSchema  = new mongoose.Schema({
    name:{type:String, requried:true},
    email:{type:String, requried:true, unique:true},
    avatar:String,
    credits:{type:Number , default:100 , min:0},
    plan:{type:String, enum:["free","pro","enterprise"], default:"free"}
},{timestamps:true})

export const User = mongoose.model("User", userSchema)
