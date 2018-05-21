//import {DLLindexed} from './DLLindexed.js'
console.log("this is a test file!")
const x = new WIDLL()
x.printList()
function compare(x,y) {return x-y}
x.comparator = compare
for(let i=0;i<5; i++) x.insert(i*10)
