//socketIO 전역변수
var socket;
var selectShape;
var c; //canvas - HTML의 캔버스
var cs; //casvasSVG
var ctx; //canvasContext

var save_src; //dataURL

var tool; //pen or eraser

//var user_id = prompt("사용자 ID를 입력하세요", "default");
//var chamber = prompt("소속된 chamber를 입력하세요", "redpoint");
var chamber = window.location.search.substring(window.location.search.indexOf('chamber=') + 8);
chamber = chamber.split('&')[0];
var user_id = window.location.search.substring(window.location.search.indexOf('userName=') + 9);

if(!chamber){
    console.log("데이터 전달 실패");
    chamber = 'default';
    user_id = 'undefined';
    var user_data = {'chamber': chamber, 'user_id': user_id};
}
else {
    var user_data = {'chamber': chamber, 'user_id': user_id};
    console.log(chamber + " 방 캔버스에" + user_id + "유저 캔버스 세팅 완료.");
}

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
    //console.log("모든 File API가 준비되어있습니다.");
} else {
    alert('The File APIs are not fully supported in this browser.');
}

socket = io.connect('https://' + window.location.host);
socket.emit('joined', user_data);

$(document).ready(function(){
    //jQuery 이용하여 canvas element 객체 얻기

    c = document.getElementById("cv");
    ctx = c.getContext("2d"); //canvas에 그래픽 속성 부여

    resizeCanvas(); //윈도우 사이즈에 맞게 캔버스 크기 변경

    ///////////////////////////////

    //jQuery bind 이용하여 canvas에 마우스 시작,이동,끝 이벤트 핸들러 등록
    $('#cv').bind('mousedown', draw.start);
    $('#cv').bind('mousemove',draw.move);
    $('#cv').bind('mouseup',draw.end);

    //기본 모양 색상 설정
    shape.setShape();

    //clear 버튼에 이벤트 핸들러 등록
    $('#clear').bind('click',draw.clear);

    // //색상 선택 select 설정
    for(var select in color_map){
        $('#pen_color').append('<option value=' + color_map[select].value + '>' +  color_map[select].name + '</option>');
    }
    //색상 선택 select 설정
    for(var i = 2 ; i < 15 ; i++){
        $('#pen_width').append('<option value=' + i + '>' +  i + 'px' + '</option>');
    }
    $('select').bind('change',shape.change);

    window.addEventListener('resize', resizeCanvas, false);
    cPush(); //가장 처음 상태 Push

    /*
    var button = document.getElementById('btn-download');
    button.addEventListener('click', function (e) {
        var now = new Date();
        console.log(now.getYear());
        var date = (now.getYear()-100).toString() + now.getMonth().toString() + now.getDate().toString()+ "-" + now.getHours() + now.getMinutes() + now.getSeconds();
        var dataURL = c.toDataURL('image/png');
        button.href = dataURL;
        button.download = chamber + " " + date + ".png"
    });

    var file = document.querySelector('#getfile');
    var fileURL;
    if(file == null){
        console.log("파일을 받아오지 못했습니다...어쩌다 그런 일이...(흡)");
    }
    file.onclick = function () { // 같은 파일 연속으로 로드해도 가능하도록
        this.value = null;
    };
    file.onchange = function () {
        var fileList = file.files ;
        // 읽기
        var reader = new FileReader();
        reader.readAsDataURL(fileList [0]);
        //console.log(reader.result);

        //로드 한 후
        reader.onload = function  () {
            //console.log(reader.result);
            fileURL = reader.result;
            drawfileonCanvas(fileURL);
            //temptestdragableimg(fileURL);
        };
        console.log(this.value);
    };
    */

    socket.on('SendRecentData', function(){ //방에 가장 오래 있던 유저의 data 전송
        var recentData = save();
        socket.emit('recentData', recentData);
        if(recentData) {
            console.log("첫번째 유저가 데이터 보냄");
        }
    });

    socket.on('getRecentData', function(recentData){ //방에 가장 나중에 들어온 유저는 data 전달 받음
        var img = new Image();
        img.src = recentData;
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        console.log("마지막 유저가 데이터 받음");

    });

    socket.on('linesend_toclient', function (data) { //데이터 전달 받음
        draw.drawfromServer(data);
    });
    socket.on('load_data', function (data) {
        loadfromServer(data);
    });
    socket.on('Undo', function () {
        Undo();
    });
    socket.on('Redo', function () {
        Redo();
    });
});

function resizeCanvas(){
    var temp = save();
    c.width = window.innerWidth;
    c.height = window.innerHeight-32;

    var img = new Image();
    img.src = temp;
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    };
    shape.setShape();
}

function tools(value){
    console.log(value);
    if(value == 'pen'){
        tool = 'pen';
        shape.setShape();
    }
    else{
        tool = 'eraser';
    }
}

function save(){ //단순히 클라이언트가 현재 캔버스의 dataURL을 리턴받는 함수
    save_src = c.toDataURL();
    //console.log(save_src);
    return save_src;
}

var img = new Image();

function load(){
    ctx.clearRect(0, 0, cv.width, cv.height);

    if(save_src == null){
        console.log("저장되어있는 것 없음");
        return;
    }
    var dataURL = save_src;
    img.src = dataURL;
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
    };
    var data = {'chamber':chamber, 'type':"saved", 'dataURL':dataURL};
    socket.emit('load', data); //dataURL 소켓을 통해 전달
}

function drawfileonCanvas(fileURL){
    var dataURL = fileURL;

    var img = new Image();
    var dataURL = fileURL;

    img.onload = function() {
        imageWidth = img.width;
        imageHeight = img.height;

        console.log(imageWidth + " , " + imageHeight);
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
        //console.log(img.width);
    };
    img.src = dataURL;
    var data = {'type':"file", 'dataURL':dataURL};

    //여기 전에 모든 수정을 마치기..!
    socket.emit('load', data); //dataURL 소켓을 통해 전달
}

function temptestdragableimg(fileURL){
    var dataURL = fileURL;

    var img = new Image();
    var dataURL = fileURL;

    var div = document.createElement('div');
    div.id = "image";

    img.onload = function() {
        imageWidth = img.width;
        imageHeight = img.height;

        console.log(imageWidth + " , " + imageHeight);

        //image resizing soon...

        div.backgroundImage = dataURL;
        //console.log(img.width);
    };
    img.src = dataURL;
}

var msg = {
    line : {
        send : function(type,x,y){
            //console.log(type,x,y);
            socket.emit('linesend', {'chamber':chamber, 'type': type , 'x':x , 'y':y , 'color': shape.color , 'width' : shape.width });
        }
    }
}

//색상 배열
var color_map =
    [
        {'value':'white','name':'하얀색'},
        {'value':'red','name':'빨간색'},
        {'value':'orange','name':'주황색'},
        {'value':'yellow','name':'노란색'},
        {'value':'blue','name':'파랑색'},
        {'value':'black','name':'검은색'}
    ];

var shape = {
    //기본 색상,두께 설정
    color : 'white',
    width : 3,
    selectShape : 'line',
    change : function(){
        var color = $('#pen_color option:selected').val();
        var width = $('#pen_width option:selected').val();
        shape.setShape(color,width);
    },

    //변경
    setShape : function(color,width){
        tool = "pen";
        if(color != null)
            this.color = color;
        if(width != null)
            this.width = width;

        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
    }
}
//그리기
var draw = {
    drawing : null,
    start : function(e){
        this.drawing = true;
        if(tool == "pen") {
            ctx.beginPath();
            ctx.moveTo(e.pageX, e.pageY-32);
            msg.line.send('start', e.pageX, e.pageY-32);
        }
        else{
            ctx.clearRect(e.pageX-10, (e.pageY-32)-10, 20, 20);
            msg.line.send('erase', e.pageX, e.pageY-32);
        }
    },
    move : function(e){
        if(this.drawing){
            if(tool == "pen") {
                ctx.lineTo(e.pageX, e.pageY-32);
                ctx.stroke();
                msg.line.send('move', e.pageX, e.pageY-32);
            }
            else{
                ctx.clearRect(e.pageX-10, (e.pageY-32)-10, 20, 20);
                msg.line.send('erase', e.pageX, e.pageY-32);
            }
        }
    },
    end : function(e){
        this.drawing = false;
        msg.line.send('end');
        cPush();
    },
    clear : function(){
        //전체 지우기
        ctx.clearRect(0, 0, cv.width,cv.height);
        shape.setShape();
        msg.line.send('clear');
        cPush();
    },

    //그린 내용 남의 브라우저에도 그려주기
    drawfromServer : function(data){

        if(data.type == 'start'){
            ctx.beginPath();
            ctx.moveTo(data.x,data.y);
            ctx.strokeStyle = data.color;
            ctx.lineWidth = data.width;
        }

        if(data.type == 'move'){
            ctx.lineTo(data.x,data.y);
            ctx.stroke();
        }

        if(data.type == 'end'){
            console.log("서버로부터 그려짐");
            cPush();
        }

        if(data.type == 'clear'){
            ctx.clearRect(0, 0, cv.width,cv.height);
            shape.setShape();
            cPush();
        }

        if(data.type == 'erase'){
            ctx.clearRect(data.x-10, data.y-10, 20, 20);
        }
    }
}

function loadfromServer(data){
    if(data.type == 'saved') { //저장한 것을 불러오는 경우
        ctx.clearRect(0, 0, cv.width, cv.height);
        var img = new Image();
        img.src = data.dataURL;
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
    }
    else if(data.type == 'file'){ //파일을 불러 온 경우
        var img = new Image();

        img.onload = function() {
            ctx.drawImage(img, 50, 50, 300, 300);
            //console.log(img.width);
        };
        img.src = data.dataURL;
    }
}

var cPushArray = new Array();
var cStep = -1;

function cPush() {
    if(cStep>10){ //10개까지만
        cPushArray.splice(0,1);
        cStep--;
    }
    cStep++;
    if (cStep < cPushArray.length) { cPushArray.length = cStep; }
    cPushArray.push(c.toDataURL());
    //console.log(cPushArray[cStep]);
}

function cUndo() { //When click undo
    if (cStep > 0) {
        cStep--;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () {
            ctx.clearRect(0, 0, cv.width,cv.height);
            ctx.drawImage(canvasPic, 0, 0);
        }
    }
    socket.emit('undo', user_data);
}
function cRedo() { //When click redo
    if (cStep < cPushArray.length-1) {
        cStep++;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () { ctx.drawImage(canvasPic, 0, 0); }
    }
    socket.emit('redo', user_data);
}

function Undo(){
    if (cStep > 0) {
        cStep--;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () {
            ctx.clearRect(0, 0, cv.width,cv.height);
            ctx.drawImage(canvasPic, 0, 0);
        }
    }
}

function Redo(){
    if (cStep < cPushArray.length-1) {
        cStep++;
        var canvasPic = new Image();
        canvasPic.src = cPushArray[cStep];
        canvasPic.onload = function () { ctx.drawImage(canvasPic, 0, 0); }
    }
}





