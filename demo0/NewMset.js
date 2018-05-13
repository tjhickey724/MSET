/*
This is where we implement the code to create an MSET representation of the data
and we also implement collaborative editing. We will first do without optimization
on one screen. Then we will do it on multiple computers with socket.io and node/express.
Then we will optimize it.

The idea is that the existing editor needs to have callbacks for inserting and deleting elements
which MSET can use to build its representation of the data.
And it needs to have a method to insert and delete text that MSET can call to synchronize with
other operations...
 */

let tim=null, session=null, editor=null, node=null;


class Testing{
    constructor(){
    }

    runTest(){
	editor = new MSET_Editor();
	tim = editor.addClient("tim");
	node = new MSET_Node(tim,"hi");

    }
}


class Client {
    constructor(name){
	this.name=name;
	this.numNodes=0;
	this.id = -1;
	this.nodes=[]
    }

    addNode(n){
	this.nodes.push(n);
	return(this.numNodes++)
    }

}




class EditSession{
    constructor(){
	this.clients= new Map();
	const c = new Client("virtual user");
	c.id=0;
	c.numNodes=1;
	this.clients.set(0,c)
	this.counter=1; // id 0 is for the virtual global session user ..
    }

    addClient(name){
	const c = new Client();
	c.id = this.counter++;
	c.name=name;
	this.clients.set(c.id,c);
	return c;
    }

    getClient(clientId){
	return this.clients.get(clientId)
    }

    
}



class NodeChar{
    constructor(char,charType,clientId,node,offset){
	this.char = char;
	this.charType=charType;  // visible, hidden, startMarker, endMarker
	this.node = node; // a NodeChar haa a link to its position (node/offset) in the Editing tree
	this.offset = offset;
    }
}


class InsertionPoint{
    constructor(){
	this.insertions = []; // this is a list of MSET_Nodes sorted by clientID
    }
}


class MSET_Editor {
    constructor(){
	this.session = new EditSession();
	const v = this.session.getClient(0);
	this.root = new MSET_Node(v,""); // only the root has no chars in its textNodes list

	this.visible=[];
	this.edit=[];
	this.tree=[];
    }

    addClient(name){
	return this.session.addClient(name);
    }


}
	

class MSET_Node{
    constructor(client,text){
	// this creates a initial node with the start and end markers and some initial text
	this.textNodes=[];
	this.branchNodes=[];
	this.owner = client;
	this.nodeNumber = client.addNode();
	for(let i=0; i<text.length; i++){
	    this.textNodes.push(new NodeChar(text[i],'visible',client,this,i));
	    this.branchNodes.push(new InsertionPoint());
	}
	this.start = new  NodeChar("<"+client.id,'startMarker',client,this,'start');
	this.end = new NodeChar(">"+client.id,'endMarker',client,this,'end');


    }

    tree_extend(user,char){
    }

    tree_insert(user,node,offset){
    }

    tree_hide(user,offset){
    }


    insert(offset,text){
	const len = this.textNodes.length;
	if (offset==text.length) {
	    for(let i=0; i<len; i++){
		this.textNodes.push(new NodeChar(text[i],'visible'));
	    }
	} else {
	    const branches = this.branchNodes[offset];
	    if (!branches) {
		this.branchNodes[offset] = new BranchNode();
	    }
	    branches.insertNode(new MNode(this.owner));
	}

    }

    delete(offset,text){
    }
}

