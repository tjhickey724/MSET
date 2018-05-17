class TreeLeaf{
  constructor(val){
    this.val=val;
    if (val) {
      this.nodetype='leaf';
      this.height=1
      this.size=1
    } else {
      this.nodetype = "empty"
      this.height=0
      this.size=0
    }
  }


  toString(){
    if (this.nodetype=='empty'){
      return 'empty'
    } else if (this.nodetype='leaf') {
      return 'leaf('+this.val+')'
    } else {
      throw new Error("incorrect nodetype value in TreeLeaf node: "+this.nodetype)
    }
  }

  toStringDeep(indent){
    return " ".repeat(indent)+this.toString()
  }

}


class TreeNode{
  constructor(left,right){
    this.left=left;
    this.right=right;
    this.nodetype= "inner"
    this.rebalance();
    console.log('TreeNode constructor')
    console.dir(this);
  }

  toString(){
    return "node("+this.left.toString()+","+this.right.toString()+")"
  }


  toStringDeep(indent){
    return (this.left.toStringDeep(indent+1)+
            "\n"+" ".repeat(indent)+"node"+indent+ "\n"+
            this.right.toStringDeep(indent+1))
  }



  rebalance(){
    this.size = this.left.size+this.right.size
    this.height =
      1 + Math.max(
             this.left.height,
             this.right.height)
    return this;
  }

  insert(offset,val){
    console.log('inserting '+val+' at offset '+offset+' in '+this+ " with size "+this.size);
    let result=this;

    if (offset> this.size){
      return new TreeNode(this,val)
    } else if (offset==0){
      console.log('offset 0')
      if (TreeNode.size(this.left)<=0){
        this.left = val;
      } else if (this.left.size>1){
        this.left.insert(offset,val)
      } else {
        this.left = new TreeNode(val,this.left);
      }
    } else  if (offset < TreeNode.size(this.left)) {
      console.log("offset < size(this.left)")
      result = (this.left.insert(offset,val))
    } else  if (TreeNode.size(this.right)==0){
      console.log("size(right)==0")
        this.right = val;
        this.size++;
    } else if (!this.right.size) {
      this.right = new TreeNode(val,this.right)
      result = this
    } else {
      console.log("default case offset="+offset+" val="+val)
      console.dir(this);
      result =
                   this.right.insert(offset-TreeNode.size(this.left),val)
    }
    console.dir(this);
    this.rebalance();
    console.log('insert '+offset+' '+val)
    console.dir(this);
    return result
  }


}



class TreeList{
  // this implements the list ADT with O(log(N)) time to insert and lookup
  // deleting is not implemented as we don't need it for mset
  // this first version is not balanced, the next version will be

  constructor(){
    this.root = new TreeNode(null,null)
  }

  insert(offset, val){
    if(offset>=this.size) {
      const tmp = this.root;
      this.root = TreeNode.rebalance(new TreeNode(tmp,val));
      tmp.parent = this;

    } else {
      this.root=this.root.insert(offset,val)
    }
    return this;
  }

}
