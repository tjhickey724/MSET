
console.log("this is a test file!")
const x = new DLL()
x.printList()
function compare(x,y) {return x-y}
x.comparator = compare
for(let i=0;i<10; i++) x.insert(Math.floor(100*Math.random()))
