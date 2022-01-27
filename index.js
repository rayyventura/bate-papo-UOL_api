import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb';

const app=express();
app.use(cors());
app.use(express.json());
const participants = [];

app.post("/participants",(req,res)=>{

})

app.get("/participantes",(req,res)=>{
app.send(participants);
})



app.post("/messages", (req,res)=>{

})

app.get("/messages",(req,res)=>{

})

app.post("/status",(req,res)=>{
    
})

app.listen(5000,()=>{
    console.log("Initiatedd Server...");
   })

