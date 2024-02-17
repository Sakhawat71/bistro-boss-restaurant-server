const express = require('express')
const app = express()
const cors = require('cors');
const PORT = process.env.PORT || 5000;

//middlewar
app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
  res.send('Bistro boss restaurant server running ......... ... ... .. .. . .')
})

app.listen(PORT, () => {
  console.log(`Bistro boss restaurant server ${PORT}`)
})