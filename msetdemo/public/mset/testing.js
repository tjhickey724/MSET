import {msetDLL} from './msetDLL2.js'
console.log("this is a test file!")
let u = new msetDLL(3,undefined,['a','b','c','d'])
console.log(u.toString())

u.insert(1,'start')
console.log(u.toString())

u.insert(3,'middle')
console.log(u.toString())

u.insert(6,'end')
console.log(u.toString())

//u.delete(2)
//console.dir(u.toList())


console.log(u.toString())
console.log(u.strings.toString(' ','count'))
