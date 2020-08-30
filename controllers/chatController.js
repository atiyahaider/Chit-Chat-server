const Room      = require('../models/room');
const User      = require('../models/user');
const Message   = require('../models/message');
const jwt       = require('jsonwebtoken');
const key       = process.env.SECRET;

module.exports = {
    getChats: async (req, res) => {
        try {
            let { roomId } = req.params ;
            let roomData = await Room.findById(roomId);

            if (!roomData)
                return res.status(404).json({error: 'Room not found.'});

            //get member information
            offline = [];
            roomData.members = await Promise.all(
                roomData.members.map(async (e) => {
                    let user = await User.findOne({email: e}).select('name status');
                    
                    if (user.status !== '') {   //if token exists
                        // Verify the authentication token (check if expired, etc.)
                        await jwt.verify(user.status, key, async (error, decoded) => {
                            if (error) {  //token invalid, clear token from database
                                user = await User.findOneAndUpdate( {email: e}, {status: ''}, { new: true } ).select('name status');
                                offline.push({email: e, name: user.name});
                            }
                            else {
                                user.status = 'online';
                            }
                        })
                    }

                    return {email: e, name: user.name, typing: '', status: user.status};
                }) 
            );            

            res.status(200).json({email: req.email, name: req.name, roomData, offline});

        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    addMessage: async (message) => {
        try {
            //create a new message
            let newMessage = new Message(message);
            let room = await Room.findByIdAndUpdate(message.roomId, { $push: { messages: newMessage } }); 
            if (room.messages.length > 100) //remove the oldest message, to keep messages under 100
                await Room.findByIdAndUpdate(message.roomId, { $pop: { messages: -1 } });
            return newMessage;
        } catch(err)  {
            throw {error: err};
        }
    },

    clearChat: async (roomId) => {
        try {
            await Room.findByIdAndUpdate(roomId, { messages: [] });
        } catch(err)  {
            throw {error: err};
        }
    },

    deleteMessages: async (roomId, messages) => {
        try {
            await Room.findByIdAndUpdate(roomId, 
                { 
                    $pull: { 
                        messages: { _id: {$in: messages} } 
                    } 
                }, { new: true });
        } catch(err)  {
            throw {error: err};
        }
    }
}