export {DLLwi}
/********************************************************
  Here is an AVL implementation of weighted treelist nodes

  Simplest case is to use it as a Doubly Linked List Implementation
  in which you can also find the node an a given index and look up
  the index of a node, both in log(N) time

  sizefn(elt) returns a json object which specifies the sizes of the element
     with respect to various user-defined features. It must return an object
     of the form:
        {count:n0, p1:n2, ...., p2:n2}
    where the ni are positive numbers. The property count is mandatory,
     but the other pi are optional. Also, the sizefn should give a value to the
     null object (and any falsey value) which is 0 for all features. The
     default sizefn is
        (x)=>(x?{count:1}:{count:0})

  */


const startmarker="startmarker"
const endmarker="endmarker"




class DLLwi {
  constructor(sizefn){
    // initialize the sizefn if the user doesn't supply one
    this.sizefn = (sizefn || ((x)=>({count:1})))
    // create an emptySize which has size 0 for all features
    this.emptySize = createEmptySize(this.sizefn)
    //this.listSize = this.emptySize

    this.isAVL = true // use to get the AVL version of DLL



    // initialize the start and end markers to the emptySize
    this.first = new ListNode(startmarker,this);
    this.first.elementSize= this.emptySize

    this.last = new ListNode(endmarker,this);
    this.last.elementSize=this.emptySize

    this.first.nodeid=-1;
    this.last.nodeid=-1;
    this.first.next = this.last;
    this.last.prev = this.first;

    // the rest of this only matters if isAVL is true..
    const endTree = new TreeList(null,null,null,this.last)
    this.last.tln = endTree
    endTree.sublistSize = this.emptySize

    const startTree = new TreeList(null,null,null,this.first)
    this.first.tln = startTree
    startTree.sublistSize = this.emptySize
    startTree.right = endTree
    endTree.parent = startTree
    this.tln = startTree


    //debug.log('any',"In DLLwi constructor, this = ")
    //debug.dir('any',this)

  }

  size(feature) {
    feature = feature || 'count'
    return this.tln.sublistSize[feature]
    //return this.tln.size[feature] // don't count the start and end markers
  }

  insertList(pos,elts,feature){

    let node = (pos<this.size(feature))?this.nth(pos,feature):this.last
    elts.forEach((e)=>(node.insertBefore(e)))
    return node
  }

  insert(pos,elt,feature){
    feature = feature || 'count'
    //debug.dir('insert',this)
    //debug.log('insert','INSERTING: '+JSON.stringify([pos,elt,feature,this.tln.sublistSize]))
    if ((pos==undefined) || (elt==undefined)){
      throw new Error("DLLwi insert must be called with 2 parameters: pos and elt")
    }

    if (!this.isAVL) {
      return this.insertSlow(pos,elt,feature)
    }

    const size = this.tln.sublistSize[feature]
    if (pos>size || pos<0){
      throw new Error("trying to insert at pos "+pos+" in a list of size "+size)
    } else if (pos == size) {
      //debug.log("insert","case of pos==size = "+size)
      return this.last.insertBefore(elt)
    } else {
      //debug.log("insert","finding nth element then inserting: n="+pos+" size= "+size)
      //debug.dir([elt,pos,size,this])
      const listNode = this.nth(pos,'count')
      //debug.log("insert","found the nth element"+listNode.data+" now inserting before "+this.data)
      const z = listNode.insertBefore(elt);
      return z
    }
  }

  deleteRange(start,n,feature){
    // remove the n elements starting at position start

    if (n+start >= this.size()) {
      throw new Error("Error in deleterange: you can not delete past the end of the list")
    } else if ((n<0) || (start<0)) {
      throw new Error("Error in deleteRange(s,n): both s and n must be non-negative")
    } else {
      for(let i=0;i<n;i++){
        this.delete(start,feature)
      }
    }
  }

  delete(pos,feature){
    feature = feature || 'count'
    if (pos==undefined){
      throw new Error("DLLwi delete must be called with one element, pos, the position to delete")
    }

    if (!this.isAVL) {
      return this.deleteSlow(pos,feature)
    }

    const size = this.tln.sublistSize[feature]
    if (pos < 0 || pos>=size){
      throw new Error("trying to delete element at pos "+pos+" in a list of size "+size)
    }
    //debug.log('delete','in ListNode.delete '+pos+" "+feature)
    //debug.dir('delete',this)

    let listNode = this.nth(pos,feature)
    //this.listSize = ListNode.subtractSizes(this.listSize,listNode.elementSize)

    const z = listNode.delete()

    return z
  }


  toString(separator,feature) {
      separator = separator || ""
      feature = feature || "count"

      let s="";
      for(let d = this.first.next; d != this.last; d=d.next) {
        if (this.sizefn(d.data)[feature]>0) {
          s += d.data.toString() + ((d.next===this.last)?"":separator)
        }
      }
      return s
  }

  toList(feature){
    feature = feature || "count"
    let s=[]
    for(let d = this.first.next; d != this.last; d=d.next) {
      if (this.sizefn(d.data)[feature]>0) {
        s.push(d.data)
      }
    }
    return s
  }

  nth(n,feature){
    if (!this.isAVL) {
      return this.nthSlow(n, feature)
    }
    feature = feature || 'count'
    if (n<0) {
      throw new Error("nth must be called with positive numbers, not "+n)
    } else if (n>=this.size(feature)){
      console.dir([n,feature,this])
      console.log(this.tln.toStringIndent(5))
      console.log(this.toList('count').map((x)=>(x.toString())))
      throw new Error("nth must be called with a number smaller than the size:"+
          "n="+n+" but size("+feature+")="+this.size(feature))
    }
    return TreeList.nth(n,this.tln,feature)
  }

  nthSlow(n,feature){
    feature = feature || 'count'
    let pos = this.first
    let i=0
    while ((i<=n) && (pos!=this.last)){
      pos = pos.next
      i += this.sizefn(pos.data)[feature]
    }
    return pos
  }

  insertSlow(n,elt,feature){
    feature = feature || 'count'
    let pos = this.first
    let i=0
    while ((i<n) && (pos!=this.last)){
      pos = pos.next
      i += this.sizefn(pos.data)[feature]
    }
    if (i<n) {
      throw new Error("Error in insert: trying to insert beyond the end of the list")
    } else if (pos==this.last){
      this.last.insertBefore(elt)
    } else {
      pos.insertAfter(elt)
    }
  }

  deleteSlow(n,feature){
    feature = feature || 'count'
    let pos = this.first
    let i=0
    while ((i<=n) && (pos!=this.last)){
      pos = pos.next
      i += this.sizefn(pos.data)[feature]
    }
    if (pos==this.last) {
      throw new Error("Error in delete: trying to delete beyond the end of the list")
    } else {
      pos.delete()
    }
  }

}


function createEmptySize(sizefn){
  const size = sizefn(null)
  let emptySize={}
  for(let x in size){ // everything but count should be zero anyway
    emptySize[x]=0
  }
  return emptySize
}




/********************************************************
 * Here is an implementation of linked list nodes
 */
class ListNode{
  constructor(v,dll){
    this.prev = null
    this.next =null
    this.hiddenData = v // we access this with getters and setters ..
    this.dll=dll
    this.tln=null
    if ((v!==startmarker)&&(v!==endmarker)){
      this.elementSize = dll.sizefn(v)
    } else {
      this.elementSize = dll.emptySize
    }

  }

  get data(){
    return this.hiddenData
  }

  set data(val){
    this.hiddenData =val
    this.elementSize = this.dll.sizefn(val)
    if (this.dll.isAVL){
      console.log("updating the weights after setting the data")
      console.dir([val,this])
      this.tln.updateWeights()  // update the sublistSize for node and all ancestors
    }

  }

  toString(){
    return "ListNode("+this.data.toString() +")"
  }


//  MOVE THIS METHOD TO TREELIST  AS IT IS PRIMARILY A TREE METHOD

  indexOf(feature){
    // this computes the index of the listnode wrt the feature
    // more precisely, this gives the sum of the weights
    // of all elements to the left of this listNode
    feature = feature || "count"
    let tln = this.tln // move to the treenode
    let index=0
    if (tln.left) {
      index += tln.left.sublistSize[feature]
    }

    while (tln.parent){
      indexOfCounter++
      if (tln.parent.right == tln) {
        const leftSize = 0
        if (tln.parent.left) {
          index += tln.parent.left.sublistSize[feature]
        }
        index += tln.parent.listNode.elementSize[feature]
      } else {
      }
      tln = tln.parent
    }
    return index
  }


  insertBefore(a){
      if (this.data===startmarker){
        throw new Error("you can't insert before the startmarker")
      }
      var x = new ListNode(a,this.dll);

      var tmp = this.prev;
      this.prev=x;
      x.next = this;
      x.prev = tmp;
      x.prev.next = x;
      if (this.dll.isAVL){
        this.dll.tln = this.tln.insertBefore(x)
      }
      //this.dll.listSize = ListNode.addSizes(this.dll.listSize,this.dll.sizefn(a))
      return x;
    }


  insertAfter(a){
    if (this.data===endmarker){
      throw new Error("you can't insert after the endmarker")
    }
    var x = new ListNode(a,this.dll);

    var tmp = this.next;
    this.next=x;
    x.prev = this;
    x.next = tmp;
    x.next.prev = x;
    if (this.dll.isAVL){
      this.dll.tln = this.tln.insertAfter(x)
    }
    //this.dll.listSize = ListNode.addSizes(this.dll.listSize,this.dll.sizefn(a))
    return x;
  }

  delete(){
    if (this.data===startmarker){
      throw new Error("you can't delete the startmarker")
    } else if (this.data ===endmarker){
      throw new Error("you can't delete the endmarker")
    } else {
      const p = this.prev // could be startmarker
      const n = this.next // could be endmarker
      p.next=n
      n.prev=p
      if (this.dll.isAVL){
        this.dll.tln = this.tln.delete()
      }
      return this.data
    }
  }

// make these into local function, not static methods ...
  static addSizes(s1,s2){
    let newSize={}
    for (let x in s1){
      newSize[x] = s1[x]+s2[x]
    }
    //debug.log('any','in addSizes [s1,s2,s1+s2]= '+ JSON.stringify([s1,s2,newSize]))
    return newSize
  }

  static subtractSizes(s1,s2){
    let newSize={}
    for (let x in s1){
      newSize[x] = s1[x]-s2[x]
    }
    //debug.log('any','in subtractSizes [s1,s2,s1+s2]= '+ JSON.stringify([s1,s2,newSize]))
    return newSize
  }

}


let avlCounter=0  // counts number of AVL operations
let updateWeightsCounter = 0
let nthCounter = 0
let indexOfCounter=0
window.avlInfo=(()=>({a:avlCounter,u:updateWeightsCounter,n:nthCounter,i:indexOfCounter}))
window.avlReset= function(){avlCounter=0;updateWeightsCounter=0;nthCounter=0;indexOfCounter=0}

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

  // The methods here are implemented without the assumption that
  // the listNode objects are doubly linked lists. We assume those
  // links have been made or will be made by others and so this
  // treats them simply as values to be moved around as if they were
  // numbers or strings ...
  // we do assume that they have a size listNode.size
  // which we use in nth


  constructor(left,right,parent,listNode){
    this.left=left
    this.right=right
    this.parent=parent
    this.listNode = listNode
    this.height = 1
    this.sublistSize = null

  }

  treeSize(){
    let leftSize = this.left?this.left.treeSize():0
    let rightSize = this.right?this.right.treeSize():0
    return leftSize+rightSize+1
  }

  printStringIndent(k){
    k = k || 1
    if (this.left) {
      this.left.printStringIndent(k+4)
    }

    console.log(k+"\n"+(" ".repeat(k)+
        (this.listNode.data.toString()+
         "[s="+JSON.stringify(this.sublistSize)+
         ", h="+this.height
         )+
       "]\n"))

    if(this.right){
      this.right.printStringIndent(k+4)
    }
  }


  toStringIndent(k){
    // pretty print the tree for debugging purposes



      const leftTree = (!this.left?(" ".repeat(k+4)+"null[0]"):(this.left.toStringIndent(k+4)))
      const rightTree = (!this.right?(" ".repeat(k+4)+"null[0]"):(this.right.toStringIndent(k+4)))

      return  rightTree+
                ("\n"+" ".repeat(k)+
                  ((this.listNode?this.listNode.data.toString():'deleted')+
                   "[s="+JSON.stringify(this.sublistSize)+
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
    nthCounter++

    // find the nth element in the tree using weighted elements
    // find the element at position n in the DLL spanned by tln
    //log('nth','in TreeList.nth '+n+' '+feature)
    //debug.dir('nth',this)
    const eltSize = this.listNode.elementSize[feature]
    const leftSize = this.left?this.left.sublistSize[feature]:0
    const rightSize = this.right?this.right.sublistSize[feature]:0
    //debug.log('nth','eltSize= '+eltSize)
    //debug.log('nth',this.toStringIndent(5))
    if(n==0){
      //debug.log('nth','n=0 case')
      if (leftSize>0) {
        return this.left.nth(0,feature)
      } else if (eltSize==0) {
        return this.right.nth(0,feature)
      } else {
        return this.listNode
      }
    } else {

      if (n<leftSize){
        //debug.log('nth','going to left')
        return this.left.nth(n,feature)
      } else if (n-leftSize<eltSize){
        //debug.log('nth','found it')
        return this.listNode
      } else {
        //debug.log('nth',"moving to right")
        return this.right.nth(n-leftSize-eltSize,feature)
      }

    }
  }

  prevTreeNode(){
    // find the previous TreeList node
    // by finding the rightmost descendent of the left child
    //
    let node = this
    if (node.left) {
      node = node.left
      while(node.right){
        node = node.right
      }
    } else if (node.parent && (node.parent.right==node)){
      node = node.parent
    } else {
      while (node.parent && (node.parent.left== node)){
        node = node.parent
      }
    }
    return node
  }

  nextTreeNode(){
    // find the previous TreeList node
    // by finding the rightmost descendent of the left child
    let node = this
    if (node.right) {
      node = node.right
      while(node.left){
        node = node.left
      }
    } else if (node.parent && (node.parent.left==node)){
      node = node.parent
    } else {
      while (node.parent && (node.parent.right== node)){
        node = node.parent
      }
    }
    return node
  }

  insertBefore(newNode){
    // this returns the root of the new AVL tree

    let node = this.left
    if (node) {
      let prevNode = this.prevTreeNode()
      node = new TreeList(null,null,prevNode,newNode)
      prevNode.right = node
    } else {
      node = new TreeList(null,null,this,newNode)
      this.left = node
    }
    //node.updateHeightWeights()
    let root = node.avlRebalance()
    node.listNode.tln = node
    return root
  }

  insertAfter(newNode){
    // this must rebalance the tree and return the root of the new AVL tree

    let node = this.right
    if (node) {
      let nextNode = this.nextTreeNode()
      node = new TreeList(null,null,nextNode,newNode)
      nextNode.left = node
    } else {
      node = new TreeList(null,null,this,newNode)
      this.right = node
    }
    //node.updateHeightWeights()
    let root = node.avlRebalance()
    node.listNode.tln = node
    return root
  }


/*

REWRITE THIS WHOLE METHOD!!
AND MAKE IT CLEAR AND EASY TO VALIDATE!!
*/
  delete(){
    // this delete "this" treenode, rebalances the tree, and returns the root of the new AVL tree
    // we assume that node itself has already been deleted from the list
    let treeNode = this;

    //debug.log('delete','in DELETE case 1 ='+treeNode.listNode)
    //debug.log('delete','from '+treeNode.listNode.dll.tln.toStringIndent(5))

    // dll and deletedData are for debugging purposes ...
    const dll = this.listNode.dll
    const deletedData = treeNode.listNode.hiddenData

    // we delete the listNode from the tree and its reference to the tree ..
    treeNode.listNode.tln = null
    treeNode.listNode = null

    // we get the parent of the node (which could be null)
    let parent = treeNode.parent

    const parentOrig = parent //we redefine parent in case 3



    if ((treeNode.left==null) && (treeNode.right==null)) {
      //debug.log('delete',"delete case 1: just remove the node and rebalance parent")
      if (!parent){
        throw new Error("can't delete the start and end markers")
      }
      if (parent.left==treeNode) { //remove treeNode from tree
        parent.left=null
      } else {
        parent.right = null
      }
      treeNode.parent = null
      //parent.updateHeightWeights() // update the heights and weights of ancestors
      return parent.avlRebalance()
    } else if ((treeNode.left==null)||(treeNode.right==null)){
      // if it has only one child, move the child up
      //debug.log('delete',"delete case 2: replacing node with its one child, a leaf")
      if (!parent) {
          throw new Error("you can't delete the startmaker or endmarker: ")
      }
      let child = treeNode.left?treeNode.left:treeNode.right
      treeNode.left = null
      treeNode.right = null

      if (parent.left == treeNode){ //case 2a
        parent.left = child
      } else {
        parent.right=child
      }
      child.parent = parent

      treeNode.parent = null
      //parent.updateHeightWeights();
      return parent.avlRebalance()

    } else {
      // treeNode has two children, so move the successor up and delete the successor
      let nextT = treeNode.nextTreeNode()
      //debug.log('delete',"delete case 3 replacing "+deletedData+ " with its successor "+nextT.listNode.data+ " which we delete")
      //debug.log('delete','nextT = \n'+nextT.toStringIndent(5))

      treeNode.listNode = nextT.listNode
      treeNode.listNode.tln = treeNode
      nextT.listNode = null

      // there are two cases here.
      // case 3a nextT is the right child of treeNode
      // case 3b nextT is the left child of a node
      //         which is a left descendent of a right child of treeNode

      if (treeNode.right == nextT){
        //debug.log('delete','delete case 3a, successor is right child of treeNode')
        parent = treeNode  // which is treeNode in this case ...
        let child = nextT.right // could be null
        treeNode.right = child
        nextT.right = null
        nextT.parent = null
        if (child){
          child.parent = parent
        }
        //treeNode.updateHeightWeights()
        return treeNode.avlRebalance()

      } else {
        //debug.log('delete','delete case 3b, successor is a left child')
        parent = nextT.parent
        nextT.parent = null
        let child = nextT.right
        nextT.right = null

        parent.left = child
        if (child){
          child.parent = parent
        }
        //parent.updateHeightWeights()
        return parent.avlRebalance()
      }
    }
  }

  isAVLunbalanced(){
    return
      this.unbalanced() ||
      (this.left || this.left.unbalanced()) ||
      (this.right || this.right.unbalanced())
  }


  avlRebalance(){
    avlCounter++
      // We assume this is called on a newly inserted node or
      // on the parent of a leaf node that has been deleted
      // it will return the root of the newly balanced avl tree
      // we can assume that the left and right subtrees are balanced

    //debug.log('avl','rebalancing subtree with root '+this.listNode)

    this.updateNodeHeightWeight() // update the sublistSize and height fields

    const p = this.parent  // could be null
    //debug.log('avl','getting parent: '+(p?p.listNode:null))
    // first we check to see if this is unbalanced,
    // this will only happen in the case of a deletion
    // when we call rebalance on the parent of the deleted leaf
    // and in this case, its child is balanced
    // our strategy is to call avlRebalance on the larger subtree
    // if it is unbalanced and otherwise to assume that it is balanced
    // but its parent might not be and that our node is heavier than its sibling.
    // We will then balance the parent and recurse up to the root ..

    if (this.unbalanced()){
      //debug.log('avl','calling AVL on unbalanced parent of a deleted node')
      if (this.leftHeavy()) {
        return this.left.avlRebalance()
      } else {
        return this.right.avlRebalance()
      }
    } else if (!p ) {
      //debug.log('avl','this = root of the tree and the tree is now balanced')
      return this
    }else
    // the invariant here is that p is a node whose children are balanced
    // and our goal is to perform one of the four AVL transforms to balance
    // this node and possibly increase or decrease its height,
    // then continue up the tree. If it is already balanced we are done!
    if (!p.unbalanced() ) {
      //debug.log('avl','parent is balanced so tree is to and returning root')
      return  this.parent.avlRebalance()
      //return this.root()
    } else {
      if (p.leftHeavy() && (p.right==this)) {
        //debug.log('avl','left sibling is heavier, switching to that side')
        return this.parent.left.avlRebalance()
      } else if (p.rightHeavy() && (p.left==this)){
        //debug.log('avl','right sibling is heavier, switching to that side')
        return this.parent.right.avlRebalance()
      }
      //debug.log('avl','parent subtree is unbalanced and this is the heavier child:')
      // we perform the appropriate rotations, which update the heights and sizes
      // and makes the parent of this node one of its children!
      if (p.left==this) {
        if (this.leftHeavy()){ //LL
          //debug.log('avl',"LL")
          p.rightRotate()
        } else {                //LR
          //debug.log('avl',"LR")
          this.leftRotate()
          p.rightRotate()
        }
      } else {
        if (this.rightHeavy()){   //RR
          //debug.log('avl',"RR")
          p.leftRotate();
        } else {                  //RL
          //debug.log('avl',"RL")
          this.rightRotate();
          p.leftRotate();
        }
      }
      //debug.log('avl','PARTLY REBALANCED TREE:\n'+this.toStringIndent(5))
      return  this.avlRebalance()  // as the node moved to its parent position
    }
  }

  root(){
    let node = this
    while (node.parent){
      node = node.parent
    }
    return node
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

  updateNodeHeightWeight(){
    const node = this

    const leftHeight = (node.left?node.left.height:0)
    const rightHeight = (node.right?node.right.height:0)
    const newHeight =  Math.max(leftHeight, rightHeight)+1

    if (newHeight>100) throw new Error("height>100!!")
    if (Math.abs(leftHeight-rightHeight)>2) {
      console.dir(node)
      console.log(node.listNode.dll.tln.toStringIndent(5))
      throw new Error("heights seriously unbalanced!!")
    }

    const nullSize = {}
    for(let x in node.listNode.elementSize){
      nullSize[x]=0
    }

    const leftSize = (node.left?node.left.sublistSize:nullSize)
    const rightSize = (node.right?node.right.sublistSize:nullSize)
    const eltSize = node.listNode.elementSize;

    let newSize={}
    for (let x in nullSize){
      newSize[x] = leftSize[x]+rightSize[x]+eltSize[x]
    }

    node.height = newHeight
    node.sublistSize = newSize
  }

  updateWeights(){

    // update the weights for the current node an all its ancestors
    //console.log('updating weights')
    let node = this
    let newSize={}
    const nullSize = {}
    for(let x in node.listNode.elementSize){
      nullSize[x]=0
    }

    while(node){
      updateWeightsCounter ++
      const leftSize = (node.left?node.left.sublistSize:nullSize)
      const rightSize = (node.right?node.right.sublistSize:nullSize)
      const eltSize = node.listNode.elementSize;
      newSize={}
      for (let x in nullSize){
        newSize[x] = leftSize[x]+rightSize[x]+eltSize[x]
      }
      //console.log(JSON.stringify([eltSize,leftSize,rightSize,newSize]))
      //console.dir(node)

      node.sublistSize = newSize
      node = node.parent
    }

  }


  updateHeightWeights(){
    let node=this

    while(node){
      node.updateNodeHeightWeight()
      node=node.parent()
    }
  }


  updateHeightWeights2(){
    let node = this
    let k=1
    let vals=[]
    while(node){
      k++
      if ( node.listNode && vals.includes(node.listNode.hiddenData)){
        console.dir(['loop',node.listNode.hiddenData,vals,this,node,k])
        throw new Error("infinite loop")
      }
      if (node.height>100){
        console.log('too tall')
        console.dir(node)
        //node.printStringIndent()
        //console.log(node.toStringIndent(5))
        throw new Error("too tall")
      }
      vals.push(node.listNode?node.listNode.hiddenData:'deleted')
      if (k > 3000) {
        console.log(vals)
        throw new Error()
      }
      // this moves up the tree and adjusts the heights and weights of
      // the node and its ancestors
      // the name is misleading, it should be updateHeightWeight ...
      //debug.log('updateHeightWeights','entering updateHeightWeights')
      //debug.dir('updateHeightWeights',node)

      const leftHeight = (node.left?node.left.height:0)
      const rightHeight = (node.right?node.right.height:0)
      const newHeight =  Math.max(leftHeight, rightHeight)+1

      const nullSize = {}
      for(let x in node.listNode.elementSize){
        nullSize[x]=0
      }

      const leftSize = (node.left?node.left.sublistSize:nullSize)
      const rightSize = (node.right?node.right.sublistSize:nullSize)
      const eltSize = node.listNode.elementSize;

      let newSize={}
      for (let x in nullSize){
        newSize[x] = leftSize[x]+rightSize[x]+eltSize[x]
      }

      if ((newHeight == node.height)&&(newSize==node.sublistSize)) {
        //debug.log('updateHeightWeights','subtree is already balanced returning')
        return
      } else {
        node.height = newHeight
        node.sublistSize = newSize
        //debug.log('updateHeightWeights','updated heights and weights of the subtree ...\n'+node.toStringIndent(5))
        //debug.dir('updateHeightWeights',node)
      }
      node = node.parent
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
    z.updateNodeHeightWeight()
    y.updateNodeHeightWeight()
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
    z.updateNodeHeightWeight()
    y.updateNodeHeightWeight()
    return y
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


class Debug{
  constructor(){
    this.debugging = {}
  }
  log(n,a){
    if (this.debugging[n]){
      console.log("in "+n+": \n"+a)
    }
  }

  dir(n,a){
    if (this.debugging[n]){
      console.log("in "+n)
      console.dir(a)
    }
  }
}

const debug = new Debug()
debug.debugging = {any:false}


window.DLLwi = DLLwi
window.ListNode = ListNode
window.TreeList = TreeList
