const e = require("express");
const { Db } = require("mongodb");
const { User } = require("./user");
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

/**@type {Db} */
let dbo;

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  dbo = db.db("mydb");    
//   dbo.collection("users").findOne({"user.id": "kuba"}).then(doc => console.log(doc));
});

// /** @type {Object} */
// var usersMap = {
//     "kuba": {
//         password: "12345",
//         name: "Kuba"
//     },
//     "adam": {
//         password: "asdfg",
//         name: "Adam"
//     }
// }

function register(userId, userName, password, callback) {    
    dbo.collection("users").insertOne( {"user":{"password":password,"id":userId,"name":userName}})
    .then(res => {
        if(res ==null){
            callback(null)
        }
        
        console.log("user added: " + JSON.stringify(res))
        callback(true);
    })

    //jesli znajdzie takiego samego?

    .catch(x => {
        console.log(x);
        callback(null);
    })


    //console.log(usersMap);
   // if (usersMap.hasOwnProperty(userId))
       // return false;

    //usersMap[userId] = {
     //   password: password,
      //  name: userName
    //}; 

   // console.log(usersMap);
    //return true;
        
}
// loginCallback(true)


function login(userId, password, loginCallback) {             
    
    dbo.collection("users").findOne({"user.id": userId})
    .then(doc => {
        if (doc == null) {
            loginCallback(null);
        } else {
            console.log("user found: " + JSON.stringify(doc));
            if (doc.user.password == password) {
                loginCallback(new User(userId, doc.user.name));
            } else {
                loginCallback(null);
            }
        }
    })
    .catch(x => {
        console.log(x);
        loginCallback(null);
    });
    
    // console.log(users.dbName);
    // console.log(userId);
    // // users.count(x => console.log(x));
    // users.findOne({"user.id": userId}, (doc) => {
        
    //         console.log(doc);
        
    // });
    
    // if (usersMap.hasOwnProperty(userId)) {
    //     const userInfo = usersMap[userId];
    //     if (userInfo.password != password)
    //         return null;
    //     return new User(userId, userInfo.name);
    // } else {
    //     return null;
    // }        
}

exports.login = login;
exports.register = register;
