import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  console.log(test+' '+ (sa==sb)+" \n"+sa+"\n"+sb)
}





console.log("this is a test file!")
let u = new DLLmset(3,undefined,['a','b','c','d'])
console.log(u.toString())

u.insert(1,'start')
console.log(u.toString())

u.insert(3,'middle')
console.log(u.toString())

u.insert(6,'end')
console.log(u.toString())

console.log("deleting u(2)")
u.delete(2)
console.dir(u.toList())


console.log(u.toString())
console.log(u.strings.toString(' ','count'))
