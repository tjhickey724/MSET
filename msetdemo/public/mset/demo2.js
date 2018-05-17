// create mset sockets for the two textareas

const mset1 = new MSETsocket('/demo2','ta1');
const mset2 = new MSETsocket('/demo2','ta2');
console.log('in demo2.js')
console.dir([mset1,mset2])



//and we're done?
/*
const namespace='/demo2'
const socket = io(namespace)

this.socket.on('connection', function(socket){
    socket.join(thisMset.taId);
});

socket.on('msetId', function(msg){
  // here we listen to the server to get our msetId
  console.log('just got message '+msg);
  socket.emit('operation',{a:'hi',b:[1,2,3],c:"hello"});
});
console.dir(socket)
*/
