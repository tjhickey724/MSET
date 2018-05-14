const express = require('express');
const router = express.Router();
const session = require('express-session')
let userId=1

/* GET home page. */
router.use(session({ secret: 'msetDemo', cookie: { maxAge: 60000 }}))

router.get('/', function(req, res, next) {
  console.log("Session: "+req.session.id);
  if (!req.session.userId)
    req.session.userId= userId++;
  res.render('mset', { title: 'MSET demo', userId:req.session.userId });
});

module.exports = router;
