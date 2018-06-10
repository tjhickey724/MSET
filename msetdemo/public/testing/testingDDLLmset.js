import {TestServer,TestSocket} from './TestSocket.js'
import {DDLL} from '/mset/DDLL.js'
import {DLLwi} from '/mset/DLLwi.js'

/*
DDLLmset correctness testing

In this file we create a large number of different clients and we have them
independently apply edits at the same positions


Performance testing demonstrates that there is a bug!
As the performance in n^2 not nlog(n)
The time per op when processing n*100 inserts and deletes in an empty list is
about 750*n microseconds when it should be proportional to log(n)
So I must be doing something wrong in my AVL tree rebalancing ...

We create two identical lists of size N, one using AVL indexing
and the other a naive DLL implementation. The lists are constructed
by inserting the numbers 0-N into random positions in the lists.

Then the file repeatedly inserts an element, -i, into a random position z1
and then deletes an element from a random position z2.
After each list operation the two DLLs are converted to lists of numbers
and they are compared. If there is a difference and error is thrown.

We tested this with 100,000 operations on a list of size 20 with no errors
and also for 1000 operations on a list of size 100. It seems to be working
correctly!

*/

/*
let server = new TestServer()
let s0 = new TestSocket()
let s1 = new TestSocket()
let s2 = new TestSocket()
let s3 = new TestSocket()

s1.connect(server)
s1.emit("hi there")
s2.connect(server)
s2.emit("2 is on")
s1.emit("hello 2")
s3.connect(server)
s3.emit("hi to all")
*/

document.getElementById('go').addEventListener('click',function(event){
  let k = parseInt(document.getElementById('kTF').value)
  let numEdits = parseInt(document.getElementById('numEditsTF').value)
  let numLists = parseInt(document.getElementById('numListsTF').value)
  let initSize = parseInt(document.getElementById('initSizeTF').value)
  let burstSize = parseInt(document.getElementById('burstSizeTF').value)
  let shuffled = document.getElementById('shuffleCB').checked
  console.log("running tests"+JSON.stringify([k,numEdits,numLists,initSize,burstSize]))
  runTimeTests(k,numEdits,numLists,initSize,burstSize,shuffled)
})


function runTimeTests(k0,numEdits0, numLists0,initSize0,burstSize0,shuffled){
  let info = document.getElementById('results')
  info.innerHTML = ".... running tests"
  let test = document.getElementById('test')
  let multiplier = parseInt(document.getElementById('multTF').value)
  let testVal = test.value
  console.log(testVal)
  let tableData = `<table border='2' cellpadding='10'>\n<tr>`+
  `<td>Edits(E)</td>`+
  `<td>Clients(C)</td>`+
  `<td>Size(S) </td>` +
  `<td>Nodes(N)</td>`+
  `<td>H</td>`+
  `<td>Time(T)</td>`+
  `<td>N/E</td>`+
  `<td>T/E</td>`+
  `<td>A1</td>`+
  `<td>E/T</td>`+
  `<td>T*C</td>`+
  `<td>GC</td>`+
  `</tr>\n`

  for(let j=1;j<=k0;j++){
    let numEdits= (testVal=='numEdits')?j*multiplier:numEdits0
    let numLists = (testVal=='numClients')?j*multiplier:numLists0
    let initSize = (testVal=='initialSize')?j*multiplier:initSize0
    let burstSize = (testVal=='burstSize')?j*multiplier:burstSize0
    console.log(JSON.stringify([testVal,j,multiplier,numEdits,numLists,initSize,burstSize]))
    window.avlReset()

    let a = performance.now();
    let lists = runTestsA(numEdits,numLists,initSize,burstSize,shuffled);
    let b = performance.now();
    checkEquality(lists)

    //throw new Error("checking lists[0] ops")
    console.log('finished running for j='+j)
    let treeHeight = lists[0].info.treeHeight
    //let treeSize = lists[0].strings.toList('edit').length
    //let revStringSize = lists[0].strings.toList('rev').length
    let treeSize = lists[0].size('edit')
    let revStringSize = lists[0].size('rev')
    let numNodes = (treeSize-revStringSize)/2
    let stringSize = lists[0].size('std')
    let totalTime = Math.round(1000*(b-a)) // in microseconds
    let numEditOps = numEdits*2*numLists*numLists
    let N = numEditOps/numLists
    let timePerOp = Math.round(totalTime/numEditOps)
    let treeSizePerOp = treeSize/numEditOps*numLists
    let timePerOpOverLogN = (timePerOp/Math.log(N))
    let numGCs = lists[0].numGCs


    let avlInfo = window.avlInfo()
    /*
    let avlPerOpOverNx1000 = Math.round(avlInfo.a/(numEditOps*numEditOps))
    let nthPerOpOverLogNx1000 = Math.round(avlInfo.n/(numEditOps*Math.log(numEditOps)))
    let indexPerOpOverLogNx1000 = Math.round(avlInfo.i/(numEditOps*Math.log(numEditOps)))
    let avlPerOpOverLogNx1000 = Math.round(avlInfo.a/(numEditOps*Math.log(numEditOps)))
    let updateWPerOpOverNx1000 = Math.round(avlInfo.u/(numEditOps*numEditOps))
    */
    let s =(`numEdits=${numEdits} numLists=${numLists} initSize=${initSize} burstSize=${burstSize}`+
      ` j=${j} treeHeight=${treeHeight} time (sec)=${Math.round(totalTime/1000000)} `+
      ` numEditOps=${numEditOps} `+
      ` avlInfo.a=${avlInfo.a} avlInfo.i = ${avlInfo.i}`+
      ` timePerOp=${timePerOp} timePerOp/LogN=${timePerOpOverLogN}  timePerOp/N=${Math.round(timePerOp/N)}`+
      ` \n`)
      console.log(s)
    let data =
    `<tr><td>${N}</td>`+
        `<td>${numLists}</td>`+
        `<td>${stringSize}</td>`+
        `<td>${numNodes}</td>`+
        `<td>${treeHeight}</td>`+
        `<td>${Math.round(totalTime/numLists)/1000}</td>`+
        `<td>${Math.round(100*numNodes/N)/100}</td>`+
        `<td>${timePerOp/1000}</td>`+
        `<td>${Math.round(100*timePerOpOverLogN)/100}</td>`+
        `<td>${Math.round(1000/timePerOp)}</td>`+
        `<td>${Math.round((b-a))/1000}</td>`+
        `<td>${numGCs}</td>`+
       `</tr>`

    tableData += "\n"+data

  }
  info.innerHTML = tableData + "\n</table>"

}

function logCallbacks(op,pos,elt,user,me){
  //console.log(JSON.stringify(['editorCallback',op,pos,elt,user,me]))
}

function createDDLLclient(socket,docId,elements){
  //console.log('creating a DDLL object')
  return new DDLL(elements,logCallbacks,socket,docId)
}

function runSimpleTests(){
  let server = new TestServer()
  let s0 = new TestSocket()
  let s1 = new TestSocket()
  let s2 = new TestSocket()
  s0.connect(server)


  let d1 = createDDLLclient(s1,'doc1')
  let d2 = createDDLLclient(s2,'doc1')
  s1.connect(server)
  s2.connect(server)



}


function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  if (sa!=sb) {
    console.log(test+" \n a="+sa+"\n b="+sb)
  }
  return sa==sb
}

function randN(N){
  let r =  Math.floor(N*Math.random())
  //console.log('rand('+N+')='+r)
  return r
}


window.randN= randN

function createLists(N,server,initElements){
  // this creates N DDLL lists on the server.
  //let server = new TestServer()


  let lists=[]
  for(let i=0;i<N;i++){
    let s = new TestSocket()
    let ddll = createDDLLclient(s,'doc1',initElements)
    s.connect(server)
    lists[i]= ddll//.msetTree
  }
  return lists
}

function checkEquality(lists){
  console.log(`starting to test equality of ${lists.length} lists of size ${lists[0].size()}`)
  for (let i=0;i<lists.length-1;i++){
    console.log(`comparing list ${i} with ${i+1} `)
    if (!JSONcompare('Insertion/Deletion Tests',
             lists[i].toString(' ','std'),
             lists[i+1].toString(' ','std'))){
      console.log(`Error in DDLL insert! i=${i}`)
      console.log(lists[i].toString(' ','std')+" \n"+  lists[i+1].toString(' ','std'))
      console.dir([i, lists[i],lists[i+1]])

      throw new Error()
    }
    console.log("Testing complete")
  }
}

function range(a,b){
  let list=[]
  for(let i=a; i<b;i++){
    list.push(i)
  }
  return list
}

function runTestsA(numEdits,numLists,initSize,burstSize,shuffled){
  let server = new TestServer()
  server.setDelay(burstSize)
  let lists = createLists(numLists,server,range(0,initSize))
  //server.delay()
  //server.release(numLists) // this fills the delayQueue
  //lists[0].insertList(0,range(0,initSize))
  console.dir(lists[0])

  runDeleteTests(lists,numEdits,server,burstSize,shuffled)
  return lists
}

function runDeleteTests(lists,N,server,burstSize,shuffled){
  let gcCounter = 0
  let i=1

  while(i<=N){
    i++
    //console.log(`${i} --  ${lists[0].size('edit')}`)
    //server.delay()
    if (false &&(i>15)) {
      console.log("******** Stop outgoing traffic !!!!!!!")
      lists[0].msetTree.network.allowOutgoing = false
    }
    let z1=[]
    let z2=[]
    for(let j=0; j<lists.length; j++){
      z1[j] = randN(lists[j].size())
      //console.log("\n********\ninserting "+(-i)+" at position "+z1+" in \n"+lists.v1.tln.toStringIndent(5))
      if (!lists[j].gcMode){
        lists[j].insert(z1[j],j+i*lists.length*10)
      } else {
        gcCounter++
        lists[j].gcWait()
        //console.log(`j=${j} gcCounter=${gcCounter} gcMode=${lists[j].gcMode}`)
      }

    }
    for(let j in lists){
      z2[j] = randN(lists[j].size())
      //console.log("deleting elt at position "+z2+" in \n"+lists.v1.tln.toStringIndent(5))
      if (!lists[j].gcMode){
        lists[j].delete(z2[j])
      } else {
        gcCounter++
        lists[j].gcWait()
      }
    }

    server.release(lists.length*2)
    console.log(`\n\n*****\nTESTCODE LOOP ${i}`)
    for(let j=0; j<lists.length; j++){
      console.log(`U${lists[j].msetId}:`+
        ` G${lists[j].msetTree.size('edit')-lists[j].msetTree.size('rev')}| ` +
        ` ${JSON.stringify(lists[j].toList('std'))}`
      )
    }

    for(let j=0; j<lists.length; j++){
      console.log(`U${lists[j].msetId}: ${JSON.stringify(lists[j].toList('edit'))}`)
    }
    if (shuffled) {
      server.shuffle()
    }
    for(let j=0; j<lists.length; j++){
      const itq = lists[j].msetTree.network.inTransitQueue
      console.log(`itq${j}:`)
      for(let k=0; k<itq.length;k++){
        console.log(`${k}: ${visualizeEditOp(itq[k])}`)
      }

    }

    /*
    if (i >= burstSize){
      if (shuffled) {
        server.shuffle()
      }
      server.release(lists.length*2)
    }
*/
    //console.log('intransit: '+lists[0].network.inTransitQueue.length)
/*
    const itn = lists[0].network
    console.dir([itn,itn.outgoingOps,itn.incomingOps])

    console.log('**********\nuser: '+lists[0].network.userid+
       'inTransit:')
    for(let k=0;k<itn.inTransitQueue.length;k++){
      console.log(JSON.stringify(itn.inTransitQueue[k]))
    }
    console.log('**********\nuser: '+lists[0].network.userid+
       'outgoing:')
    for(let k=0;k<itn.outgoingOps.length;k++){
      console.log(JSON.stringify(itn.outgoingOps[k]))
    }
    console.log('**********\nuser: '+lists[0].network.userid+
       'incomoing:')
    for(let k=0;k<itn.incomingOps.length;k++){
      console.log(JSON.stringify(itn.incomingOps[k]))
    }
*/
  }
  server.release()
  for(let j=0; j<lists.length; j++){
    console.log(`U${lists[j].msetId}:`+
      ` G${lists[j].msetTree.size('edit')-lists[j].msetTree.size('rev')}| ` +
      ` ${JSON.stringify(lists[j].toList('std'))}`
    )
  }

  for(let j=0; j<lists.length; j++){
    console.log(`U${lists[j].msetId}: ${JSON.stringify(lists[j].toList('edit'))}`)
  }


  return gcCounter
}

function visualizeEditOp(e){
  if (e=='noop'){
    return 'noop'
  } else if (e.op=='insert'){
    return `U${e.un[0]}: I${e.nodeid[0]}:${e.nodeid[1]}(${e.q},<${e.un[0]}:${e.un[1]} ${e.c} ${e.un[0]}:${e.un[1]} >)`
  } else if (e.op=='delete'){
    return `U${e.u}: D${e.nodeid[0]}:${e.nodeid[1]}(${e.q})`
  } else if (e.op=='extend'){
    return `U${e.nodeid[0]}: E${e.nodeid[0]}:${e.nodeid[1]}(${e.q}, ${e.c})`
  } else {
    return 'Unknown edit op:\n'+JSON.stringify(e)
  }

}

window.ddll = {checkEquality,runDeleteTests,createLists,runTestsA, runTimeTests}
