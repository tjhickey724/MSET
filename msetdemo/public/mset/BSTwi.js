import {DLLwi} from './DLLwi.js'
export {BSTwi}
/*
Weighted Indexable Binary Search Tree
This is an implementation of a binary search tree in which you
an insert elements, and you can also get the
nth element. All of these operations have time complexity O(log(N))
We can also add binary search and deletion, but I didn't need them for
DLLmset ...
*/

class BSTwi extends DLLwi {

  constructor(comparator){
    super()
    this.comparator = comparator
  }

  insert(elt){
    const result =  this.tln.binaryInsert(elt, this.comparator).indexOf()
    if (!isOrdered(this.toList())) {
      console.log('inserted element: '+elt.user)
      console.log(`into list ${this.toList().map((x)=>(x.user))}`)
      console.log(`returning ${result}`)
      console.dir(result)
    }

    return result
  }

  get(k){
    return this.nth(k).data
  }

}

function isOrdered(list){
  for(let i=0; i<list.length-1; i++){
    if (list[i].user > list[i+1].user) {
      return false
    }
  }
  return true
}

window.BSTwi = BSTwi
