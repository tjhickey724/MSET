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

window.ddll.runTimeTests(9,2,0,1)
13:43:23.205 testingDDLLmset.js:58 n=1 total=308300  numEditOps=400 timePerOp=771 timePerOp/n=771 treeSize=604 treeSizePerOp=1.51
13:43:24.367 testingDDLLmset.js:58 n=2 total=1161700  numEditOps=800 timePerOp=1452 timePerOp/n=726 treeSize=1204 treeSizePerOp=1.505
13:43:26.996 testingDDLLmset.js:58 n=3 total=2628600  numEditOps=1200 timePerOp=2191 timePerOp/n=730 treeSize=1804 treeSizePerOp=1.5033333333333334
13:43:31.597 testingDDLLmset.js:58 n=4 total=4600500  numEditOps=1600 timePerOp=2875 timePerOp/n=719 treeSize=2404 treeSizePerOp=1.5025
13:43:38.875 testingDDLLmset.js:58 n=5 total=7276900  numEditOps=2000 timePerOp=3638 timePerOp/n=728 treeSize=3004 treeSizePerOp=1.502
13:43:49.788 testingDDLLmset.js:58 n=6 total=10912400  numEditOps=2400 timePerOp=4547 timePerOp/n=758 treeSize=3604 treeSizePerOp=1.5016666666666667
13:44:04.666 testingDDLLmset.js:58 n=7 total=14878100  numEditOps=2800 timePerOp=5314 timePerOp/n=759 treeSize=4204 treeSizePerOp=1.5014285714285713
*/

/*

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
  let tableData = `<table border='2'>\n<tr><td>NumEditOps (per client)</td><td>TotalTime(ms) (per client)</td>`+
  `<td>treeHeight</td><td>EditListSize</td><td>timePerOp (microseconds)</td><td>timePerOp/log(N) (nanoseconds)</td><td>TreeSize/n (%)</td>`+
  `<td>numEdits</td><td>NumLists</td><td>initSize</td><td>burstSize</td>`+
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

    console.log('finished running for j='+j)
    let treeHeight = lists[0].strings.tln.height
    let treeSize = lists[0].toList('edit').length
    let totalTime = Math.round(1000*(b-a)) // in microseconds
    let numEditOps = numEdits*2*numLists*numLists
    let timePerOp = Math.round(totalTime/numEditOps)
    let treeSizePerOp = treeSize/numEditOps*numLists
    let timePerOpOverLogN = (totalTime/(Math.log(numEditOps)*numEditOps))

    let avlInfo = window.avlInfo()
    let avlPerOpOverNx1000 = Math.round(avlInfo.a/(numEditOps*numEditOps))
    let nthPerOpOverLogNx1000 = Math.round(avlInfo.n/(numEditOps*Math.log(numEditOps)))
    let indexPerOpOverLogNx1000 = Math.round(avlInfo.i/(numEditOps*Math.log(numEditOps)))
    let avlPerOpOverLogNx1000 = Math.round(avlInfo.a/(numEditOps*Math.log(numEditOps)))
    let updateWPerOpOverNx1000 = Math.round(avlInfo.u/(numEditOps*numEditOps))
    let s =(`reps=${numEdits} numLists=${numLists} initSize=${initSize} burstSize=${burstSize} j=${j} h=${treeHeight} time (sec)=${Math.round(totalTime/1000000)}  numEditOps=${numEditOps} `+
      ` nthPerOpOverLogNx1000=${nthPerOpOverLogNx1000} indexPerOpOverLogNx1000=${indexPerOpOverLogNx1000} `+
      ` avlInfo.a=${avlInfo.a} avlPerOp/n=${avlPerOpOverNx1000}  avlPerOp/logN=${avlPerOpOverLogNx1000} `+
      `updateWPerOp/n = ${updateWPerOpOverNx1000} `+
      ` timePerOp=${timePerOp} timePerOp/LogN=${timePerOpOverLogN} `+
      ` treeSize=${treeSize} treeSizePerOp=${treeSizePerOp} \n`)
      console.log(s)
    let data =
    `<tr><td>${numEditOps/numLists}</td>`+
        `<td>${Math.round(totalTime/1000/numLists)}</td>`+
        `<td>${treeHeight}</td>`+
        `<td>${treeSize}</td>`+
        `<td>${timePerOp}</td><td>${Math.round(1000*timePerOpOverLogN)}</td>`+
        `<td>${Math.round(100*treeSize/numEditOps*numLists)}</td>`+
        `<td>${numEdits}</td>`+
        `<td>${numLists}</td>`+
        `<td>${initSize}</td>`+
        `<td>${burstSize}</td>`+
       `</tr>`

    tableData += "\n"+data

  }
  info.innerHTML = tableData + "\n</table>"

}

function logCallbacks(op,pos,elt,user,me){
  //console.log(JSON.stringify(['editorCallback',op,pos,elt,user,me]))
}

function createDDLLclient(socket,docId){
  //console.log('creating a DDLL object')
  return new DDLL(socket,docId,logCallbacks)
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

  window.test={s0:s0,s1:s1,s2:s2,d1:d1,d2:d2,server:server}

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

function createLists(N,server){
  // this creates N DDLL lists on the server.
  //let server = new TestServer()


  let lists=[]
  for(let i=0;i<N;i++){
    let s = new TestSocket()
    let ddll = createDDLLclient(s,'doc1')
    s.connect(server)
    lists[i]= ddll.msetTree
  }
  return lists
}

function checkEquality(lists){
  console.log(`starting to test equality of ${lists.length} lists of size ${lists[0].length}`)
  for (let i=0;i<lists.length-1;i++){
    console.log(`comparing list ${i} with ${i+1} `)
    if (!JSONcompare('Insertion/Deletion Tests',lists[i].toList(),lists[i+1].toList())){
      console.log(`Error in DDLL insert! i=${i}`)
      console.dir([i, lists[i],lists[i+1]])
      window.debugging.error = [i, lists[i],lists[i+1]]
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
  let lists = createLists(numLists,server)
  lists[0].insertList(0,range(0,initSize))
  runDeleteTests(lists,numEdits,server,burstSize,shuffled)
  return lists
}

function runDeleteTests(lists,N,server,burstSize,shuffled){

  for(let i=1; i<=N; i++){
    server.delay()
    let z1=[]
    let z2=[]
    for(let j=0; j<lists.length; j++){
      z1[j] = randN(lists[j].size())
      //console.log("\n********\ninserting "+(-i)+" at position "+z1+" in \n"+lists.v1.tln.toStringIndent(5))
      lists[j].insert(z1[j],j+i*lists.length)
    }
    for(let j in lists){
      z2[j] = randN(lists[j].size())
      //console.log("deleting elt at position "+z2+" in \n"+lists.v1.tln.toStringIndent(5))
      lists[j].delete(z2[j])
    }

    if ((burstSize==0)|| (i%burstSize==0)) {
      //server.shuffle()
      //console.log(`releasing server queue with size ${server.delayList.length}`)
      if (shuffled) server.shuffle()
      server.release()
    }
  }
  server.release()
}

window.ddll = {checkEquality,runDeleteTests,createLists,runTestsA, runTimeTests}

/*
let listSize =20
let reps = 100000
console.log("running insertion/deletion tests "+Date())
window.vlists = createRandLists(listSize)
console.log("created two lists of size "+listSize)
runDeleteTests(window.vlists,reps)
console.log(reps+ " insertion/deletion tests successfully completed")
*/
