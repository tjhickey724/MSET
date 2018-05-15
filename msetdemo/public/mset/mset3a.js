/* ***********************************************************************
 * MSET Demo Implementation in JavaScript
 *
 * We define the Element, ListNode, Node, DLL, and MSET types
 * and then define Network to simulate three users inserting locally and processing remote ops
 * The purpose of this demo is to allow us to try out different cases of the
 * algorithm to illustrate how the MSET algorithm works...
 *
 * In this demo we allow the user to type into a textfield and
 * we construct the MSET tree in real time .
 */

/* ***********************************************************************
 * Here is an implementation of Elements for the MSET data type
 */

function Element(sym,vis,marker) {
    this.sym = sym;
    this.vis=vis;
    this.marker=marker;
    this.treeNode=null;
    this.nodeid=null;
    this.offset=null;
    this.listNode=null;
    this.toString = function toString() {
  return "{"+this.sym+","+this.vis+","+this.marker+","+this.nodeid+","+this.offset+"}";
    }
}


function createChar(c,n){
    var e = new Element(c,true,false);
    e.treeNode=n;
    e.nodeid=[n.user, n.count];
    e.offset = 0;
    return e;
}

function createStart(n){
    var startsym = "<"+n.user+":"+n.count;

    var e = new Element(startsym,false,true);
    e.treeNode = n;
    e.nodeid = [n.user, n.count];
    e.offset = "start";
    return e;
}

function createEnd(n){
    var endsym = n.user+":"+n.count+">";
    var e = new Element(endsym,false,true);
    e.treeNode = n;
    e.nodeid = [n.user, n.count];
    e.offset = "end";
    return e;
}



/* ************************************************************
 * Here is an implementation of a Node in the MSET tree
 */

function Node(u,n) {
    this.user=u;
    this.count=n;
    this.elt=[];
    this.iset=[];
    this.iset[0]=[];
}



/* ************************************************************
 * Here is an implementation of MSET
 */


function MSET(u){
    this.user = u;
    this.count = 0;
    this.size=0;
    this.root = new Node(0,0);
    this.strings = new DLL();
    this.nodes = [];
    this.nodes[[0,0]] = this.root;
    this.opqueue = [];  // dequeue of ops that haven't been applied
    this.waitqueue=[];  // hashtable from targets to list of ops

    this.enqueue = function(op) {
  this.opqueue.push(op);
    }


    /*
     * This method takes a tree op from the queue, checks to see if it can be applied
     * If its target is not there, it adds it to a wait queue on that target
     * If the target is in the tree, it applies to tree op, which generates a new node n
     * and the editops waiting on n are then added to the opqueue. It returns true if an operator
     * was processed, false otherwise.
     */
    this.processNetOp = function processNetOp(){
  if (this.opqueue.length == 0) // check to see that the queue is not empty, return else
      return false;

  var op=this.opqueue.shift(); // take from the head of the queue!
  var target=this.nodes[op.nodeid]; // make sure the target is in the tree

  if (target===undefined) {  // if not, the push onto the wait queue
      this.waitqueue[op.nodeid] = this.waitqueue[op.nodeid] || []; // make waitqueue empty if undefined
      this.waitqueue[op.nodeid].push(op);
  }else {                    // if so, then apply, and enqueue ops waiting for the created result

      var result = this.applyTreeOp(op); // returns new node it creates or extends
      var waiting = this.waitqueue[result.nodeid];
      this.waitqueue[result.nodeid]=null;
      if ((waiting !==undefined) && (waiting !== null)) {  // if something is waiting, add it to front of the opqueue
  this.opqueue = waiting.concat(this.opqueue);
      }
  }
  return true;
    }

    /* this method take a tree edit operation object
     which it obtains from the network and applies it to the tree
     returning the result. We assume that the target is in the tree!
    */
    this.applyTreeOp = function applyTreeOp(treeOp){
  var n;
  if (treeOp.op == "insert") {
      n = treeinsert(this,treeOp.nodeid, treeOp.q, treeOp.un, treeOp.c);
  } else if (treeOp.op == "extend") {
      n = treeextend(this,treeOp.nodeid, treeOp.c);
  } else if (treeOp.op == "delete") {
      n = treehide(this,treeOp.nodeid, treeOp.q);
  }
  return n; // this has yet to be written ...
    }

    // the rest of this function initializes the
    // instance variables defined above ...
    var n = this.strings.first;
    var e1,e2;
    e1 = createStart(this.root);
    e2 = createEnd(this.root);
    n = n.insertAfter(e1);
    n = n.insertAfter(e2);
    this.root.start = e1;
    this.root.end = e2;
}





/* ************************************************************
 * This simulates a network with a queue of treeedit operations
 * that can be performed by the clients ....
 */

function Network() {
    this.clients = [];

    this.addClient = function addClient(M){
  this.clients.push(M);
  M.network = this;
  console.log('added client'); console.dir(this);
    }

    this.broadcast = function broadcast(op,un){
  var i;
  console.log("broadcast: "+JSON.stringify(op) +", "+un[0]);
  sendOperationToServer(op);
  for (i=0; i<this.clients.length; i++) {
      M = this.clients[i];
      if (M.user != un[0])
      M.enqueue(op);
  }
    }

    this.insert = function insert(vm,q,un,c) {
  var op = {op:"insert", nodeid:vm, q:q, un:un, c:c};
  this.broadcast(op,un);
    }

    this.extend = function extend(un,c) {
  var op = {op:"extend", nodeid:un, c:c};
  this.broadcast(op,un);
    }

    this.hide = function hide(vm,q,un) {
  var op = {op:"delete", nodeid:vm, q:q};
  this.broadcast(op,un);
    }

    this.processAllOps = function processAllOps(){
  var i;
  for (i=0; i<this.clients.length; i++) {
      M = this.clients[i];
      while (M.processNetOp()) ;
  }
    }

}



/* Create a node to in inserted in the mset tree given the nodeid and the character
 * this requires creating the 3 corresponding elements and settingup the node.
 */
function createCharNode(nodeid,c){
    var n = new Node(nodeid[0],nodeid[1]);
    var e1 = createStart(n);
    var e2 = createChar(c,n);
    var e3 = createEnd(n);
    n.start   = e1;
    n.elt[0] = e2;
    n.end     = e3;
    n.iset[0] = [];
    n.iset[1] = [];
    return n;
}

/* insertNode(m,s) inserts the node m into an ordered set s of nodes
 * (ordered by userid). This is called to create a child object of a node
 * and we insert the new node in the appropriate iset.
 * This needs to be reimplemented as a O(log(N)) operation ...
 */
function insertNode(m,s) {
    var i=0, n=s.length, k=-1;
    var u = m.user;
    while(i<n) {
  if (u< s[i].user) {
      s.splice(i,0,m);
      k=i;
      break;
  }
  else i = i+1;
    }
    if (i==n) {s[n]=m; k=n;}
    //alert("insertnode:  k="+k+" s="+s+ " n="+n+" c="+m.elt[0].sym);
    return k;
}

/********************************************************
 * Here is an implementation of linked list nodes
 */
function ListNode(v){
    this.prev = null,
    this.next =null,
    this.val = v;

    this.insertBefore = function(a){
      var x = new ListNode(a);
      a.listNode = x;
      var tmp = this.prev;
      this.prev=x;
      x.next = this;
      x.prev = tmp;
      x.prev.next = x;
      return x;
    }

    this.insertAfter = function(a){
      var x = new ListNode(a);
      var tmp = this.next;
      this.next=x;
      x.prev = this;
      x.next = tmp;
      x.next.prev = x;
      a.listNode=x;
      return x;
    }

}

/********************************************************
 * Here is an implementation of a doubly linked list of elements
 * which has three views std, rev, and edit.
 */

function DLL() {
    this.first = new ListNode("startmarker");
    this.last = new ListNode("endmarker");
    this.first.nodeid=-1;
    this.last.nodeid=-1;
    this.first.next = this.last;
    this.last.prev = this.first;

    this.printList = function(vis) {
      var d,s;

      s="";
      for(d = this.first.next; d != this.last; d=d.next) {
          if  ((vis=="std") && d.val.vis) {
      s = s + "" + d.val.sym;
          }
          else if ((vis=="rev") && !(d.val.marker)){
      s = s + "|" + d.val.sym;
          }
          else if ((vis=="edit") || (vis==undefined) ) {
      s = s + " " + d.val.sym;
      }
      }
      if (vis=="std") return s;
      else return ("[\n "+s+" \n]");
        }
        this.toString = this.printList;

    
    this.nthSTD = function(n){
      var k=this.first.next;
      while ((n>0 || !k.val.vis)  && (k!= this.last) ) {
          if ( k.val.vis)  {
            n = n-1;
          }
          k=k.next;
        }
      return k;
    }

    this.nthREV = function(n){
      var k=this.first.next;
      while ((n>0 || !k.val.marker)  && (k!= this.last) ) {
          if ( !k.val.marker)  {
            n = n-1;
          }
          k=k.next;
        }
      return k;
    }

    this.nthEDIT = function(n){
      var k=this.first.next;
      while ((n>0)  && (k!= this.last) ) {
          n = n-1;
          k=k.next;
      }
      return k;
    }

    this.nth = function(n,vis){
      switch(vis){
        case 'std': return this.nthSTD(n);
        case 'rev': return this.nthREV(n);
        case 'edit': return this.nthEDIT(n);
        default: return undefined;
      }
    }



    this.nextNonMarker = function(e) {
      // this can be implemented as O(log(N)) but here is O(N)
      while ((e!== null) && e.val.marker){
          console.log("nextnonmarker e.val.sym="+e.val.sym);
          e=e.next;
      }
      return e;
    }

}


/* **************************************
 *  MSET DATA TYPE OPERATIONS
 */

/* treeinsert(M,vm,q,un,c)
 *  this inserts the new node with id un and which contains c
 *  into the node with id vm at offset q
 *  and it updates M to reflect this change ...
 */

function treeinsert(M,vm,q,un,c){
  //  alert("treeinsert vm="+JSON.stringify(vm)  +" q="+q+" un="+JSON.stringify(un)+" c="+c);
    console.dir(M);
    var n = M.nodes[vm]; // O(log(N))

    console.log(JSON.stringify(['IN treeinsert',vm,q,un,c]))
    var s = n.iset[q];
    var m = createCharNode(un,c);  // O(1)
    var e = m.elt[0];
    var f = n.start;
    var k = insertNode(m,s);  // O(log(N))
    console.log("k=");console.dir(k);

    // now we sew m into the doubly linked lists!!!
    if (k==0){
      if (q==0) {
          f=n.start;
      } else { // q>0
          f=n.elt[q-1];
      }
    } else { // k>0
      f = s[k-1].end; // O(log(N))
    }

    // next we insert the three new elements into the list
    f.listNode.insertAfter(m.start).insertAfter(m.elt[0]).insertAfter(m.end); // O(log(N))
    // and insert the new node into the hashtable
    M.nodes[un]=m;
    M.size++;
    //alert("treeinsert q="+q+" c="+c);
    insertNode(m,s); //O(log(N))
    return m;
}


/* treeextend(M,nodeid,c)
 *  this inserts the character c at the end of the node with the specified nodeid
 *  and it updates M to reflect this change ...
 */
function treeextend(M,nodeid,c){
    var n = M.nodes[nodeid];  // O(log(N))
    var e = createChar(c,n);  // O(1)
    var d = n.elt.length;
    var f = n.end;
    e.offset = d;
    n.elt[d]=e;
    n.iset[d+1]=[];
    f.listNode.insertBefore(e); // O(log(N))
    M.size++;
    return n;
}

/* treehide(M,nodeid,q)
 *  this hides the character c with offset q in the node with the specified nodeid
 *  and it updates M to reflect this change ...
 */
function treehide(M,nodeid,q) {
    var n = M.nodes[nodeid]; // O(log(N))
    var e = n.elt[q];
    e.vis=false;
    e.sym = "["+e.sym+"]";
    return n;
}






/********************************************************
 * String Operations
 * Here is where we convert string operations (insert, delete) into tree ops
 * following the algorithm in the paper
 */

function stringdelete(M,k) {
    var e = M.strings.nth(k,"std").val;  // O(log(N))

    console.log("stringdelete: e="+e.toString());
    e.vis=false;
    e.sym = "["+e.sym+"]";
    var un = [M.user,0];
    M.network.hide(e.nodeid,e.offset,un); // un is used to prevent broadcast from going back to user
}

function stringinsert(M,k,c) {
    var un;
    console.log("inserting "+k+","+c)
    if (M.size==0) {
      un = [M.user,M.count++];
      // CASE 0:  no-nonmarkers in the list, so tree must be empty

      // insert new node into the root of the empty tree
      treeinsert(M,[0,0],0,un,c);
      M.network.insert([0,0],0,un,c);
    }
    else if (k==0) {

      // CASE 1: inserting at the beginning of the string

      //  strategy - insert before the first non-marker character
      un = [M.user,M.count++];

      var e = M.strings.nth(0,"rev").val; //O(log(N))
      console.dir(M)

      M.network.insert(e.nodeid,0,un,c);
      console.log("k=0 case "+JSON.stringify(e.nodeid))
      console.log(M.strings.printList('rev'))
      console.dir(M)
      treeinsert(M,e.nodeid,0,un,c);

    } else { // k>0
        // in the remaining cases we're inserting after a visible character
        // so, get the visible, non-marker elt e at position k-1

        var ecell=M.strings.nth(k-1,"std"); //O(log(N))
        // and get the element after the ecell
        var fcell=ecell.next;
        if (!fcell.val.marker) {

            // CASE 2: inserting between two non-marker elements

            // if the next elt is a non-marker insert there
            var un = [M.user,M.count++];

            M.network.insert(fcell.val.nodeid, fcell.val.offset,un,c);
            treeinsert(M,fcell.val.nodeid,fcell.val.offset,un,c);

        } else if (fcell.val.marker && (fcell.val == fcell.val.treeNode.end)) {

            // CASE 3: the next element is an end marker

            if (fcell.val.treeNode.user==M.user) {
                // case 3a: it the user owns the node then extend
                M.network.extend(fcell.val.nodeid, c);
                treeextend(M,fcell.val.nodeid,c);
            }
            else {
              un = [M.user, M.count++];
              // case 3b: otherwise insert a new node here
              // console.log("string insert case 3b: at end, fcell.val.user="+fcell.val.user+" M.user="+M.user);

              M.network.insert(fcell.val.nodeid, fcell.val.treeNode.elt.length, un, c);
              treeinsert(M,fcell.val.nodeid,fcell.val.treeNode.elt.length,un,c);
            }
        } else {

              // CASE 4: the cell must be a start marker

              // in this case, find the next non-marker f (which must exist) and insert before f
              un = [M.user,M.count++];
              fcell = M.strings.nextNonMarker(fcell); // O(log(N))

              M.network.insert(fcell.val.nodeid,0,un,c);
              treeinsert(M,fcell.val.nodeid,0,un,c);
        }
    }
}





/* *****************************************************************
  TEST CODE FOR THE MSET ALGORITHMS
*/

var mset;
var network;

/*
  this is called when the body of the HTML page is loaded ..
*/
function initMSET(){

    mset1 = new MSET(1);
    mset2 = new MSET(2);
    mset3 = new MSET(3);
    network = new Network();
    network.addClient(mset1);
    network.addClient(mset2);
    network.addClient(mset3);

}

/*
  This provides some manual tests for a particular mset
*/

function testops() {
    mset = new MSET(1);
    treeinsert(mset,[0,0],0,[1,0],"A");
    treeinsert(mset,[0,0],0,[3,0],"B");
    treeinsert(mset,[0,0],0,[2,0],"C");
    treeinsert(mset,[1,0],1,[1,2],"D");
    treeextend(mset,[1,0],"E");
    treeextend(mset,[1,0],"F");
    treeinsert(mset,[1,0],2,[3,1],"G");
    treehide(mset,[1,0],0);
    treehide(mset,[1,0],1);
    treeinsert(mset,[3,1],1,[3,2],"H");
    treeinsert(mset,[3,1],1,[1,3],"I");
    stringdelete(mset,5);
    stringdelete(mset,1);

    stringinsert(mset,0,'a');
    stringinsert(mset,1,'b');
    stringinsert(mset,2,'c');
    stringinsert(mset,1,'d');
    stringdelete(mset,1);
    stringinsert(mset,1,'e');
    stringdelete(mset,1);
    stringinsert(mset,1,'f');
    stringdelete(mset,3);
    stringinsert(mset,3,'g');

    if (op=="insert")
  stringinsert(mset,q,c);
    else
  stringdelete(mset,q);

    document.getElementById('estring1').innerHTML = mset.strings.printList('edit');
    document.getElementById('rstring1').innerHTML = mset.strings.printList('rev');
    document.getElementById('sstring1').innerHTML = mset.strings.printList('std');
    document.getElementById('status1').innerHTML = "done";
}


/* This is called when the "go" button is pushed in the MSET3.html page
 */

function applyops(){

    applyops1();
    applyops2();
    applyops3();
    network.processAllOps();
    showops1();
    showops2();
    showops3();

}

/* We could do some refactoring for the next three, but it was easier to just copy/modify for now
 */

function applyops1(){
  var
      op = document.getElementById('op1').value,
      q = document.getElementById('offset1').value,
      c = document.getElementById('char1').value,
      mset = mset1;

  if (op=="insert")
      stringinsert(mset,q,c);
  else if (op == "delete")
      stringdelete(mset,q);
}

function showops1(){
    var mset = mset1;

    document.getElementById('estring1').innerHTML = mset.strings.printList('edit');
    document.getElementById('rstring1').innerHTML = mset.strings.printList('rev');
    document.getElementById('sstring1').innerHTML = mset.strings.printList('std');
    document.getElementById('status1').innerHTML = JSON.stringify(mset.waitqueue);
}

function applyops2(){
  var
      op = document.getElementById('op2').value,
      q = document.getElementById('offset2').value,
      c = document.getElementById('char2').value,
      mset=mset2;

  if (op=="insert")
      stringinsert(mset,q,c);
  else if (op == "delete")
      stringdelete(mset,q);

}

function showops2(){
    var mset = mset2;

    document.getElementById('estring2').innerHTML = mset.strings.printList('edit');
    document.getElementById('rstring2').innerHTML = mset.strings.printList('rev');
    document.getElementById('sstring2').innerHTML = mset.strings.printList('std');
    document.getElementById('status2').innerHTML = JSON.stringify(mset.waitqueue);
}

function applyops3(){
  var
      op = document.getElementById('op3').value,
      q = document.getElementById('offset3').value,
      c = document.getElementById('char3').value,
      mset = mset3;

  if (op=="insert")
      stringinsert(mset,q,c);
  else if (op == "delete")
      stringdelete(mset,q);


}

function showops3(){
    var mset = mset3;

    document.getElementById('estring3').innerHTML = mset.strings.printList('edit');
    document.getElementById('rstring3').innerHTML = mset.strings.printList('rev');
    document.getElementById('sstring3').innerHTML = mset.strings.printList('std');
    document.getElementById('status3').innerHTML = JSON.stringify(mset.waitqueue);
}

initMSET();
//applyops();
