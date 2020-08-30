const User       = require('../models/user');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const key        = process.env.SECRET;
const saltRounds = Number.parseInt(process.env.SALT_ROUNDS);

module.exports = {
    registerUser: async (req, res) => {
        try {
            let email = req.body.email.trim().toLowerCase();

            //check if user already exists
            let exists = await User.findOne({email});
            if (exists) 
                return res.status(409).json({error: 'This email already exists. Please enter a different email.'});
 
            //register a new user
            let user = new User();
            user.email = email;
            user.name = req.body.name;
  
            //encrypt password
            let hash = await bcrypt.hash(req.body.password, saltRounds);
            user.password = hash;

            //save the user to db   
            await user.save();
            res.status(200).json({success: 'User registered successfully'});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    loginUser: async (req, res) => {
        try {
            let email = req.query.email.trim().toLowerCase();

            //check if user exists
            let user = await User.findOne({email}).select('password name');
            if (!user) 
                return res.status(404).json({error: 'Email address not found. Please try again, or register for a new account.'});
            
            //compare the password to check if they match
            let isAuthorized = await bcrypt.compare(req.query.password, user.password);
            if (!isAuthorized) 
                res.status(401).json({error: 'Incorrect password'});
            else
            {   //create a JWT token
                let token = jwt.sign({id: email}, key, {expiresIn: '1h'}) //expires in an hour
                await User.findOneAndUpdate({email}, {status: token});  //update the status to online
                res.status(200).json({token, name: user.name});
            }
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    logoutUser: async (email) => {
        try {
            await User.findOneAndUpdate({email}, {status: ''});
        } catch(err)  {
            throw {error: err};
        }
    },

    forgotPassword: async (req, res) => {
        try {
            let email = req.body.email.trim().toLowerCase();

            console.log(email)
            //check if user exists
            let exists = await User.findOne({email});
            if (!exists) 
                res.status(404).json({error: 'Email address not found. Please try again, or register for a new account.'});
            else
            {   //create a JWT token
                let token = jwt.sign({id: email}, key, {expiresIn: '1h'}) //expires in an hour
                //set up nodemailer
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_ADDRESS,
                        pass: process.env.EMAIL_PASSWORD,
                    }
                })

                const mailOptions = {
                    from: 'chit-chat@gmail.com',
                    to: email,
                    subject: 'Reset Password for Chit Chat',
                    text: 'You are receiving this email because you (or someone else) have requested to reset the password on your Chit Chat account.\n\n' +
                          'Please click on the link below, or paste it in your browser to reset your password. This link will expire within one hour of receiving it.\n\n' + 
                          'http://localhost:3000/resetPassword/' + token + '\n\n' + 
                          'If you did not request this, please ignore this email and your password will remain unchanged.\n\n'
                }

                //send email
                transporter.sendMail(mailOptions, () => {
                    res.status(200).json({success: 'Email sent successfully'});
                })
            }
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },
 
    getUser: async (req, res) => {
        try {
            let { email, name } = req;
            res.status(200).json({email, name});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    resetPassword: async (req, res) => {
        try {
            //encrypt password
            let hash = await bcrypt.hash(req.body.password, saltRounds);
            //update the password
            await User.findOneAndUpdate({email: req.body.email}, {password: hash});
            res.status(200).json({success: 'Password updated successfully'});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    updateUser: async (email, name) => {
        try {
            await User.findOneAndUpdate({email}, {name});
        } catch(err)  {
            throw {error: err};
        }
    },

    changePassword: async (req, res) => {
        try {
            let { email } = req.body;

            let user = await User.findOne({email}).select('password');
            if (!user) 
                return res.status(404).json({error: 'User not found. Please try again, or register for a new account.'});

            //check if the old password is correct
            let isAuthorized = await bcrypt.compare(req.body.oldPassword, user.password);
            if (!isAuthorized) 
                return res.status(403).json({error: 'The old password is incorrect'});
            
            //encrypt the new password
            let hash = await bcrypt.hash(req.body.newPassword, saltRounds);
            //change the password
            await User.findOneAndUpdate(email, {password: hash});
            res.status(200).json({success: 'Password changed successfully'});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    }
}