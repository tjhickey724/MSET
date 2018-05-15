const socket = io();

let msetId=-1;
let mset1 = {};


socket.on('msetId', function(msg){
  // here we listed to the server to get our msetId
  msetId=parseInt(msg);
  mset1 = new MSET(msetId);
  document.getElementById('msetId').innerHTML = "msetId="+msetId;
});

socket.on('remoteOperation', function(msg){
  console.log('received remoteOp: '+JSON.stringify(msg));

  let z = ""
  console.log('msetId='+msetId+" msg.nodeid[0]="+msg.nodeid[0])
  if (((msg.op=='extend'))&&(msg.nodeid[0]==msetId)){
    return;
  } else if ((msg.op=='insert') && (msg.un[0]==msetId)){
    return;
  }
  remoteOp=true;
  switch (msg.op){
    case 'insert':
       z = `REMOTE treeinsert([${msg.nodeid}],${msg.q},[${msg.un}],'${msg.c}')`
       console.log(z)
       mset1.treeinsert(msg.nodeid,msg.q,msg.un,msg.c)
       break;
     case 'extend':
        z = `REMOTE treeextend([${msg.nodeid}],'${msg.c}')`
        console.log(z)
        mset1.treeextend(msg.nodeid,msg.c)
        break;
    case 'delete':
       z = `REMOTE treehide([${msg.nodeid}],${msg.q})`
       console.log(z)
       mset1.treehide(msg.nodeid,msg.q)
       break;
    default: console.log('something else')
  }
  document.getElementById('estring1').value = mset1.strings.printList('edit');
  document.getElementById('rstring1').value = mset1.strings.printList('rev');
  const newString = mset1.strings.printList('std')
  document.getElementById('sstring1').value = newString;
  document.getElementById('ta').value = newString;
  console.log('ta= ...\n'+newString+"\n");
  lastValue = newString;
  remoteOp=false;
})

  document.getElementById('msetId').innerHTML = "msetId="+msetId;

function sendOperationToServer(op){
  socket.emit('operation',op);
}
