export {wiDLL}
/********************************************************
 * Here is an AVL implementation of weighted treelist nodes
 */


/********************************************************
 *
 * sizefn(elt) returns a json object which specifies the sizes of the element
 *    with respect to various user-defined features. It must return an object
 *    of the form:
 *       {count:n0, p1:n2, ...., p2:n2}
 *    where the ni are positive numbers. The property count is mandatory,
 *    but the other pi are optional. Also, the sizefn should give a value to the
 *    null object (and any falsey value) which is 0 for all features. The
 *    default sizefn is
 *       (x)=>(x?{count:1}:{count:0})
 *
  */

const startmarker="startmarker"
const endmarker="endmarker"


class wiDLL {
  constructor(sizefn){
    // initialize the sizefn
    this.sizefn = (sizefn || ((x)=>({count:1})))
    // make sure it ignores the start and end markers
    this.emptySize = this.sizefn(null)
    for(let x in this.emptySize){
      this.emptySize[x]=0
    }

    // initialize the start and end markers
    this.first = new ListNode(startmarker,this);
    this.first.size= this.emptySize
    this.last = new ListNode(endmarker,this);
    this.last.size=this.emptySize

    // initialize the index tree with startmarker at the root
    // and endmarker as its right subtree
    const startTree = new TreeList(null,null,null,this.emptySize,this.first)
    const endTree = new TreeList(null,null,null,this.emptySize,this.last)
    startTree.right = endTree
    endTree.parent = startTree
    this.tln = startTree
    this.first.tln = startTree
    this.last.tln = endTree
    this.first.nodeid=-1;
    this.last.nodeid=-1;
    this.first.next = this.last;
    this.last.prev = this.first;

    /*
      if a comparator function is specified f(a,b)={neg,0,pos}
      then the list will be maintained in sorted order and
      insertBefore, insertAfter will only be allowed if they preserve the order
      and insert will use an O(log(N)) balanced binary insertion tree
      If there is no comparator then the insert function will always add at the
      end of the list.  Actually, this should be an subclass of WIDLL ...
    */
    this.comparator = false

  }

  size(feature) {
    feature = feature || 'count'
    return this.tln.size[feature] // don't count the start and end markers
  }

  insert(elt,pos){
    const size = this.size()
    if (pos == size) {
      return this.last.insertBefore(elt, this)
    } else if (pos>size || pos<0){
      throw new Error("trying to insert at pos "+pos+" in a list of size "+s)
    } else {
      const listNode = TreeList.nth(pos,this.tln,'count')

      if (this.comparator && this.comparator(listNode.val,elt)>0) {
        throw new Error("Attempt to insert violates the order of the list")
      }
      const z = listNode.insertBefore(elt,this);
      return z
    }
  }

  delete(pos){
    const size = this.size()
    if (pos < 0 || pos>=size){
      throw new Error("trying to delete element at pos "+pos+" in a list of size "+s)
    }
    const listNode = this.tln.nth(pos,'count')
    console.log('just found the listnode to delete '+listNode.val)
    console.dir(listNode)
    const z = listNode.delete(this);
    return z
  }


  toString(separator,feature) {
      let s="";
      feature = feature || "count"
      separator = separator || ""

      for(let d = this.first.next; d != this.last; d=d.next) {
        if (this.sizefn(d.val)[feature]>0) {
          s += d.val.sym.toString() + ((d.next===this.last)?"":separator)
        }
      }
      return s
  }

  toList(feature){
    feature = feature || "count"
    let s=[]
    for(let d = this.first.next; d != this.last; d=d.next) {
      if (this.sizefn(d.val)[feature]>0) {
        s.push(d.val.sym)
      }
    }
    return s
  }

  nth(n,feature){
    feature = feature || 'count'
    return TreeList.nth(n,this.tln,feature)
  }

}




/********************************************************
 * Here is an implementation of linked list nodes
 */
class ListNode{
  constructor(v,dll){
    this.prev = null
    this.next =null
    this.val = v
    this.dll=dll
    this.tln=null // this will get instantiated when the node is inserted in the list
    //console.dir(v)
    //console.log('in ListNode: v='+JSON.stringify(v))
    if ((v!==startmarker)&&(v!==endmarker)){
      this.size = dll.sizefn(v)
    } else {
      this.size = dll.emptySize
    }
  }


  toString(){
    return "ListNode("+this.val.toString() +")"
  }

  toStringIndent(k){
    return " ".repeat(k)+ this.val.toString()
  }

  indexOf(feature){
    //console.log("in indexOf "+feature)
    // this computes the index of the listnode wrt the feature
    // more precisely, this gives the sum of the weights
    // of all elements to the left of this listNode
    feature = feature || "count"
    let tln = this.tln // move to the treenode
    let index=0
    if (tln.left) {
      index += tln.left.size[feature]
    }

    while (tln.parent){
      if (tln.parent.right == tln) {
        const leftSize = 0
        if (tln.parent.left) {
          index += tln.parent.left.size[feature]
        }
        index += tln.parent.value.size[feature]
      } else {
      }
      tln = tln.parent
    }
    return index
  }


  insertBefore(a){
      if (this.val===startmarker){
        throw new Error("you can't insert before the startmarker")
      }
      var x = new ListNode(a,this.dll);
      var tmp = this.prev;
      this.prev=x;
      x.next = this;
      x.prev = tmp;
      x.prev.next = x;
      this.dll.tln = TreeList.insert(x)
      return x;
    }

  insertAfter(a){
    if (this.val===endmarker){
      throw new Error("you can't insert after the endmarker")
    }
    var x = new ListNode(a,this.dll);

    var tmp = this.next;
    this.next=x;
    x.prev = this;
    x.next = tmp;
    x.next.prev = x;
    this.dll.tln = TreeList.insert(x) // the top node could change
    return x;
  }

  delete(){
    if (this.val===startmarker){
      throw new Error("you can't delete the startmarker")
    } else if (this.val ===endmarker){
      throw new Error("you can't delete the endmarker")
    } else {
      const p = this.prev // could be startmarker
      const n = this.next // could be endmarker
      p.next=n
      n.prev=p
      this.dll.tln = TreeList.delete(this)
      return this.val
    }
  }

}





class TreeList {
  // This is an indexing tree built on top of the Doubly Linked List
  // it allows us to access the index of DLL node in O(log(N)) time
  // and to look up the DLL node at a particular index.
  // It also assumes that each node has a set of features
  // encoded as a JSON object size
  //    where each k has a non-negative number as a property
  // The index of a node with property p is the sum of the p-sizes
  // of all elements to the left of p. Each TreeList node has a size
  // which is the sum of the sizes of all DLL nodes in the tree.


  constructor(left,right,parent,size,value){
    this.left=left
    this.right=right
    this.size=size  //this is a tuple {count:1,p1:n1,...,pk:nk}
    this.parent=parent
    this.value = value
    this.height = 1

  }



  toStringIndent(k){
    // pretty print the tree for debugging purposes

      const leftTree = (!this.left?(" ".repeat(k+4)+"null[0]"):(this.left.toStringIndent(k+4)))
      const rightTree = (!this.right?(" ".repeat(k+4)+"null[0]"):(this.right.toStringIndent(k+4)))

      return  rightTree+
                ("\n"+" ".repeat(k)+
                  (this.value.val.toString()+
                   "[s="+JSON.stringify(this.size)+
                   ", h="+this.height
                   )+
                 "]\n")+
            leftTree
  }

  static nth(n,tln,feature){
    if (!tln) throw new Error("")
    return tln.nth(n,feature)
  }

  nth(n,feature){
    // find the nth element in the tree using weighted elements
    // find the element at position n in the DLL spanned by tln
    //console.log('in TreeList.nth '+n+' '+feature)
    //console.dir(this)
    const eltSize = this.value.size[feature]
    //console.log('eltSize= '+eltSize)
    if(n==0){
      //console.log('n=0 case')
      if (this.left && (this.left.size[feature]>0)){
        return this.left.nth(0,feature)
      } else if (this.value.size[feature]==0) {
        return this.right.nth(0,feature)
      } else {
        return this.value
      }
    } else if ((!(this.left) || (this.left.size[feature]==0)) && (n>=eltSize)){ // nothing on the left
        //console.log('nothing on left, n>0')
        return this.right.nth(n-eltSize,feature)
    } else if (n<this.left.size[feature]){
        //console.log('moving to left')
        return this.left.nth(n,feature)
    } else if ((n<(this.left.size[feature]+eltSize))){
        //console.log('found it')
        return this.value
    } else {
        //console.log('moving to the right')
        //console.log(JSON.stringify([n,this.left.size[feature],eltSize]))
        return this.right.nth(n-this.left.size[feature]-eltSize,feature)
    }
  }

  static insert(newNode){
    // insert the DLL node into the tree, assuming left/right neighbors are in tree
    const size = newNode.val.size
    if (newNode.prev.tln.right){
      // insert before the next element
      newNode.tln = new TreeList(null,null,newNode.next.tln,size,newNode)
      newNode.next.tln.left = newNode.tln
    } else {
      newNode.tln =new TreeList(null,null,newNode.prev.tln,size,newNode)
      newNode.prev.tln.right = newNode.tln
    }

    newNode.tln.rebalance()
    const z = newNode.tln.parent.avlRebalance()

    return z
  }

  static delete(oldNode){
    let oldT = oldNode.tln;
    //console.log('in DELETE '+oldNode.val)
    //console.dir(oldNode)
    if ((oldT.left==null) && (oldT.right==null)) {
      // if p is a leaf, just remove it and rebalance the parent
      //console.log("just removing the node and rebalancing parent")
      const q = oldT.parent
      if (q.left==oldT) { //remove oldT from tree
        q.left=null
      } else {
        q.right = null
      }
      q.rebalance()
      return q.avlRebalance()
    } else { // move either the previous or next
      //console.log("replacing node.val with prev value")

        let prevT = oldNode.prev.tln
        if (prevT.parent!=null) {
          //console.log("moving prev up")
          oldT.value = prevT.value  // copy prev value to root
          oldT.value.tln = oldT // reset the tln link
          if (prevT.left!=null) { // if prev has a child
            prevT.value = prevT.left.value // move it up
            prevT.value.tln = prevT // reset the tln link
            prevT.left = null // remove the left child
            prevT.rebalance()
            return prevT.avlRebalance() // and rebalance
          } else {
            let q = prevT.parent
            if (q.left==prevT) {
              q.left=null
            } else {
              q.right=null
            }
            q.rebalance()
            return q.avlRebalance()
          }
        } else {
          //console.log("prev is root, so moving next up");
          //console.dir(oldNode);
          let nextT = oldNode.next.tln;
          oldT.value = nextT.value  // copy next value to root
          oldT.value.ltn = oldT
          if (nextT.right!=null) { // if next has a child
            nextT.value = nextT.right.value // move it up
            nextT.value.ltn = nextT //reset its ltn link
            nextT.right = null // remove the right child
            nextT.rebalance()
            return nextT.avlRebalance() // and rebalance
          } else {
            let q = nextT.parent
            if (q.left==nextT) { // remove nextT from the tree
              q.left=null
            } else {
              q.right=null
            }
            q.rebalance()
            return q.avlRebalance()
          }

        }
      }

  }

  binaryInsert(elt,comparator){
    /* This inserts a node into the DLL by finding its position in the list
       It assumes that the list is ordered by the node.val fields wrt the
       comparator function. It returns the new node it creates.
       This only works if the tree has been created entirely using binaryInsert
    */
    if ((this.value.val===startmarker)
         ||
         (comparator(elt,this.value.val)>=0))   {
       if (this.right) {
         return this.right.binaryInsert(elt,comparator)
       } else {
         return this.value.insertAfter(elt)
       }
    } else {
        if (this.left){
          return this.left.binaryInsert(elt,comparator)
        } else {
          return this.value.insertBefore(elt)
        }
    }

  }

  binarySearch(elt,comparator){
    /* This inserts a node into the DLL by finding its position in the list
       It assumes that the list is ordered by the node.val fields wrt the
       comparator function. It returns the new node it creates.
    */
    if ((this.value.val===startmarker)
         ||
         (comparator(elt,this.value.val)>0))   {
       if (this.right) {
         return this.right.binarySearch(elt,comparator)
       } else {
         return false
       }
    } else if
         ((this.value.val===endmarker)
         ||
         (comparator(elt,this.value.val)<0)){
        if (this.left){
          return this.left.binarySearch(elt,comparator)
        } else {
          return false
        }
    } else { //they are equal
      return this.value
    }

  }


  avlRebalance(){
    // rebalance the tree above this, assuming this is balanced
    //console.log("\n\n\n\n*******\nin avlRebalance: ")
    //console.log(this.toStringIndent(5))
    //console.log(" in ")
    let rebalancedTree = null
    //if (this.parent) console.log(this.parent.toStringIndent(5))
    const p = this.parent
    if (!p) return this
    // first we check to see if this is unbalanced, and if so we call avlRebalance
    // on one of its children...
    if (this.unbalanced()){
      //console.log("THIS is UNBALANCED!!")
      if (this.leftheavy) {
        //console.log('BALANCING ON LEFT')
        rebalancedTree = this.left.avlRebalance()
      } else {
        //console.log('BALANCING ON RIGHT')
        rebalancedTree =  this.right.avlRebalance()
      }
    } else if (!p.unbalanced()) {
      return this.parent.avlRebalance()
    } else { // rotate to
      if (p.left==this) {
        if (this.leftHeavy()){ //LL
          p.rightRotate()
        } else {                //LR
          this.leftRotate()
          p.rightRotate()
        }
      } else {
        if (this.rightHeavy()){   //RR
          p.leftRotate();
        } else {                  //RL
          this.rightRotate();
          p.leftRotate();
        }
      }
      rebalancedTree =  this.avlRebalance()  // as the node moved to its parent position
    }
    //console.log('REBALANCED TREE:\n'+rebalancedTree.toStringIndent(5))
    return rebalancedTree
  }

  leftHeavy(){
    const leftHeight = (this.left?this.left.height:0)
    const rightHeight = (this.right?this.right.height:0)
    return leftHeight >= rightHeight
  }

  rightHeavy(){
    const leftHeight = (this.left?this.left.height:0)
    const rightHeight = (this.right?this.right.height:0)
    return leftHeight <= rightHeight
  }

  unbalanced(){
    const leftHeight = (this.left?this.left.height:0)
    const rightHeight = (this.right?this.right.height:0)
    return (leftHeight-rightHeight>1)||(rightHeight-leftHeight>1)
  }
  rebalance(){
    // I need to add height fields and use AVL ..
    console.log('entering rebalance')
    console.dir(this)
    const nullSize = {}
    for(let x in this.value.size){
      nullSize[x]=0
    }

    const leftSize = (this.left?this.left.size:nullSize)
    const rightSize = (this.right?this.right.size:nullSize)
    const leftHeight = (this.left?this.left.height:0)
    const rightHeight = (this.right?this.right.height:0)
    console.dir(this.value)
    const eltSize = this.value.size;

    this.size=nullSize
    for (let x in this.size){
      this.size[x] = leftSize[x]+rightSize[x]+eltSize[x]
    }
    console.log('updating the size')
    console.dir([this,leftSize,rightSize,eltSize,nullSize])
    //this.size = leftSize+rightSize+1
    this.height = Math.max(leftHeight, rightHeight)+1


    if (this.parent){
      this.parent.rebalance()
    }
  }

  rightRotate(){
    const z = this
    const y = z.left
    const x = y.left  // error?
    const p = z.parent
    const t3 = y.right
    y.right = z
    y.parent = z.parent
    if (p){
      if (p.left==z) {
        p.left=y
      } else {
        p.right = y
      }
    }
    z.parent = y
    z.left = t3
    if (t3) t3.parent = z
    z.rebalance()
    y.rebalance()
    return y
  }

  leftRotate(){
    const z = this
    const y = z.right
    const x = y.right
    const p = z.parent
    const t2 = y.left
    y.left = z
    y.parent = z.parent
    if (p){
      if (p.left==z) {
        p.left=y
      } else {
        p.right = y
      }
    }
    z.parent = y
    z.right = t2
    if (t2) t2.parent = z
    z.rebalance()
    y.rebalance()
    return y
  }


}

window.wiDLL = wiDLL
window.ListNode = ListNode
window.TreeList = TreeList
