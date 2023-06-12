const {Router} = require("express");

const bcrypt = require("bcrypt");
const {UserModel} = require("../model/user.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Redis = require("ioredis");

const redis = new Redis();

const userRouter = Router();

userRouter.post("/register", async(req,res) =>{
    const {pass, email} = req.body;
    try {
        const user = await UserModel.findOne({email:email});
        if(user){
            res.status(200).send({"msg" : "user already exist!!"});
        }
        else{
            bcrypt.hash(pass,5,async(err,hash)=>{
                if(hash){
                   
                    const newuser = new UserModel({...req.body, pass:hash})

                    await newuser.save();
                    res.status(200).send({"msg": "New user registered susscefully"})
                }
                else{
                    res.status(200).send({"msg":err})
                }
            })
        }
    } catch (err) {
        res.status(400).send({"msg":err})
    }
})

userRouter.post("/login", async (req, res) =>{
    const {email, pass} = req.body;

    try {
        let user = await UserModel.findOne({email:email});

        if(user){
            bcrypt.compare(pass, user.pass, (err, result) =>{
                if(result){
                    const token = jwt.sign({userID:user["_id"]}, process.env.secreate_key,{expiresIn:"30m"})

                    const refreshtoken = jwt.sign({userID:user["_id"]}, process.env.secreate_key,{expiresIn:"7d"})

                    redis.set(token, user._id, "EX", 30*60)
                    res.status(200).send({"msg":"login susscefully","token": token, "refreshtoken": refreshtoken});
                }
                else{
                    res.status(200).send({"msg":"wrong pass"});
                }
            })
        }
        else{
            res.status(400).send({"msg": "wrong credentials"})
        }
    } catch (error) {
        res.send({"msg": error})
    }
})

userRouter.post("/refresh", async(req,res) =>{
    try {
        const refreshtoken = req.header.authorization
const decode = jwt.verify(refreshtoken, process.env.secreate_key);

let user = await UserModel.findOne({_id:decode.userID});
if(!user){
    return res.status(500).send({"msg":"server eror"});
}
const token = jwt.sign({userID:user["_id"]},process.env.secreate_key, {expiresIn:"30m"} );
res.status(200).send({"token":token});

    } catch (error) {
        res.send(error.message)
    }
})

// userRouter.get("/logout", async(res,res) =>{

// })


module.exports = {userRouter}