const jwt       = require('jsonwebtoken');
const Message = require('./models/message');
const { logoutUser, updateUser } = require('./controllers/userController.js');
const { addMessage, clearChat, deleteMessages } = require('./controllers/chatController');
const { createRoom, updateRoom, deleteRoom } = require('./controllers/roomController');

module.exports = (io) => {
    io.on('connection', socket => {
        console.log('a user connected'); 
    
        //middleware to check for token validation after connection, on every event
        socket.use((packet, next) => {
            if (packet[0] !== 'logout') {
                if (socket.handshake.query && socket.handshake.query.token) {
                    jwt.verify(socket.handshake.query.token, process.env.SECRET, (err, decoded) => {
                        if (err) {
                            console.log('Packet: Invalid token')
                            return next(new Error('Authentication error. Please login'));
                        }
                        socket.userId = decoded.id;
                        console.log('valid user: ' + decoded.id)
                        next();
                    });
                }
                else 
                    next(new Error('Authentication error. Please login'));
            }
            else 
                next();
        })
    
        //then the rest of the events ...
        socket.on('login', (email, name) => {
            //emit the logged in status to all other clients
            socket.broadcast.emit('loginMember', email, name);
        });
    
        socket.on('joinRoom', (roomId, email, name) => {
            socket.join(roomId);

            //emit the new member to all other clients in the room
            socket.to(roomId).emit('setMember', email, name);
            
            //emit joining msg to all other clients in the room
            let msg = new Message();
            msg.email = '';
            msg.name = 'admin';
            msg.message = name + ' just joined in';
            socket.to(roomId).emit('showNewMessage', msg);
    
            //send welcome msg to member joining
            msg.message = 'Welcome ' + name + '!';
            socket.emit('showNewMessage', msg);
        });
    
        socket.on('leaveRoom', (roomId, name, callback) => {
            socket.leave(roomId);
        
            //emit leaving msg to all other clients in the room
            let msg = new Message();
            msg.email = '';
            msg.name = 'admin';
            msg.message = name + ' has left the room';
            socket.to(roomId).emit('showNewMessage', msg);
            return callback(null);
        });
    
        socket.on('typing', (roomId, email, name) => {
            //emit typing status to all other clients in the room
            socket.to(roomId).emit('typing', email, name);
        });

        socket.on('stopTyping', (roomId, email, name) => {
            //emit stop typing status to all other clients in the room
            socket.to(roomId).emit('stopTyping', email, name);
        });

        socket.on('newMessage', (msg, callback) => {
            //store the new msg in db
            addMessage(msg)
            .then((newMessage) => {
                //emit message to all clients in the room
                io.to(msg.roomId).emit('showNewMessage', newMessage);
                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });
    
        socket.on('clearChat', (roomId, callback) => {
            io.in(roomId).clients((error, client) => {
                //if more than one client connected
                if (client.length > 1)
                    return callback('This room is currently in use. Chat cannot be cleared at this time. Although individual messages can be deleted.');
                //if one client connected and its not the one requesting
                else if (client.length === 1 && client[0] !== socket.id)
                    return callback('This room is currently in use. Chat cannot be cleared at this time. Although individual messages can be deleted.');    
                else {
                    //clear all messages from db
                    clearChat(roomId)
                    .then(() => {
                        return callback(null);
                    })
                    .catch(err => {
                        return callback(err.error);
                    })
                }
            })
        });

        socket.on('deleteMessages', (roomId, messages, callback) => {
            //delete messages from db
            deleteMessages(roomId, messages)
            .then(() => {
                //emit deleted messages to all clients in the room
                io.to(roomId).emit('deleteMessages', messages);
                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });

        socket.on('addRoom', (roomName, callback) => {
            //add the room in db
            createRoom(socket.userId, roomName)
            .then((room) => {
                //emit new room to this client
                socket.emit('userRoomAdded', room);

                //emit new room to all other clients
                socket.broadcast.emit('roomAdded', room);
                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });

        socket.on('updateRoomName', (roomId, name, callback) => {
            //update the profile in db
            updateRoom(roomId, name)
            .then(() => {
                //emit room name change to all clients
                io.emit('roomNameChange', roomId, name);

                //emit room name change to all clients in that room
                let msg = new Message();
                msg.email = '';
                msg.name = 'admin';
                msg.message = 'Room name changed to "' + name + '"';
                io.in(roomId).emit('showNewMessage', msg);

                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });

        socket.on('deleteRoom', (roomId, callback) => {
            io.in(roomId).clients((error, client) => {
                if (client.length > 0)
                    return callback('This room is currently in use. Cannot delete at this time.');
                else {
                    //delete the room in db
                    deleteRoom(roomId)
                    .then(() => {
                        //emit deleted room to this client
                        socket.emit('userRoomDeleted', roomId);

                        //emit deleted room to all other clients
                        socket.broadcast.emit('roomDeleted', roomId);
                        return callback(null);
                    })
                    .catch(err => {
                        return callback(err.error);
                    })
                }
            })
        });

        socket.on('updateProfile', (email, name, callback) => {
            //update the profile in db
            updateUser(email, name)
            .then(() => {
                //emit profile change to all clients
                socket.broadcast.emit('setMember', email, name);
                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });

        socket.on('logout', (roomId, email, name, callback) => {
            //mark logout status in db
            logoutUser(email)
            .then(() => {
                if (roomId !== '') {
                    socket.leave(roomId);
        
                    //emit logged out msg to all other clients in the room
                    let msg = new Message();
                    msg.email = '';
                    msg.name = 'admin';
                    msg.message = name + ' has logged out';
                    socket.to(roomId).emit('showNewMessage', msg);
                }

                //emit the logged out status to all other clients
                socket.broadcast.emit('logoutMember', email, name);

                return callback(null);
            })
            .catch(err => {
                return callback(err.error);
            })
        });
    
        socket.on('offline', offline => {
            offline.forEach(client => {
                //emit the logged out status to all other clients
                socket.broadcast.emit('logoutMember', client.email, client.name);
            })
        });

        socket.on('disconnect', () => {
            console.log('user disconnected: ' + socket.userId);
        });
    });
}