console.log("Got it!!")

const socket = io();

console.dir(socket);

function sendChat(e){
  console.log('sending chat message ',$("#m"))
  socket.emit('chat message', $('#m').val());
  $('#m').val('');
}
let btn = document.getElementById('send')
console.dir(btn)
btn.addEventListener("click",sendChat,false)

socket.on('chat message', function(msg){
  console.log('received chat message: '+msg);
  $('#messages').append($('<li>').text(msg));
});
