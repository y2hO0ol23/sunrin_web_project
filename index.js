const express = require('express');
const mysql = require('mysql');
const http = require('http');
const path = require('path');
const fs = require('fs');
const dbconfig = require('./config/dbconfig.json');
const app = express();
const bodyParser = require('body-parser');

const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser');
const crypto = require('crypto');const e = require('express');

//false:노드의 querystring 모듈을 사용하여 쿼리스트링 해석
app.use(bodyParser.urlencoded({extended:false})); 

//json 타입으로 파싱하도록 설정
app.use(bodyParser.json());

//app.use('요청경로', express.static('실제경로'));
app.use('/',express.static(path.join(__dirname, '/css')));
app.set('port',8080);

//데이터 활용하기 위해 뷰엔진 사용
//https://yahohococo.tistory.com/43 참고
app.set('views',__dirname+'/views');
app.set('view engine','ejs');

const key = '!$#%^H#%$^#$RE#@#^UY'

function encrypt(value){
    return crypto.createHmac('sha256', key).update(value).digest('hex');
}

//세션 설정
app.use(session({
    secret : key,
    resave : false,
    saveUninitialized : false,
    cookie: {
        httpOnly : true,
        secure : true
    }
}));

// DB 연결
const connection = mysql.createConnection({
    host: dbconfig.host,
    user: dbconfig.user,
    password: dbconfig.password,
    database: dbconfig.database
});
connection.connect();

// 문제 풀이 상황 가져오기
const stateFile = './prob/STATE'
var state = {}
fs.open(stateFile,'a+',function(err,fd){
	if(err) throw err;
	if(fd == '9'){
		console.log('file create.');
	}else{
		fs.readFile(stateFile, 'utf8', function(err, data) {
            idx = 0
            data += '\n'
            while(idx < data.length){
                prob = ""
                while(data[idx] != ' ' && data[idx] != '\n' && data[idx] != '\r') prob += data[idx++];
                state[prob] = [];

                while(idx < data.length && (data[idx] == ' ' || data[idx] == '\n' || data[idx] == '\r')) idx ++
                if (idx >= data.length) break;

                while(true){
                    buf = ""
                    while(data[idx] != ' ' && data[idx] != '\n' && data[idx] != '\r') buf += data[idx++];
                    state[prob].push(buf)

                    var f = 0
                    while(idx < data.length && (data[idx] == ' ' || data[idx] == '\n' || data[idx] == '\r'))
                        if(data[idx++] == '\n') f = 1;
                        
                    if (idx >= data.length || f) break;
                }
            }
            console.log(state)
		});
	}
});

//메인페이지
app.get('/',(req,res)=>{
    //로그인이 되어있다면 세션값을 보내 인식할 수 있도록
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id],(err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.render('main',{
                    login: false
                });
            }
            else {
                res.render('main', {
                    login : true,
                    name : result[0].userName
                });
            }
        });
    }
    else{
        res.render('main',{
            login: false
        });
    }
});

function inrange(target, st, ed) {
    if (ed == undefined) return st <= target;
    return st <= target && target <= ed;
}

//가입 페이지
app.get('/register', (req, res)=>{
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id],(err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.render('register',{
                    error: ''
                });
            }
            else {
                res.redirect('/');
            }
        });
    }
    else{
        res.render('register',{
            error: ''
        });
    }
});

const registerError = function(res, msg) {
    res.render('register',{
        error: msg
    });
}

app.post('/register',(req,res)=>{
    const paramID = req.body.id;
    const paramName = req.body.name;
    const paramPassword = req.body.password;
    const paramConfirm = req.body.confirm;
    const paramEmail = req.body.email; 
    if(!inrange(paramID.length, 4, 20)){
        registerError(res, "아이디의 길이는 4글자 이상 20글자 이하여야 합니다.");
    }
    else if(!inrange(paramName.length, 0, 20)){
        registerError(res, "이름은 20글자 이하여야 합니다.");
    }
    else if(!inrange(paramPassword.length, 4)){
        registerError(res, "패스워드의 길이는 4글자 이상이여야 합니다.");
    }
    else if(paramConfirm != paramPassword){
        registerError(res, "패스워드가 일치하지 않습니다.");
    }
    else{
        if (paramName == '') paramName = paramID;
        connection.query('select * from user where userId=?',[paramID],(err,result)=>{
            if(result.length == 0){
                connection.query('insert into user values(?,?,?,?,?)',[
                    paramID, encrypt(paramPassword), paramName, paramEmail, 0
                ]);
                res.redirect('/');
            }
            else {
                registerError(res, "이미 존재하는 아이디입니다.");
            }
        });
    }
});

//로그인 페이지
app.get('/login', (req, res)=>{
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id],(err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.render('login',{
                    error : ''
                });
            }
            else {
                res.redirect('/');
            }
        });
    }
    else{
        res.render('login',{
            error : ''
        });
    }
});
app.post('/login',(req,res)=>{
    var id = req.body.id;
    var pwd = req.body.password;
    connection.query('select * from user where userId=?',[id],(err,result)=>{
        if(err)
            throw err;
        if(result.length == 0 || encrypt(pwd) != result[0].userPassword) {
            res.render('login',{
                error : '아이디 또는 비밀번호가 일치하지 않습니다.'
            });
        }
        else {
            res.cookie.login = true;
            res.cookie.Name = result[0].userName;
            res.cookie.id = result[0].userID;
            res.cookie.password = result[0].userPassword;
            res.cookie.email = result[0].userEmail;
            req.session.save(function(){
                res.render('main',{
                    name : result[0].userName,
                    login : true
                });
            });
        }
    });
});


//공지 페이지  
app.get('/notice', (req, res)=>{
    var id = res.cookie.id;
    res.render('notice',{name : 'asdf'});
});

//랭크 페이지
app.get('/rank', (req, res)=>{
    var id = res.cookie.id;
    res.render('rank',{ name : 'asdf'});
});

blockcode = function(name, code){
    return "<" + name + ">\n" + code + "\n</" + name + ">\n";
}

//문제 페이지
app.get('/challenge', async (req, res)=>{
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id], async (err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.render('challenge',{
                    msg : ''
                });
            }
            else {
                var main = "";
                var script = "";
                fieldList = await fs.readdirSync('./prob');
                fieldList.splice(fieldList.indexOf('STATE'),1)
                for(var field of fieldList){
                    main += '<div id="' + field + '"><h2>' + field + '</h2></div>'
                    probList = await fs.readdirSync('./prob/'+field,(err)=>{});

                    for(var name of probList){
                        data = await fs.readFileSync('./views/challenge/script.html', 'utf8');
                        data = data.replace(/@field/g, field)
                        data = data.replace(/@name/g, name)
                        data = data.replace(/@score/g, 100)
                        data = data.replace(/@path/g, './prob/' + field + '/' + name + '/upload.zip')
                        script += data
                    }
                }
                res.write(blockcode('head', await fs.readFileSync('./views/challenge/head.html')))
                header = blockcode('header', await fs.readFileSync('./views/challenge/header.html')).replace(/@name/, res.cookie.Name)
                main = '<main id="main">'+ '<button id="cancel"><h2>X</h2></button>'+ main + '</main>' 
                res.end(blockcode('body',header + main + script))
            }
        });
    }
    else{
        res.render('login',{
            error : ''
        });
    }
});

//프로필
app.get('/profile', (req, res)=>{
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id],(err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.redirect('/');
            }
            else {
                res.render('profile',{ 
                    name : res.cookie.Name,
                    id : id,
                    email : res.cookie.email,
                    error : ''
                });
            }
        });
    }
    else{
        res.redirect('/');
    }
});

const profileError = function(res, msg) {
    if(res.cookie.login == true){
        var id = res.cookie.id;
        var pwd = res.cookie.password;
        connection.query('select * from user where userId=?',[id],(err,result)=>{
            if(err)
                throw err;
            if(result.length == 0 || pwd != result[0].userPassword) {
                res.cookie.login = false;
                res.redirect('/');
            }
            else {
                res.render('profile',{ 
                    name : res.cookie.Name,
                    id : id,
                    email : res.cookie.email,
                    error : msg
                });
            }
        });
    }
    else{
        res.redirect('/');
    }
}

app.post('/profile',(req,res)=>{
    let bitflag = 0;
    const paramID = req.body.id;
    const paramName = req.body.name;
    const paramPassword = req.body.password;
    const paramConfirm = req.body.confirm;
    const paramEmail = req.body.email; 

    if (paramID != res.cookie.id) {
        profileError(res, "아이디는 변경 할 수 없습니다.");
        return;
    }
    if(paramName != res.cookie.Name){
        if(!inrange(paramName.length, 0, 20)){
            profileError(res, "이름은 20글자 이하여야 합니다.");
            return;
        }
        bitflag |= 0b1;
    }
    let encryptValue = '';
    if (paramPassword.length > 0){
        encryptValue = encrypt(paramPassword);
        if(encryptValue != res.cookie.password){
            if(!inrange(paramPassword.length, 4, 64)){
                profileError(res, "패스워드의 길이는 4글자 이상 64글자 이하여야 합니다.");
                return;
            }
            bitflag |= 0b10;
        }
        if(paramConfirm != paramPassword){
            profileError(res, "패스워드가 일치하지 않습니다.");
            return;
        }
    }

    if (bitflag & 0b1){
        connection.query('update user set userName=? where userID=?', [
            paramName, res.cookie.id
        ]);
        res.cookie.Name = paramName;
    }
    if (bitflag & 0b10){
        connection.query('update user set userPassword=? where userID=?', [
            encryptValue, res.cookie.id
        ]);
        res.cookie.password = encryptValue;
    }
    if(paramEmail != res.cookie.email){
        connection.query('update user set userEmail=? where userID=?', [
            paramEmail, res.cookie.id
        ]);
        res.cookie.email = paramEmail;
    }

    res.redirect('/profile');
});

const server = http.createServer(app);
server.listen(app.get('port'),()=>{console.log("8080포트 연결중")});