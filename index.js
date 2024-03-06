const express = require('express')
const app = express()
const cors = require('cors');
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



        app.post("/api/v1/add-user", async(req,res)=>{
            const user = req.body;
            const result = await bistroUser.insertOne(user);
            res.send(result);
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
        app.post("/api/v1/post-carts" , async(req,res) => {
            const cartItem = req.body;
            const result = await bistroCart.insertOne(cartItem);
            res.send(result);
        })

        app.get("/api/v1/get-carts", async(req,res)=>{

            const email = req.query.email;
            // console.log({email})
            const qeury = {email:email}
            const result = await bistroCart.find(qeury).toArray();
            res.send(result)
        })

        app.delete("/api/v1/delete-cart-item/:id" , async(req,res)=> {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
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