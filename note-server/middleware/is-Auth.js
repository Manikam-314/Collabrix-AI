
const jwt = require('jsonwebtoken')

module.exports = (req,res,next)=>{
    const authHeader = req.get('Authorization');
    if(!authHeader){
        const error = new Error('Not Authenticated');
        error.statusCode = 401
        throw error;
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try{
        decodedToken = jwt.verify(token,'supersecretesecrete')
    }
    catch(err){
        err.statusCode = 500
        throw err;
    }
    // undefined
    if(!decodedToken){
        const error = new Error('Not Authenticated');
        error.statusCode = 401;
        throw error;     

    }
    // for the user request i am attaching the decoded token with the userId
    req.userId = decodedToken.userId;
    next()
}
