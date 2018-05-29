import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

/*
DLLmset correctness testing

In this file we test the correctness of the DLLmset package when used by a
single user. So all InsertionSets will contain a single element! The tests
are designed to explore each of the possible cases of the algorithm including
the 3 higher level cases
  * inserting at beginning
  * inserting at end
  * inserting before an datum in the list
    * when next edit-list item is a non-marker
    * when next edit-list item is a end-marker
    * when next edit-list item is a start-marker
In addition to these three cases there are subcases depending on whether
the insertion or deletion point is at the beginning, end, or middle of
a subnode ...

Once these cases are verified we will then generate lists with DLLmset and
with DLLwi and make sure they behave the same with R random inserts and deletes
on a list of size N
*/


function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  console.log(test+' '+ (sa==sb)+" \n"+sa+"\n"+sb)
}





console.log("this is a test file!")
let u = new DLLmset(3,undefined,['a','b','c','d'])
console.log(u.toString())
console.dir(u)
window.u = u

console.log("initial \n"+u.strings.tln.toStringIndent(5))

u.insert(1,'SIGMA')
console.log(u.toString())
console.dir(u)

console.log("inserted SIGMA at start \n"+u.strings.tln.toStringIndent(5))

u.insert(3,'MU')
console.log(u.toString())
console.dir(u)

console.log("inserted MU in middle \n"+u.strings.tln.toStringIndent(5))

u.insert(6,'EPSILON')
console.log(u.toString())
console.dir(u)

console.log("inserted EPSILON at end \n"+u.strings.tln.toStringIndent(5))

console.log("deleting u(2)")
u.delete(2)
console.dir(u.toList())
console.dir(u)

console.log("removed 2nd element \n"+u.strings.tln.toStringIndent(5))


console.log(u.toString())
console.dir(u)
console.log(u.strings.toString(' ','count'))


function randN(N){
  let r =  Math.floor(N*Math.random())
  //console.log('rand('+N+')='+r)
  return r
}

window.randN= randN

let v1 = new DLLmset(3,undefined,['a'])
let v2 = new DLLwi()
v2.insert(0,'a')
console.log(v1.toList())
console.log(v2.toList())

for(let j=0;j<3;j++) {
  v1.insert(j,j)
  v2.insert(j,j)
  console.log(v1.toList())
  console.log(v2.toList())
  console.log(v1.toList('edit'))
  console.log(v1.strings.tln.toStringIndent(5))

}
console.log(v1.toList())
console.log(v2.toList())

throw new Error()

function createRandLists(N){
  let letters = "abcdefgjhijklmnopqrstuvwxyz".split("")
  let v1 = new DLLmset(3,undefined,letters)
  let v2 = new DLLwi()
  for (let j in letters){
    v2.insert(j,letters[j])
  }
  //let v3 = new DLLwi(); v3.isAVL=false
  for(let i=0; i<N; i++){
    let z1 = randN(v1.size)
    v1.insert(z1,i)
    v2.insert(z1,i)
    //v3.insert(z1,i)
    if (!JSONcompare('Insertion',v1.toList(),v2.toList())){
      console.log("Error in DLLwi insert! "+i+" "+z1+" "+N)
      console.dir([v1,v2,i,z1])
      throw new Error("insertion error")
    }
  }
  return {v1:v1,v2:v2}
}

const listSize = 2
vs = createRandLists(listSize)
window.vs = vs
console.log('created a list of size '+v1.size())
console.log(vs.v1.toList())
