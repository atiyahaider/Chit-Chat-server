const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create schema for chats
const MessageSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        default: 'txt'
    },
    fileId: Schema.Types.ObjectId,
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = Message = mongoose.model('message', MessageSchema);