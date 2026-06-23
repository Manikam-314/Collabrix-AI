const User = require("../Model/user");
const bycrpt = require("bcrypt");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken")

exports.SignUp = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  const { name, email, password } = req.body;

  try {
    const hashedPwd = await bycrpt.hash(password, 12);

    const user = new User({
      email,
      password: hashedPwd,
      name,
    });

    const result = await user.save();
    res.status(201).json({
      message: "User created Successfully",
      userId: result._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Something went wrong on the server",
      error: err.message,
    });
  }
};

exports.Login = (req,res,next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadUser;

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const errors = new Error("No email is please enter the correct email");
        errors.statusCode = 401;
        throw errors;
      }

      loadUser = user;
      return bycrpt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong Password");
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign({
        email: loadUser.email,
        userId : loadUser._id.toString()
      },'supersecretesecrete',{expiresIn:'8h'})

      res.status(200).json({token: token, userId: loadUser._id.toString()})

    })
    .catch(err=>{
      if(!err.statusCode){
        err.statusCode = 500
      }
      res.status(err.statusCode).json({ message: err.message || "An error occurred during login." });
    })
};
