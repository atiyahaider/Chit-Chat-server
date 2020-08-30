const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Message = require('./message');

//Create schema for chatrooms
const RoomSchema = new Schema({
    room: {
        type: String,
        required: true
    },
    admin: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    members: { 
        type: []
    },
    messages: [Message.schema]
});

module.exports = Room = mongoose.model('room', RoomSchema);