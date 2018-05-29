import {DLLmset} from './DLLmset2.js'
import {DLLwi} from './DLLwi.js'

/*
DLLwi correctness testing

This file is to test the correctness of the DLLwi Implementation
We create two identical lists of size N, one using AVL indexing
and the other a naive DLL implementation. The lists are constructed
by inserting the numbers 0-N into random positions in the lists.

Then the file repeatedly inserts an element, -i, into a random position z1
and then deletes an element from a random position z2.
After each list operation the two DLLs are converted to lists of numbers
and they are compared. If there is a difference and error is thrown.

We tested this with 100,000 operations on a list of size 20 with no errors
and also for 1000 operations on a list of size 100. It seems to be working
correctly!

*/


function JSONcompare(test,a,b){
  let sa = JSON.stringify(a)
  let sb = JSON.stringify(b)
  if (sa!=sb) {
    console.log(test+" \n a="+sa+"\n b="+sb)
  }
  return sa==sb
}

function randN(N){
  let r =  Math.floor(N*Math.random())
  //console.log('rand('+N+')='+r)
  return r
}

window.randN= randN

function createRandLists(N){
  let v1 = new DLLwi()
  let v2 = new DLLwi()
  v2.isAVL= false
  for(let i=0; i<N; i++){
    let z1 = randN(i+1)
    v1.insert(z1,i)
    v2.insert(z1,i)
    if (!JSONcompare('Insertion',v1.toList(),v2.toList())){
      console.log("Error in DLLwi insert! "+i+" "+z1+" "+N)
      console.dir([v1,v2,i,z1])
      throw new Error("insertion error")
    }
  }
  return {v1:v1,v2:v2}
}

function runDeleteTests(lists,N){
  for(let i=1; i<=N; i++){
    let z1 = randN(lists.v1.size())
    //console.log("\n********\ninserting "+(-i)+" at position "+z1+" in \n"+lists.v1.tln.toStringIndent(5))
    lists.v1.insert(z1,-i)
    lists.v2.insert(z1,-i)
    let z2 = randN(lists.v1.size())
    //console.log("deleting elt at position "+z2+" in \n"+lists.v1.tln.toStringIndent(5))
    lists.v1.delete(z2)
    lists.v2.delete(z2)
    if (!JSONcompare('Insertion/Deletion',lists.v1.toList(),lists.v2.toList())){
      console.log("Error in DLLwi delete! "+i+" "+z1+" "+z2)
      console.dir([v1,v2,i,z1])
    }
  }
}
let listSize =20
let reps = 100000
console.log("running insertion/deletion tests "+Date())
window.vlists = createRandLists(listSize)
console.log("created two lists of size "+listSize)
runDeleteTests(window.vlists,reps)
console.log(reps+ " insertion/deletion tests successfully completed")
