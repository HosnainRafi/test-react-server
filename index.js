const express = require('express');
const cors = require('cors')//cors for own server connected with own
const admin = require("firebase-admin");//for token file
const app = express();
require("dotenv").config();//dotenv config
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const { v4: uuidv4 } = require('uuid');

//Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const { query } = require('express');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3aidp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



//SSL Commerce
const SSLCommerzPayment = require('sslcommerz-lts');
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false;
app.use(express.urlencoded({ extended: true }));//It is must for ssl commerz













//test-react-app-firebase-adminsdk.json


var serviceAccount = require('./test-react-app-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});




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
    const SSLCollection = database.collection('SSL');

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
    app.get('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
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
        const requesterAccount = await usersCollection.findOne({ email: requester })
        if (requesterAccount?.role === 'admin') {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: 'admin' } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          console.log(result);
          res.json(result);
        }
      }
      else {
        res.status(403).json({ message: 'You do not have permission' })
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
      const amount = paymentInfo.price * 100;

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
    app.put('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      console.log(req.body);
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment
        }
      };
      const result = await appointmentsCollection.updateOne(filter, updateDoc);
      res.json(result);
    })



    //sslcommerz init
    app.post('/init', async (req, res) => {
     

      const data = {
        total_amount: req.body.total_amount,
        currency: 'BDT',
        tran_id: uuidv4(),
        success_url: 'http://localhost:5000/success',
        fail_url: 'http://localhost:5000/fail',
        cancel_url: 'http://localhost:5000/cancel',
        ipn_url: 'http://localhost:5000/ipn',
        shipping_method: 'Courier',
        paymentStatus: 'pending',
        product_name: req.body.product_name,
        product_category: 'Dentist',
        product_profile: 'general',
        cus_name: req.body.cus_name,
        cus_email: req.body.cus_email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: req.body.cus_phone,
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };

      const sslOrder = await SSLCollection.insertOne(data);
       

      /* const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: data,
        }
      };

      const result = await appointmentsCollection.updateOne(filter, updateDoc);
      res.json(result); */

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway

        if (apiResponse.GatewayPageURL) {
          res.json(apiResponse.GatewayPageURL);
          
        }
        else {
          return res.status(400).json({
            message: 'Payment Session failed'
          })
        }

      });

      
    })

    app.post('/success', async (req, res) => {
      
      const sslOrder = await SSLCollection.updateOne({tran_id: req.body.tran_id},{
        $set:{
          transaction: req.body.val_id
        }
      })

      res.status(200).redirect(`http://localhost:3000/success/${req.body.tran_id}`);
    })
    app.post('/fail', async (req, res) => {
      const sslorder = await SSLCollection.deleteOne({tran_id: req.body.tran_id})
      res.status(200).redirect('http://localhost:3000/dashboard');
    })
    app.post('/cancel', async (req, res) => {
      const sslorder = await SSLCollection.deleteOne({tran_id: req.body.tran_id})
      res.status(200).redirect('http://localhost:3000/dashboard');
    })
    app.get('/payment/:tran_id', async(req,res) =>{
      const id = req.params.tran_id;
      const payment = await SSLCollection.findOne({tran_id: id});
      res.json(payment);
    })

    app.put('/success/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment: payment
        }
      };
      const result = await appointmentsCollection.updateOne(filter, updateDoc);
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