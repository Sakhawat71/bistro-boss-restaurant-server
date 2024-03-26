const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, deserialize } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.VITE_STRIPE_SK)
const PORT = process.env.PORT || 5000;

//middlewar
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.vcouptk.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        client.connect();

        const bistroMenu = client.db('bistroBoss').collection('menu');
        const bistroReviews = client.db('bistroBoss').collection('reviews');
        const bistroCart = client.db('bistroBoss').collection('carts');
        const bistroUser = client.db('bistroBoss').collection('user');
        const bistroPayment = client.db('bistroBoss').collection('payments')




        /** ************************************************************
         ************************** middleware *************************
         ************************************************************** */

        const verifyToken = (req, res, next) => {

            if (!req.headers.authorization) {
                return res.status(401).send({ message: `forbidden access` })
            }

            const token = req.headers.authorization;

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: `forbidden access ,${err.message} ` })
                }

                req.decoded = decoded;
                next()
            })
        }


        const verifyAdmin = async (req, res, next) => {

            const email = req.decoded.email;
            const query = { email: email }

            const user = await bistroUser.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }


        /** ************************************************************ 
         ***************************** JWT ****************************
         ************************************************************** */

        app.post("/api/v1/jwt", async (req, res) => {

            try {
                const userEmail = req.body;

                const token = jwt.sign(userEmail, process.env.JWT_SECRET, {
                    expiresIn: '12h',
                })
                res.send({ token })

            } catch (error) {
                console.log(error);
                res.status(500).send('Error generating JWT');
            }
        })



        /**
         * ****************************************************************
         * *************************** Admin ******************************
         * ****************************************************************
         */

        app.get('/api/v1/admin/:email', verifyToken, async (req, res) => {

            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unAuthorize access' })
            }

            const query = { email: email }
            const user = await bistroUser.findOne(query)

            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })

        app.get('/api/v1/admin-states', async (req, res) => {

            const user = await bistroUser.estimatedDocumentCount();
            const menuItems = await bistroMenu.estimatedDocumentCount();
            const orders = await bistroPayment.estimatedDocumentCount();

            const payments = await bistroPayment.find().toArray();
            const revenue = await payments.reduce((
                (total, paymet) => { return total + paymet.price}
            ),0)

            res.send({
                user,
                menuItems,
                orders,
                revenue
            })
        })



        /**
         * *******************************************************************
         * *************************  ALL API  *******************************
         * *******************************************************************
         */

        app.get("/api/v1/all-user", verifyToken, verifyAdmin, async (req, res) => {

            const decoded = req.decoded;
            const result = await bistroUser.find().toArray();
            res.send(result);
        })

        app.post("/api/v1/add-user", verifyToken, verifyAdmin, async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await bistroUser.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }

            const result = await bistroUser.insertOne(user);
            res.send(result);
        })

        app.delete('/api/v1/delete-user/:id', verifyToken, verifyAdmin, async (req, res) => {

            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await bistroUser.deleteOne(query);
                res.send(result);
            } catch (error) {
                console.error('Error deleting user:', error);
                res.status(500).send('Error deleting user');
            }
        })

        // make user to ADMIN
        app.patch("/api/v1/make-admin/:id", verifyToken, verifyAdmin, async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) }
                const updateDoc = {
                    $set: {
                        role: "admin"
                    }
                }
                const result = await bistroUser.updateOne(filter, updateDoc);
                res.send(result)
            }
            catch (error) {
                console.log(error);
                res.status(500).send({ message: "can`t make admin" })
            }
        })

        // menu api
        app.get('/api/v1/menu', async (req, res) => {

            const result = await bistroMenu.find().toArray();
            res.send(result)
        })

        app.post("/api/v1/add-menu", verifyToken, verifyAdmin, async (req, res) => {
            const menuItems = req.body;
            const result = await bistroMenu.insertOne(menuItems);
            res.send(result)
        })

        app.get("/api/v1/menu-item/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bistroMenu.findOne(query);
            res.send(result);
        })

        app.patch("/api/v1/update-item/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image,
                }
            }

            const result = await bistroMenu.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.delete("/api/v1/delete-menu/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bistroMenu.deleteOne(query)
            res.send(result)
        })


        app.get("/api/v1/reviews", async (req, res) => {
            const result = await bistroReviews.find().toArray();
            res.send(result)
        })

        // cart 
        app.post("/api/v1/post-carts", async (req, res) => {
            const cartItem = req.body;
            const result = await bistroCart.insertOne(cartItem);
            res.send(result);
        })

        app.get("/api/v1/get-carts", async (req, res) => {

            const email = req.query.email;
            // console.log({email})
            const qeury = { email: email }
            const result = await bistroCart.find(qeury).toArray();
            res.send(result)
        })

        app.delete("/api/v1/delete-cart-item/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bistroCart.deleteOne(query);
            res.send(result)
        })

        /**
         * *****************************************************************
         * *************************** PayMent *****************************
         * *****************************************************************
         */

        app.post('/api/v1/create-payment-intent', async (req, res) => {

            const { price } = req.body;
            const priceInt = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: priceInt,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        app.post('/api/v1/payment-details', async (req, res) => {

            const payment = req.body;
            const paymentResult = await bistroPayment.insertOne(payment);

            const query = {
                _id: {
                    $in: payment.itemIds.map(id => new ObjectId(id))
                }
            }

            const deleteResult = await bistroCart.deleteMany(query);

            // console.log(paymentResult ,deleteResult);
            res.send({ paymentResult, deleteResult })
        })

        app.get('/api/v1/payments/:email', verifyToken, async (req, res) => {

            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            const query = { email: req.params.email }
            // const sortx = { timestamp: -1 };
            const result = await bistroPayment.find(query).toArray();
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("bistroBoss").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Bistro boss restaurant server running ... ... ... .. .. . ')
})

app.listen(PORT, () => {
    console.log(`Bistro boss restaurant server ${PORT}`)
})