import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  if (sa!=sb) {
    console.log(test+' '+ (sa==sb)+" \n"+sa+"\n"+sb)
  }
  return sa==sb
}


console.log("this is a test file!")

function randN(N){
  let r =  Math.floor(N*Math.random())
  //console.log('rand('+N+')='+r)
  return r
}

window.randN= randN


let d=[1]; for(let i=0; i<10; i++) d = d.concat(d);
//d=[55,66,77,88,99] //,2,3,4];//,5,6,7,8,9,10,11,12,13,14,15,16]

let N=2
let R=100
let M=N+d.length
let tstart=0
let tend=0

let v = new DLLwi()
let v2 = new DLLwi()
window.v=v
window.v2=v2

v2.isAVL=false
const listSize=4

for(let i=0; i<N; i++){
  let z1 = randN(i+1)
  v.insert(z1,i)
  v2.insert(z1,i)
}

for(let i=0; i<R; i++){

  //console.log("\n\n**** "+i)
  //v.tln.printStringIndent(5)
  if (i<N) continue
  let z = randN(v.size())
  v.delete(z)
  v2.delete(z)

  if (JSON.stringify(v.toList())!=JSON.stringify(v2.toList())){
    console.log("problems!!")
  }
  //console.log(v.tln.toStringIndent(5))
}
console.dir(v)
if (JSON.stringify(v.toList())!=JSON.stringify(v2.toList())){
  console.log("insertion didn't work!")
} else {
  console.log("insertion is OK")
}




console.log("Now we test nth")
let vlist = v.toList()
for(let j = 0; j>vlist.length; j++){
  if (v.nth(j)!=vlist[j]) {
    console.log("error with nth on "+j)
  }
}
console.log("nth is good!")
console.log(vlist)

console.log("Now we test delete")
console.dir(v)
vlist = v.toList()
//console.log(v.listSize['count']+" is v.listSize")
//console.log(v.listSize['count']>0)
while (v.listSize['count']>0){
  let k=randN(v.listSize['count']-1)
  let z = v.nth(k)
  //console.log("\n\n\n\n********** deleting "+z+" at position "+k)
  //console.log(v.tln.toStringIndent(5))
  v.delete(k)
  v2.delete(k)
  //console.log("\n\n\n\n********** deleted "+z+" at position "+k)
  //console.log(v.tln.toStringIndent(5))
  //console.log("\n\n\n\n**********\n")
  //console.log(v.listSize['count']+" is v.listSize")
  //v.tln.printStringIndent(5)
  if (JSON.stringify(v.toList())!=JSON.stringify(v2.toList())){
    console.log("deletion didn't work! for "+z+" at "+k+" out of "+v.listSize)
    window.debugging.v=v
    window.debugging.v2=v2
    throw new Error()
  }
}

console.log("delete is good!")
console.log(v.toList())
throw new Error()


v2 = new DLLwi()
v2.isAVL=false
for(let i=0; i<d.length; i++){
  v2.insert(i,d[i])
}





console.log("d.length = "+d.length)
console.log("N = "+N)
console.log(Date())
tstart = performance.now()
let oldv1=[]
let oldv2=[]
let oldTsize = 0
let newTsize = 0
let oldT=""
let newT = ""
let oldData=""
//console.log(v.tln.toStringIndent(5))
for(let i=0;i<N; i++){
  window.debugging.v = v
  let x = randN(v.size())
  let y = v.nth(x).data
  let y1 = v2.nth(x).data
  let z = randN(v.size())
  oldv1 = v.toList()
  oldv2 = v2.toList()
  //oldT = v.tln.toStringIndent(5)
  oldTsize = v.tln.treeSize()
  v.delete(x)
  v2.delete(x)
  newTsize = v.tln.treeSize()
  if ((oldTsize!=newTsize+1) || !JSONcompare('v1=v2',v.toList(),v2.toList())) {
    console.log("ERROR in step "+i+" "+JSON.stringify([oldTsize,newTsize,1]))

    console.log("deleting "+y+" from position "+x)
    console.log("oldV1= "+x+JSON.stringify(oldv1))
    console.log("old tree was "+oldTsize)


    //newT = v.tln.(toStringIndent)(5)


    console.log("new tree is "+newTsize)
    //console.log(newT)
    console.dir(v)
    console.log(JSON.stringify(v.toList()))

    throw new Error("bug in DLLwi")
  }

  //oldT = v.tln.toStringIndent(5)
  oldTsize = v.tln.treeSize()
  v.insert(z,y)
  v2.insert(z,y1)
  newTsize = v.tln.treeSize()

  if ((oldTsize!=newTsize-1) || !JSONcompare('v1=v2',v.toList(),v2.toList())) {
    console.log("ERROR in step "+i+" "+JSON.stringify([oldTsize,newTsize,-1]))
    console.log("inserting "+y+" at "+z)
    console.log("oldv1= "+x+JSON.stringify(oldv1))

    console.log("old tree was "+oldTsize)
    console.log(oldT)

    //newT = v.tln.toStringIndent(5)

    console.log("new tree is "+newTsize)
    //console.log(newT)
    console.dir(v)
    console.log(JSON.stringify(v.toList()))

    throw new Error("bug in DLLwi")
  }
}
tend = performance.now()

console.log(Date())
console.log('tend='+tend)
console.log('tstart='+tstart)
console.log('time='+(tend-tstart))
console.log('avg time to insert was '+ Math.round(1000*(tend-tstart)/(2*N)) + "us")
console.log(JSON.stringify([v.size()]))


/*
console.log("\n\n\nNow trying DLLmset")
let u = new DLLmset(1,undefined,[])
u.insertList(0,d)

console.log(Date())
tstart = performance.now()
console.log("d has length: "+d.length)

//console.log(u.strings.tln.toStringIndent(5))
for(let i=0; i<N/2; i++){
  u.insert(randN(u.size),i)
  //u.delete(randN(u.size))
}
tend = performance.now()
console.log(Date())
console.log('tend='+tend)
console.log('tstart='+tstart)
console.log('time='+(tend-tstart))
console.log('avg time to insert was '+ Math.round(1000*(tend-tstart)/M) + "us")
console.log(JSON.stringify([u.size]))

*/
