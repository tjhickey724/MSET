import {DLLwi} from './DLLwi.js'
export {BSTwi}
/*
Weighted Indexable Binary Search Tree
This is an implementation of a binary search tree in which you
an insert/delete and lookup elements, and you can also get the
nth element. All of these operations have time complexity O(log(N))
*/

class BSTwi extends DLLwi {

  constructor(comparator){
    super()
    this.dll = new DLLwi()
    this.dll.comparator = comparator
  }

  insert(elt){
    return this.dll.tln.binaryInsert(elt, this.dll.comparator).indexOf()
  }

  get(k){
    return this.dll.nth(k).val
  }



}
