const express = require('express');
const cors = require('cors')//cors for own server connected with own
const admin = require("firebase-admin");//for token file
const app = express();
require("dotenv").config();//dotenv config
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET)

//Middleware
app.use(cors());
app.use(express.json());


//test-react-app-firebase-adminsdk.json


var serviceAccount = require('./test-react-app-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const { MongoClient, ServerApiVersion } = require('mongodb');
const { query } = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3aidp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//For Token
async function verifyToken(req, res, next) {

  if (req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    }
    catch {

    }
  }
  next();
}

async function run() {
  try {
    await client.connect();
    console.log('database connected');
    const database = client.db("new_doctors");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection('users');

    //Admin All Appointments
    app.get('/allAppointments', async (req, res) => {
      const cursor = appointmentsCollection.find({});
      const appointments = await cursor.toArray();
      //console.log(appointments);
      res.send(appointments);
    })

    //Dashboard appointment with date
    app.get('/appointments', async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date }
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    })

    //Dashboard appointment with email
    app.get('/myAppointment', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    })

    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result);
    });

    

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    //Get price details
    app.get('/appointments/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await appointmentsCollection.findOne(query);
      res.json(result);
    })

    //For Google signIn users information
    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    })

    //Make admin
    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      console.log(requester);
      if (requester) {
        const requesterAccount =await usersCollection.findOne({ email: requester })
        if (requesterAccount?.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          console.log(result);
          res.json(result);
        }
      }
      else{
        res.status(403).json({message: 'You do not have permission'})
      }

    })

    //Admin check to firebase
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin })
    })

    //For payment

    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price *100;
    
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      });
    
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //Update Appointments for payment
    app.put('/appointments/:id', async(req,res) => {
      const id = req.params.id;
      console.log(req.body);
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updateDoc = {
        $set:{
          payment: payment
        }
      };
      const result = await appointmentsCollection.updateOne(filter,updateDoc);
      res.json(result);
    })

  }
  finally {
    //await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Server is ok')
});

app.listen(port, () => {
  console.log('Port is Ok');
})