const User   = require('../models/user');
const jwt    = require('jsonwebtoken');
const key    = process.env.SECRET;

module.exports = {
    isAuthenticated: async (req, res, next) => {
        // Require the token from the authorization header:
        let token = req.header('authorization');
        
        //if no header was sent
        if (!token) 
            return res.status(401).json({error: 'Authorization error, please login'});   // 401 - Unauthorized

        token = token.replace('Bearer', '').trim();
        //if token null
        if (!token) 
            return res.status(401).json({error: 'Authorization error, please login'});   // 401 - Unauthorized

        let decodedToken;
        try {
            // Verify the authentication token (check if expired, etc.)
            decodedToken = jwt.verify(token, key);
        } catch(err) {
            return res.status(401).json({error: 'Authorization error: Session expired. Please login again'});
        }
            
        try {
            let user = await User.findOne({'email': decodedToken.id})
            if (!user) 
                return res.status(404).json({error: 'User not found'});
            
            req.email = res.email = user.email;
            req.name = res.name = user.name;
            next();

        } catch(err) {
            res.status(500).json({error: err});       
        }
    }
}