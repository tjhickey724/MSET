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


  binaryInsert(elt,comparator){
    /* This inserts a node into the DLL by finding its position in the list
       It assumes that the list is ordered by the node.data fields wrt the
       comparator function. It returns the new node it creates.
       This only works if the tree has been created entirely using binaryInsert
    */
    if ((this.listNode.data===startmarker)
         ||
         (comparator(elt,this.listNode.data)>=0))   {
       if (this.right) {
         return this.right.binaryInsert(elt,comparator)
       } else {
         return this.listNode.insertAfter(elt)
       }
    } else {
        if (this.left){
          return this.left.binaryInsert(elt,comparator)
        } else {
          return this.listNode.insertBefore(elt)
        }
    }

  }

  binarySearch(elt,comparator){
    /* This inserts a node into the DLL by finding its position in the list
       It assumes that the list is ordered by the node.data fields wrt the
       comparator function. It returns the new node it creates.
    */
    if ((this.listNode.data===startmarker)
         ||
         (comparator(elt,this.listNode.data)>0))   {
       if (this.right) {
         return this.right.binarySearch(elt,comparator)
       } else {
         return false
       }
    } else if
         ((this.listNode.data===endmarker)
         ||
         (comparator(elt,this.listNode.data)<0)){
        if (this.left){
          return this.left.binarySearch(elt,comparator)
        } else {
          return false
        }
    } else { //they are equal
      return this.listNode
    }

  }




}
