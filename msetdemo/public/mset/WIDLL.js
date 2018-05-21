export {WIDLL}
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
class WIDLL {
  constructor(sizefn){
    // initialize the sizefn
    this.sizefn = (sizefn || ((x)=>({count:1})))
    // make sure it ignores the start and end markers
    this.emptySize = this.sizefn(null)
    for(let x in this.emptySize){
      this.emptySize[x]=0
    }

    // initialize the start and end markers
    this.first = new ListNode("startmarker",this);
    this.first.size= this.emptySize
    this.last = new ListNode("endmarker",this);
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
    if (this.comparator && !pos){
      return this.tln.binaryInsert(elt,this.comparator)
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
    const listNode = TreeList.nth(pos,this.tln,'count')
    const z = listNode.delete(this);
    return z
  }

  indexOf(elt,feature){
    let index=-1
    if (this.comparator){
      feature = feature || "edit"
      const indexObj = this.tln.binarySearch(elt,this.comparator)
      index = (indexObj)?indexObj.indexOf(feature):-1
    } else {
      let x = this.first.next;
      let index = 0
      while (x!= this.last){
        if (x.value == elt) {
          return index
        } else {
          if (!feature) {
            index++;
          } else {
            index += x.size[feature]
          }
          x = x.next
        }
      }
      if (x==this.last) {
        index = -1
      }
    }
    return index
  }

  toString(separator,feature) {
      let s="";
      feature = feature || "count"
      separator = separator || ""

      for(let d = this.first.next; d != this.last; d=d.next) {
        if (this.sizefn(d.val)[feature]>0) {
          s += d.val + ((d.next==this.last)?"":separator)
        }
      }
      return s
  }



  nthDLL(n,feature){
    // this is the slow version that uses the linked list ..
    feature = feature || 'count'
    var k=this.first.next;
    while (n>0 && (k!= this.last) ) {
      n = n - this.value.sizefn(feature)
      k=k.next;
    }
    if (n>0) {
      return null // return null if the weighted size of the list is < n
    } else {
      return k
    }

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
    this.tln=null

    if ((v!='startmarker')&&(v!='endmarker')){
      //v.listNode=this
      this.size = dll.sizefn(v)
    } else {
      this.size = dll.emptySize
    }
  }


  toString(){
    return "ListNode("+this.val+")"
  }

  toStringIndent(k){

    return " ".repeat(k)+(this.val.val || this.val)
  }

  indexOf(feature){
    // this computes the index of the listnode wrt the feature
    // more precisely, this gives one more than the number of
    // elements with the specified feature to the left of this listnode
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
          index += tln.parent.left.size[feature] +
                   tln.parent.value.size[feature]
        }
      }
      tln = tln.parent
    }
    return index
  }


  insertBefore(a){
      if (this.dll.comparator &&
          this.dll.comparator(this.val,a)<0) {
            throw new Error("Call to insertBefore violates the order of the list")
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
      if (this.dll.comparator &&
          this.dll.comparator(this.val,a)>0) {
            throw new Error("Call to insertAfter violates the order of the list")
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
      const p = this.prev // could be startmarker
      const n = this.next // could be endmarker
      p.next=n
      n.prev=p
      this.dll.tln = TreeList.delete(this)
      return this.val
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
    // pretty print the tree

      const leftTree = (!this.left?(" ".repeat(k+4)+"null[0]"):(this.left.toStringIndent(k+4)))
      const rightTree = (!this.right?(" ".repeat(k+4)+"null[0]"):(this.right.toStringIndent(k+4)))

      return  rightTree+
                ("\n"+" ".repeat(k)+
                  (this.value.val+
                   "[s="+JSON.stringify(this.size)+
                   ", h="+this.height
                   )+
                 "]\n")+
            leftTree
  }

  static nth(n,tln,feature){
    // find the nth element in the tree rooted at tln
    // which has the specified feature
    console.log("Calling nth "+n)
    console.log(tln.toStringIndent(5))
    if (!tln) throw new Error("")

    // find the element at position n in the DLL spanned by tln
    const eltSize = tln.value.size[feature]
    if(n==0){

      if (tln.left && (tln.left.size[feature]>0)){
        return TreeList.nth(0,tln.left,feature)
      } else if (tln.value.size[feature]==0) {
        return TreeList.nth(0,tln.right,feature)
      } else {
        return tln.value
      }
    } else if (!(tln.left) || (tln.left.size[feature]==0)){ // nothing on the left
        return TreeList.nth(n-eltSize,tln.right,feature)
    } else if (n<tln.left.size[feature]){
          return TreeList.nth(n,tln.left,feature)
    } else if ((n==tln.left.size[feature]) && (eltSize==1)){
      return tln.value
    } else {
        return TreeList.nth(n-tln.left.size[feature]-eltSize,tln.right,feature)
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
    if ((oldT.left==null) && (oldT.right==null)) {
      // if p is a leaf, just remove it and rebalance the parent
      const q = oldT.parent
      if (q.left==oldT) { //remove oldT from tree
        q.left=null
      } else {
        q.right = null
      }
      return q.avlRebalance()
    } else { // move either the previous or next


        let prevT = oldNode.prev.tln
        if (prevT.parent!=null) {
          oldT.value = prevT.value  // copy prev value to root
          if (prevT.left!=null) { // if prev has a child
            prevT.value = prevT.left.value // move it up
            prevT.left = null
            return prevT.avlRebalance() // and rebalance
          } else {
            let q = prevT.parent
            if (q.left==prevT) {
              q.left=null
            } else {
              q.right=null
            }
            return q.avlRebalance()
          }
        } else {
          let nextT = oldNode.next.tln;
          oldT.value = nextT.value  // copy next value to root
          if (nextT.right!=null) { // if next has a child
            nextT.value = nextT.right.value // move it up
            nextT.right = null
            return nextT.avlRebalance() // and rebalance
          } else {
            let q = nextT.parent
            if (q.left==nextT) { // remove nextT from the tree
              q.left=null
            } else {
              q.right=null
            }
            return q.avlRebalance()
          }

        }
      }

  }

  binaryInsert(elt,comparator){
    /* This inserts a node into the DLL by finding its position in the list
       It assumes that the list is ordered by the node.val fields wrt the
       comparator function. It returns the new node it creates.
    */
    if ((this.value.val=='startmarker')
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
    if ((this.value.val=='startmarker')
         ||
         (comparator(elt,this.value.val)>0))   {
       if (this.right) {
         return this.right.binarySearch(elt,comparator)
       } else {
         return false
       }
    } else if
         ((this.value.val=='endmarker')
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
    // rebalance the tree above this, assuming this is unbalanced
    const p = this.parent
    if (!p) return this
    if (!p.unbalanced()) {
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
      return this.avlRebalance()  // as the node moved to its parent position
    }
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
    const nullSize = {}
    for(let x in this.value.size){
      nullSize[x]=0
    }

    const leftSize = (this.left?this.left.size:nullSize)
    const rightSize = (this.right?this.right.size:nullSize)
    const leftHeight = (this.left?this.left.height:0)
    const rightHeight = (this.right?this.right.height:0)
    const eltSize = this.value.size;

    this.size=nullSize
    for (let x in this.size){
      this.size[x] = leftSize[x]+rightSize[x]+eltSize[x]
    }
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


class Testing {

    constructor(){
      // do nothing ...
    }

    static test3(){
      const x = new DLL()
      for(let i=0; i<10;i++){
        const a = new Element(i,(i%3)==0,(i%3)==1)
        x.first.insertAfter(a)
      }
      console.log('****\nx.tln=\n'+x.tln.toStringIndent(5)+"\n****\n")
      for(let i=0; i<x.size()+2;i++){
        console.log('nth edit '+i+" = "+TreeList.nth(i,x.tln,"edit"))
      }

      return x
    }

    static test4(){
      const x = new DLL()

      for(let i=0; i<10;i++){
        const a = new Element(i,(i%3)==0,(i%3)==1)
        if (i%2==0){
          x.first.insertAfter(a)
        } else {
          x.first.next.insertAfter(a)
        }

      }
      console.log('****\nx.tln=\n'+x.tln.toStringIndent(5)+"\n****\n")
      const feature = "edit"
      console.log(feature)
      console.log(x.size(feature))
      console.log(JSON.stringify(x.tln.size))
      for(let i=0; i<x.size(feature);i++){
        const z = TreeList.nth(i,x.tln,feature)
        console.log('nth '+i+" "+feature+" = "+ z)
        for(let f in z.size){
          console.log('index '+f+' = '+z.indexOf(f))
        }
      }
      return x
    }

}
