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
  return Math.floor(N*Math.random())
}

let d=[1]; for(let i=0; i<10; i++) d = d.concat(d);
d=[55,66,77,88,99] //,2,3,4];//,5,6,7,8,9,10,11,12,13,14,15,16]

let N=1000
let M=N+d.length
let tstart=0
let tend=0

let v = new DLLwi()
for(let i=0; i<d.length; i++){
  v.insert(i,d[i])
}

let v2 = new DLLwi()
v2.isAVL=false
for(let i=0; i<d.length; i++){
  v2.insert(i,d[i])
}
window.v=v
window.v2=v2




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
//console.log(v.tln.toStringIndent(5))
for(let i=0;i<N; i++){
  window.debugging.v = v
  let x = randN(v.size())
  let y = v.nth(x).data
  let y1 = v2.nth(x).data
  let z = randN(v.size())
  oldv1 = v.toList()
  oldv2 = v2.toList()
  oldT = v.tln.toStringIndent(5)
  oldTsize = v.tln.treeSize()
  v.delete(x)
  v2.delete(x)
  newTsize = v.tln.treeSize()
  if ((oldTsize!=newTsize+1) || !JSONcompare('v1=v2',v.toList(),v2.toList())) {
    console.log("ERROR in step "+i)
    console.log("deleting "+y+" from "+x+" move to "+z)

    console.log("old tree was "+oldTsize)
    console.log(oldT)

    newT = v.tln.toStringIndent(5)


    console.log("new tree is "+newTsize)
    console.log(newT)
    console.dir(v)
    console.log(JSON.stringify(v.toList()))

    throw new Error("bug in DLLwi")
  }

  oldT = v.tln.toStringIndent(5)
  oldTsize = v.tln.treeSize()
  v.insert(z,y)
  v2.insert(z,y1)
  newTsize = v.tln.treeSize()

  if ((oldTsize!=newTsize-1) || !JSONcompare('v1=v2',v.toList(),v2.toList())) {
    console.log("ERROR in step "+i)
    console.log("inserting "+y+" at "+z)

    console.log("old tree was "+oldTsize)
    console.log(oldT)

    newT = v.tln.toStringIndent(5)

    console.log("new tree is "+newTsize)
    console.log(newT)
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
