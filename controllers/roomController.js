const Room = require('../models/room');

module.exports = {
    getRooms: async (req, res) => {
        try {
            let { email } = req;
            let userRooms = await Room.find({admin: email}).select('room');
            let rooms = await Room.find({admin: {$ne : email}}).select('room');
            res.status(200).json({email, name: req.name, userRooms, rooms});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    getUserRooms: async (req, res) => {
        try {
            let { email } = req;
            let userRooms = await Room.find({admin: email}).select('room');
            res.status(200).json({email, name: req.name, userRooms});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    createRoom: async (email, roomName) => {
        try {
            roomName = roomName.trim();

            //check if room already exists
            let exists = await Room.findOne({'room': { $regex : new RegExp('^' + roomName + '$', "i") } });            
            if (exists) 
                throw 'A chatroom with this name already exists. Please enter a different room name.';
 
            //create the new room
            let room = new Room();
            room.room = roomName;
            room.admin = email;
  
            //save the room to db   
            await room.save();
            return room;

        } catch(err)  {
            throw {error: err};
        }
    },

    joinRoom: async (req, res) => {
        try {
            let { roomId, email } = req.body;
            await Room.findByIdAndUpdate(roomId, { $addToSet: { members: email }});
            res.status(200).json({success: email + ' joined room successfully'});
        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    updateRoom: async (roomId, roomName) => {
        try {
            roomName = roomName.trim();
            //check if room already exists
            let exists = await Room.findOne({'room': { $regex : new RegExp('^' + roomName + '$', "i") } });            
            if (exists) 
                throw 'A chatroom with this name already exists. Please enter a different room name, or press Cancel to discard changes.';
 
            //save the changes to room name to db   
            await Room.findByIdAndUpdate(roomId, {room: roomName});            
        } catch(err)  {
            throw {error: err};
        }
    },

    deleteRoom: async (roomId) => {
        try {
            await Room.findByIdAndDelete(roomId);
        } catch(err)  {
            throw {error: err};
        }
    }
}