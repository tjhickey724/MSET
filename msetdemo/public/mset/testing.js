import {msetDLL2} from './msetDLL2.js'
console.log("this is a test file!")
let u = new msetDLL2(3,undefined,['a','b','c'])
u.treeinsert([0,0],2,[3,0],['x','y','z'])
//u.treeinsert([0,0],0,[5,0],['r','s','t'])
//u.treeinsert([0,0],0,[4,0],['u'])
//u.treeinsert([3,0],0,[4,1],['v'])
//u.treeinsert([0,0],3,[4,2],['w'])
window.u = u
