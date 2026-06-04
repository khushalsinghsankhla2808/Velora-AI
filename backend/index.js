import express from 'express'
import 'dotenv/config'
import connectDB from './database/db.js'
import authRoute from "./routes/authRoutes.js"
import cookieParser from 'cookie-parser'

const app = express()
const PORT = process.env.PORT || 3000

// middleware
app.use(express.json())
app.use(cookieParser())


app.use('/api/auth', authRoute)

app.listen(PORT,()=>{
    connectDB()
    console.log(`Server is listening at port:${PORT}`);
})  