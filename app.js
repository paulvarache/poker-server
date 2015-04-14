var http = require('http');

var server = http.createServer(function (req, res) {
    res.end("", 200);
});

var io = require('socket.io')(server);

var connected = {};
var watcher = null;
var turnEnded = false;

function resetTurn() {
    for (var id in connected) {
        if (!connected[id].reset) return;
        console.log('RESET');
    }
    for (var id in connected) {
        connected[id].choice = null;
        connected[id].reset = null;
    }
    turnEnded = false;
    io.emit('poker:reset', connected);
}

function showTurn() {
    for (var id in connected) {
        if (!connected[id].choice) {
            console.log(connected[id].username + " has not choosen");
            return;
        }
    }
    console.log('Turn ended');
    turnEnded = true;
    io.emit('poker:show', connected);
}

io.on('connection', function (socket) {

    // If self declared as watcher, remove from connected
    socket.on('poker:watcher', function () {
        console.log('Watcher joined');
        if (!watcher) {
            watcher = socket;
            watcher.emit('poker:watcher:init', { users: connected, turnEnded: turnEnded });
            watcher.on('disconnect', function () {
                watcher = null;
            });
        }
    });

    socket.on('poker:user', function (data) {
        console.log('User joined: ' + data.username);
        var user = new Object();
        user.id = socket.id;
        user.picture = data.picture;
        user.username = data.username;
        connected[socket.id] = user;
        socket.emit('poker:user:init', { users: connected, turnEnded: turnEnded });
        io.emit('poker:user', connected[socket.id]);
    });

    socket.on('poker:choice', function (data) {
        console.log("User " + connected[socket.id].username + " chose " + data.choice);
        connected[socket.id].choice = data.choice;
        io.emit('poker:choice', socket.id);
        showTurn();
    });

    socket.on('poker:reset', function () {
        connected[socket.id].reset = true;
        resetTurn();
    });

    socket.on('poker:cancel', function () {
        console.log("User " + connected[socket.id].username + " cancelled his/her choice");
        connected[socket.id].choice = null;
        io.emit('poker:cancelled', socket.id);
    });

    socket.on('disconnect', function () {
        if (watcher === socket.id) {
            console.log("Watcher disconnected");
            watcher = null;
            return;
        }
        console.log('User disconnected: ' + JSON.stringify(connected[socket.id]));
        delete connected[socket.id];
        io.emit('poker:user:disconnected', socket.id);
        resetTurn();
        showTurn();
    });

    socket.on('error', function (err) {
        console.error(err);
    });
});

server.listen(3000, function () {
    console.log("Server listenning");
});

GLOBAL.config = require('./config/local.json');


