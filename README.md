# MSET

This is initial work on building a real-time fully distributed non-locking collaborative editor 
It is based on the MSET approach developed by Tim Hickey and Kenroy Granville for use in the GrewpEdit application
in 2005.

This repository has several very useful Javascript modules

# DLLindexed
This is a class which implements a doubly linked list of Javascript objects.
```javascript
const dll = new DLLindexed()
```
creates a new indexed doubly link list.

The nodes in the DLL are of type ListNode and the actual elements of the list are in the value field of those nodes.
There are special marker nodes at the beginning and end of the list which you can access with the fields first and last

You can add elements before or after any DLL node using the insertBefore and insertAfter methods
```javascript
dll.first.insertAfter(7).insertAfter([1,2,3])
         .insertAfter({a:1,b:2}).insertBefore('penultimate')
```
You can get the size of a DLLindexed object with the size function
```javascript
dll.size()
```
and you can access the nth element of the list in time O(log(N)) where N is the size of the DLL with
```javascript
const a = dll.nth(5).val
```
So you can easily print the elements of a DLL with
```javascript
for(let i=0; i<dll.size(); i++) console.log(dll.nth(i).val)
```
or more efficiently as
```javascript
for(let n=dll.first.next; n!=dll.last; n=n.next) console.log(n.val)
```

You can also find the index of a ListNode in the DLL with the indexOf() method
```javascript
for(let i=0;i<10;i++){dll.last.insertBefore(i)}
let listnode = dll.nth(5)
for(let i=0;i<10;i++){dll.first.insertAfter(-i)}
let index = listnode.indexOf()
console.log(dll.nth(index)) // should be the listnode!
```





This current implementation creates an AVL tree over the DLL where each TreeNode stores the number
