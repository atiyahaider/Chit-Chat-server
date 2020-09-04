const Room              = require('../models/room');
const User              = require('../models/user');
const Message           = require('../models/message');
const jwt               = require('jsonwebtoken');
const mongoose          = require('mongoose');
const { getGfsBucket }  = require('../db');
const key               = process.env.SECRET;

module.exports = {
    getChats: async (req, res) => {

        const downloadFile = (gfsBucket, msg) => {
            return new Promise((resolve, reject) => {
                let data = '';
                let download = gfsBucket.openDownloadStream(mongoose.Types.ObjectId(msg.message));
                download.on('data', chunk => {
                    data += chunk;
                })

                download.on('error', err => {
                    console.log('Some error occurred in download of files: ' + err);
                    reject(err);
                })
                
                download.on('end', () => {
                     resolve(data);
                })
            })
        }

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

            //get images/videos if any
            const gfsBucket = getGfsBucket();
            roomData.messages = await Promise.all(
                roomData.messages.map( async (msg) => {
                    if (msg.type.match('image.*') || msg.type.match('video.*')) {
                        try {
                            let data = await downloadFile(gfsBucket, msg);
                            return {_id: msg._id, email: msg.email, name: msg.name, type: msg.type, message: data, date: msg.date}
                        }
                        catch(err) {
                            return {_id: msg._id, email: msg.email, name: msg.name, type: 'txt', message: 'Error encountered in download of file' , date: msg.date}
                        }
                    }
                    else
                        return msg;
                })
            );            

            res.status(200).json({email: req.email, name: req.name, roomData, offline});

        } catch(err)  {
            res.status(500).json({error: err});
        }
    },

    addMessage: async (message) => {
        const saveMessage = async (roomId, msg) => {
            let room = await Room.findByIdAndUpdate(roomId, { $push: { messages: msg } }); 
            if (room.messages.length > 100) //remove the oldest message, to keep messages under 100
                await Room.findByIdAndUpdate(roomId, { $pop: { messages: -1 } });
        }
        
        try {
            //create a new message
            let newMessage = new Message(message);

            let uploadStream;
            if (message.type.match('image.*') || message.type.match('video.*')) {
                const streamifier = require('streamifier');
                
                //Temporary file name to store the video/image file
                let fileName = 'temp.' + message.type.substring(message.type.indexOf('/') + 1);

                const gfsBucket = getGfsBucket();
                if (gfsBucket) {
                    // create a stream from the message(image/video)
                    // pipe the stream after reading 
                    let stream = streamifier.createReadStream(message.message)
                                    .pipe(uploadStream = gfsBucket.openUploadStream(fileName, {metadata: {messageId: newMessage._id}}))
                    stream.on('error', err => {
                        console.log('Error in upload of files: ' + err);
                    })
                    //create a promise to wait for piping to fnish
                    await new Promise(fulfill => stream.on('finish', fulfill));

                    newMessage.message = uploadStream.id;
                    newMessage.type = message.type.match('image.*') ? 'image' : 'video';
                    await saveMessage(message.roomId, newMessage);
                    newMessage.message = message.message;   //Send the image/video back in the message
                    return newMessage;
                } 
                else {
                    console.log('no gfs')
                    throw 'Sorry No Grid FS Object';
                }
            }
            else {
                await saveMessage(message.roomId, newMessage);
                return newMessage;
            }

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

        const deleteUploadFile = (gfsBucket, fileId) => {
            return new Promise((resolve, reject) => {
                gfsBucket.delete(fileId, err => {
                    if (err) {
                        console.log('Error deleting file from Bucket: ' + err);
                        reject(err);
                    }
                    else    
                        resolve();
                })
            })
        }

        try {
            //convert message ids to ObjectId type
            messages = messages.map(msg => mongoose.Types.ObjectId(msg));
            
            //find the messages with type image/video
            let uploads = await Room.aggregate()
                                 .match({_id: mongoose.Types.ObjectId(roomId)})
                                 .unwind('messages')    //unwind the messages array
                                 .match({'messages._id': {$in: messages}, 'messages.type': {$in: ['image', 'video']}})
                                 .project({fileId: '$messages.message', _id: 0})
            
            //delete the image/video files from GridFSBucket
            const gfsBucket = getGfsBucket();
            if (gfsBucket) {
                await Promise.all(
                    uploads.map( async (file) => {
                        try {
                            await deleteUploadFile(gfsBucket, mongoose.Types.ObjectId(file.fileId)) 
                        }
                        catch(err) {
                            //ignore error
                        }
                    })
                )
            }

            //finally, delete messages from the room
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