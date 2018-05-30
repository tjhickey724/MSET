import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  console.log(test+' '+ (sa==sb)+" \n"+sa+"\n"+sb)
  return sa==sb
}


console.log("this is a test file!")
throw new Error()

function randN(N){
  return Math.floor(N*Math.random())
}

let d=[1]; for(let i=0; i<10; i++) d = d.concat(d);
d=[77,99] //,2,3,4];//,5,6,7,8,9,10,11,12,13,14,15,16]

let N=10
let M=N+d.length
let tstart=0
let tend=0

let v = new DLLwi()
for(let i=0; i<d.length; i++){
  v.insert(i,d[i])
}
console.log("d.length = "+d.length)
console.log(Date())
tstart = performance.now()

console.log(v.tln.toStringIndent(5))
for(let i=0;i<N; i++){
  window.debugging.v = v
  let x = randN(v.size())
  let y = v.nth(x).data
  let z = randN(v.size())
  console.log("deleting "+y+" from "+x+" move to "+z)
  console.log("tree is \n"+v.tln.toStringIndent(5))
  v.delete(x)
  console.log("inserting "+y+" at "+z+"\n"+v.tln.toStringIndent(5))
  v.insert(z,y)
  let w = v.nth(z).data
  console.log(v.tln.toStringIndent(5))
  console.log(JSON.stringify(v.toList().sort()))
  if (v.size()!= d.length) {
    throw new Error("lost or gained an item!! "+i+" "+x+","+y+" "+" "+w+v.size())
  } else if (w!= y){
    throw new Error("lost the value "+i+" "+x+","+y+" "+" "+w+v.size())
  } else if (v.tln.isAVLunbalanced()){
    throw new Error("lost the balance "+i+" "+x+","+y+" "+" "+w+v.size())
    console.log(v.tln.toStringOffset(5))
  } else if (!JSONcompare("testing",v.toList().sort(),d)  ) {
    throw new Error("lost an element"+i+" "+x+","+y+" "+" "+w+v.size())
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
