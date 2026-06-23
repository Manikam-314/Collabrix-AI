const express = require("express");
const router = express.Router();
const {body} = require("express-validator");

const authController = require("../controller/auth");
const User = require("../Model/user")


router.post("/SignUp",[
    body("email")
      .isEmail()
      .withMessage("Please Enter Valid email")
      .custom((value)=>{
        return User.findOne({email:value}).then(userDoc=>{
            if(userDoc){
                return Promise.reject("Email Already Exist")
            }
        })
      })
      .normalizeEmail(),

    body('password')
     .trim()
     .isLength({min: 6})
     .withMessage('Password must be atleast 6 character'),
    body('name')
      .trim()
      .not()
      .isEmpty()
      .withMessage('Must not to be empty')
], authController.SignUp)

router.post('/Login', authController.Login)

module.exports = router