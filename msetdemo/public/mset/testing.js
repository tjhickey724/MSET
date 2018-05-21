//import {WIDLL} from './WIDLL.js'
console.log("this is a test file!")
const x = new WIDLL()
x.toString()
function compare(x,y) {return x-y}
x.comparator = compare
for(let i=0;i<10; i++) x.insert(i*10)
console.log(x.toString(' '))
console.log(x.tln.toStringIndent(5))
for(let i=8;i>=5;i--) {
  console.log("\n\n******\n\n Deleting node "+i);
  x.delete(i);
}
console.log(x.toString(' '))
console.log(x.tln.toStringIndent(5))
