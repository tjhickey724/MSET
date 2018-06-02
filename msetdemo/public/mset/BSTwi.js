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
    return this.tln.binaryInsert(elt, this.comparator).indexOf()
  }

  get(k){
    return this.nth(k).data
  }






}
