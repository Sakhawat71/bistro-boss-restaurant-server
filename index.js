const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
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


    app.get('/api/v1/menu' , async(req,res) => {

        const result = await bistroMenu.find().toArray();
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
  res.send('Bistro boss restaurant server running ......... ... ... .. .. . .')
})

app.listen(PORT, () => {
  console.log(`Bistro boss restaurant server ${PORT}`)
})