var express = require('express');
var http = require('http');
var fs = require('fs');
var app = express();

//app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

app.get('/',function (req,res) {
});

var port = 3001;
app.set('port', port);

var server = http.createServer(app);
server = server.listen(process.env.PORT || port, function () {
    console.log('Canvas Server Start! http://localhost:3001');
});


var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
    //console.log("유저 입장");
    var user_data;
    var user_list = []; //유저별 socket ID list

    socket.on('joined', function(joined_data){
        user_data = joined_data;
        socket.join(user_data.chamber); //소속된 챔버에 조인

        user_list = Object.keys(io.sockets.adapter.rooms[user_data.chamber].sockets);
        console.log("첫 번째 유저 : " + user_list[0] + ", 마지막 유저 : " + user_list[user_list.length-1]);

        if(user_list.length > 1){ //첫번째 유저에게 신호 전달
            io.sockets.connected[user_list[0]].emit('SendRecentData');
        }
        //console.log(user_data.user_id + "유저가 "+ user_data.chamber + "방에 입장했습니다.");
    });

    socket.on('recentData', function(recentData){ //마지막 유저에게 데이터 전달
        user_list = Object.keys(io.sockets.adapter.rooms[user_data.chamber].sockets);
        io.sockets.connected[user_list[user_list.length-1]].emit('getRecentData', recentData);
    });

    socket.on('linesend', function (data) {
        //console.log(data);
        socket.broadcast.to(data.chamber).emit('linesend_toclient',data);
    });

    socket.on('load',  function (data) {
        socket.broadcast.to(data.chamber).emit('load_data',data);
        //console.log("소켓 전달");
    });

    socket.on('undo',  function (data) {
        socket.broadcast.to(data.chamber).emit('Undo');
        //console.log("실행 취소");
    });

    socket.on('redo',  function (data) {
        socket.broadcast.to(data.chamber).emit('Redo');
        //console.log("재실행");
    });

    socket.on('disconnect', function () {

    });
});
