const mongoose = require('mongoose');
const express = require('express');
const app = express();
//const gridFS = require('gridfs-stream');

let conn;
//let gfs;

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
        
        // Init gfs
        // conn.once('open', () => {
        //   // Init stream
        //   gfs = gridFS(conn.db, mongoose.mongo);
        //   gfs.collection('uploads');
        // });
        
        return callback(null, conn);
    },

    // getGfs: () => {
    //     return gfs;
    // }
}