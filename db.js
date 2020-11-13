const mongoose = require('mongoose');

let conn;
let gfsBucket;

module.exports = {
    initDb: (callback) => {
        if (conn) {
            console.warn("Trying to init DB again!");
            return callback(null, conn);
        }

        const URI = process.env.MONGODB_URI;
        // Connect to the database
        mongoose.connect(URI, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false })
                .catch(err => console.log('MongoDB connection error:' + err));          //catch errors during initial connection
        mongoose.Promise = global.Promise;  
        
        conn = mongoose.connection;      
        conn.on('error', err => {console.log('MongoDB error:' + err)});  //check for errors after initial connection
        
        //Init gfs Bucket
        conn.once('open', () => {
            gfsBucket = new mongoose.mongo.GridFSBucket(conn.db,{
                bucketName:'uploads'
            });          
        });
        
        return callback(null, conn);
    },

    getGfsBucket: () => {
        return gfsBucket;
    }
}

// mongodb://chitchatadmin:Chit1Chat2@ds057234.mlab.com:57234/chitchat