//import {WIDLL} from './WIDLL.js'
console.log("this is a test file!")
const x = new WIDLL()
console.log('string = '+x.toString())

for(let i=0;i<11; i++) x.insert(i*10,i)

console.log(x.toString(' '))
console.log(x.tln.toStringIndent(5))
for(let i=8;i>=7;i--) {
  console.log("\n\n******\n\n Deleting node "+i+" from:");
  console.log(x.toString(' '))
  x.delete(i);
}
console.log(x.toString(' '))
console.log(x.tln.toStringIndent(5))
