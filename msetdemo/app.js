// Start with
//   DEBUG=msetdemo:* npm start
//

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var msetRouter = require('./routes/mset');
var mset2Router = require('./routes/mset2');

//var app = require('express')();
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//app.get('/', function(req, res){
//	res.sendFile(__dirname + '/index.html');
//    });

let msetId=1


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/mset', msetRouter);
app.use('/mset2', mset2Router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;

const io1 = io.of('/demo1')
io1.on('connection', function(socket){
  console.log('a user connected');
  socket.on('operation',function(msg){
    console.log('operation: '+msg);
    console.dir(msg);
    io1.emit('remoteOperation',msg);
  })
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  socket.emit('msetId',msetId++);
});

const io2 = io.of('/demo2')

io2.on('connection', function(socket){

  console.log('a user connected');

  socket.on('operation',function(msg){
    console.log('operation: '+msg);
    console.dir(msg);
    io2.emit('remoteOperation',msg);
  })

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.emit('msetId',msetId++);
});


http.listen(4000, function(){
	console.log('listening on *:4000');
    });
