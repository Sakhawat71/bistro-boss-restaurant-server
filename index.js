const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
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


        // middleware

        const veryfyToken = (req, res, next) => {

            console.log(req.headers.authorization);

            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }

            const token = req.headers;

            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }

                req.decoded = decoded;

                next()
            })

        }

        // jwt
        app.post("/api/v1/jwt", async (req, res) => {

            try {
                const userEmail = req.body;

                // console.log(req.body);

                const token = jwt.sign(userEmail, process.env.JWT_SECRET, {
                    expiresIn: '1h',
                })
                res.send({ token })

            } catch (error) {
                console.log(error);
                res.status(500).send('Error generating JWT');
            }
        })


        app.get("/api/v1/all-user", veryfyToken, async (req, res) => {

            // console.log(req.headers);

            const result = await bistroUser.find().toArray();
            res.send(result);
        })

        app.post("/api/v1/add-user", async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await bistroUser.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }

            const result = await bistroUser.insertOne(user);
            res.send(result);
        })

        app.delete('/api/v1/delete-user/:id', async (req, res) => {

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
        app.patch("/api/v1/make-admin/:id", async (req, res) => {
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