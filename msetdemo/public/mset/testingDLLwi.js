import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  console.log(test+' '+ (sa==sb)+" \n"+sa+"\n"+sb)
}

function copyList(dll){
  let s=[]
  for(let i=0;i<dll.size();i++){
    s.push(dll.nth(i).data)
  }
  return s
}

const dll = new DLLwi()
window.dll = dll
dll.insert(0,5)
dll.insert(1,'pi')
dll.insert(2,[2,3,4])
dll.insert(0,'start')
dll.insert(dll.size(),'end')
dll.insert(4,{a:1,b:2})
let result=""
let ans=""
JSONcompare(1,dll.toList(),["start", 5, "pi", [2,3,4], {a:1,b:2}, "end"])

console.log("deleting nth(0)="+dll.nth(0).data)
//console.log(dll.tln.toStringIndent(5))
dll.delete(0)
JSONcompare(2,dll.toList(),[5, "pi", [2,3,4], {a:1,b:2}, "end"])
JSONcompare(3,dll.toList(),copyList(dll))
JSONcompare(4,dll.nth(1).data,"pi")
//console.log(dll.tln.toStringIndent(5))

console.log("deleting nth(0)="+dll.nth(0).data)
//console.log(dll.tln.toStringIndent(5))
dll.delete(4)
//console.log(dll.tln.toStringIndent(5))
JSONcompare(5,dll.toList(),[5, "pi", [2,3,4], {a:1,b:2}])

JSONcompare(6,dll.toList(),copyList(dll))
JSONcompare(7,dll.nth(1).data,"pi")

//console.log(dll.tln.toStringIndent(5))

dll.delete(0)
JSONcompare(8,dll.toList(),["pi", [2,3,4], {a:1,b:2}])
JSONcompare(9,dll.toList(),copyList(dll))
JSONcompare(10,dll.nth(1).data,[2,3,4])

//console.log(dll.tln.toStringIndent(5))

/*

// which return ["pi", [2,3,4], {a:1,b:2}]
console.log(JSON.stringify(dll.toList()))
JSONcompare(11,dll.toList(),copyList(dll))
const n1 = dll.nth(1)
JSONcompare(12,dll.nth(1).data,[2,3,4])
*/

/*

console.log("this is a test file!")
let u = new DLLmset(3,undefined,['a','b','c','d'])
console.log(u.toString())

u.insert(1,'start')
console.log(u.toString())

u.insert(3,'middle')
console.log(u.toString())

u.insert(6,'end')
console.log(u.toString())

//u.delete(2)
/console.dir(u.toList())


console.log(u.toString())
console.log(u.strings.toString(' ','count'))

*/
