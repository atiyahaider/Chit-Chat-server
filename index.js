require('dotenv').config();     //load .env variables
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const mongoose  = require('mongoose');
const apiRoutes = require('./routes/apiRoutes.js');

const app = express();
app.use( helmet( {
    xssFilter           : true,
    frameguard          : { action: 'sameorigin' },
    dnsPrefetchControl  : { allow: false },
    referrerPolicy      : { policy: 'same-origin' }
  } ) 
 );
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//Routing for API 
app.use('/api', apiRoutes);

app.use((req, res, next) => {
    const error = new Error('Path not found');
    error.status = 404;
    next(error);
});

//error handler middleware 
app.use((error, req, res, next) => {
    res.status(error.status || 500).json({error: error.message || 'Internal Server Error'});
})

//initialize db before starting up the server
const initDb = require('./db').initDb;
initDb( err => {
    if (err) 
        console.log('Error connecting to DB', err.name + ': ' + err.message);
    else {
        //set up server
        const PORT = 8080 || process.env.PORT;
        const server = app.listen(PORT, () => {
            console.log(`Server is listening on port ${PORT}`);
        });
        
        //Socket.io setup
        const io = require('socket.io')(server);
        require ('./socket')(io);
    }
})