var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    LocalStrategy = require("passport-local"),
    User        = require("./models/user"),
    Message        = require("./models/message"),
    searchedFriend = {},
    
    frnames = [] ,
   // Friend        = require("./models/friends"),
   // addedFriend = "",
    multer = require("multer"),
    path = require("path"),
    server= require("http").createServer(app),
    io = require("socket.io").listen(server) 



    mongoose.Promise = global.Promise;
//mongodb://localhost/login-ashgen.......process.env.DATABASEURL
	mongoose.connect("mongodb://localhost/login-ashgen",{useMongoClient:true})
  	.then(() =>  console.log('connection successful'))
  	.catch((err) => console.error(err));

// MULTER CONFIGURATIONS ---
  	var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
  	
    cb(null, file.originalname);
  }
});
function fileFilter(req, file, cb){
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
var upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5
  },
  fileFilter: fileFilter
});
app.use(express.static(__dirname + "/uploads"));

app.use(bodyParser.urlencoded({extended: true}));
// app.set("view engine", "ejs");
 app.use(express.static(__dirname + "/public"));


// PASSPORT CONFIGURATION------------
app.use(require("express-session")({
    secret: "ashgen",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
var port = process.env.PORT || 3000;
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   
   next();
});
app.use(function(req, res, next){
   res.fruser = req.fuser;
   next();
});


// ---------ROUTES--------------------
app.get("/",function(req,res){
	res.redirect("/register");
});
app.get("/login",function(req,res){
 // res.sendFile(path.join(__dirname+'/login.html'));	
	res.render("login.ejs");
});
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/signedin",
        failureRedirect: "/register"
    }), function(req, res){
});
app.get("/register",function(req,res){
	res.render("register.ejs");
});
app.post("/register",upload.single('profileImage'), function(req, res,next){
    
    var newUser = new User({username: req.body.username,email:req.body.emailid,profileImage: req.file.filename});
    
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register.ejs");
        }
        passport.authenticate("local")(req, res, function(){
           res.redirect("/signedin"); 
        });
    });
});
app.get("/signedin",function(req,res){
  var addedFriend = "" ;
	res.render("signedin.ejs",{addedFriend:addedFriend});
});

app.post("/signedin/:id",function(req,res,next){
  console.log(req.body.addfriend);
      

  User.findOne({ username : req.body.addfriend},function(err,fuser){
    if (err) {
         res.send("fu");
             }
    else{
         User.find({ username : req.body.addfriend}).count({},function(err,count){
        if(!err && count!==0){
           
           var friend = {"name": fuser.username, "propic":fuser.profileImage} ;
           
    User.findByIdAndUpdate(req.params.id,
    {$addToSet: {friends: friend}},
    function(err, cuser) {
        if(err){
           console.log(err);
        }else{
             console.log(cuser);
            var newMessage = new Message({from :cuser.username, to:fuser.username }); 
            newMessage.save(function(err){
              if(err){
                console.log(err);
              }
            });
             var newMessage2 = new Message({from :fuser.username, to:cuser.username }); 
            newMessage2.save(function(err){
              if(err){
                console.log(err);
              }
            });
            var friend2 = {"name": cuser.username, "propic":cuser.profileImage} ;
           console.log(friend2.message);
           User.findByIdAndUpdate(fuser._id,
           {$addToSet: {friends: friend2}},function(err,data){
            if(err){
              console.log(err);
            }else{
              console.log(data);
            var addedFriend = "friend successfully added";
            res.render("signedin.ejs",{addedFriend:addedFriend});
            }
           });
         }
      });
    }
     else{
       var addedFriend = "no such  friend can be added";
       res.render("signedin.ejs",{addedFriend:addedFriend}) ;
         }
          });
        }
    });
});

app.post("/Sfriends/:id",function(req,res){
  // User.findById(req.params.id,function(err,cuser){
  //   cuser.friends.
  // });
  User.findById(req.params.id,function(err,cuser){
    if(err){
      console.log(err);
    }
    else{
      var isFriend = false ;
      searchedFriend = {} ;
      cuser.friends.forEach(function(f){
          
           if(f.name===req.body.searchFriend){
                
                isFriend = true ;
                searchedFriend = f ;
              } 
      }) 
      } 
      if(isFriend){
        console.log(searchedFriend);
       res.render("friends.ejs",{searchedFriend:searchedFriend});
        }
        else{
           console.log(searchedFriend.name);
          res.render("friends.ejs",{searchedFriend:searchedFriend});
        }
  });
  
});

app.get("/friends/:id",function(req,res){
  // User.findById(req.params.id,function(err,cuser){
  //   cuser.friends.
  // });
  res.render("friends.ejs",{searchedFriend:searchedFriend});
});

app.get("/logout", function(req, res){
   req.logout();
   res.redirect("/login");
});

app.get("/chat/:friendname",function(req,res){
    
      res.render("chat.ejs",{friendname:req.params.friendname}) ;
     
  
    
});

io.sockets.on("connection",function(socket){
  
  socket.on("loaded-message",function(data2){
    Message.findOne({from:data2.from,to:data2.to},function(err,cuser){
        if(err){
          console.log(err);
        }else{
          io.emit("previous-message",cuser);
        }
      });
  });

  socket.on("send-message",function(data1){
    // console.log(data);
    //  socket.frname = data.to ;
    //  frnames.push(socket.frname);
    // console.log(data.from);
         console.log(data1.msg);
             Message.findOne({from:data1.to,to:data1.from},function(err,cuser){

        if(err){
          console.log(err);
        }else{
              ms = { "data": data1.from + " : " + data1.msg} ;
              
              Message.findOneAndUpdate({_id : cuser._id},{$push: { messaged : ms}},function(err,duser){
                if(err){
                  console.log(err);
                }
              });
            }
          });

     Message.findOne({from:data1.from,to:data1.to},function(err,cuser){

        if(err){
          console.log(err);
        }else{
              ms = { "data": data1.from + " : " + data1.msg} ;
              
              Message.findOneAndUpdate({_id : cuser._id},{$push: { messaged : ms}},{new:true},function(err,duser){
                if(err){
                  console.log(err);
                }
                // else{
                    console.log(duser);
                   io.emit("new-message",duser);
                // }

              });
            }
          });

     // Message.findOne({from:data1.from,to:data1.to},function(err,kuser){
     //      if(err){
     //      console.log(err);
     //    }else{
     //      console.log(kuser);
     //           io.emit("new-message",kuser);
     //    }
     // });         

       });
     
  });
















server.listen(port,function(){
	console.log("server running!!!!");
});

// https://sheltered-island-82789.herokuapp.com/