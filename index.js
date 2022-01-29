import express from 'express'
import cors from 'cors'
import { MongoClient } from 'mongodb';
import joi from 'joi'
import dayjs from 'dayjs'
import dotenv from 'dotenv'
dotenv.config();

const app=express();
app.use(cors());
app.use(express.json());
const mongoClient = new MongoClient(process.env.MONGO_URI);




app.post("/participants", async (req,res)=>{
    const participantModel = joi.object({
        name:joi.string().required()
    });
   const validation =  participantModel.validate(req.body);
   if(validation.error){
       console.log(validation.error.details);
       res.status(422).send("Envie objeto do tipo : {name: 'Jane Doe'}");
       return;
   }
   
    const name = req.body.name;
    const lastStatus = Date.now();
    try{
        await mongoClient.connect();
        const dbParticipants = mongoClient.db("Participants");
        const collection = dbParticipants.collection("participant");
        const participant = await collection.findOne({name:name});
        if(participant){
            console.log(participant)
            res.status(409).send("Nome já Cadastrado");
            return;
        }else{
          const insertedParticipant = await collection.insertOne({name, lastStatus});
          const dbMessages = mongoClient.db("Messages");
          const collectionMessages = dbMessages.collection("messages");
          await collectionMessages.insertOne({
              name: name, 
              to: 'Todos',
              text:'entra na sala...',
              type:'status',
              time:dayjs().locale('pt-br').format('hh:mm:ss')
            })
           
            res.sendStatus(201);
          mongoClient.close();
        }
    }catch (err){
        console.log(err);
        res.sendStatus(500);
        mongoClient.close();
    }

})
app.get("/participants", async (_req,res)=>{
    try{
        await mongoClient.connect();
        const dbParticipants = mongoClient.db("Participants");
        const collection = dbParticipants.collection("participant");
        const participants = await collection.find({}).toArray();
       res.status(200).send(participants);
       mongoClient.close()
    }catch (err){
        console.log(err);
        res.sendStatus(500);
        mongoClient.close()
    }
})




app.post("/messages", async (req,res)=>{
    const message=req.body;
    message.from = req.headers.user;   
    message.time = dayjs().locale('pt-br').format('hh:mm:ss');
  console.log(message);
     try{
        await mongoClient.connect();
        const dbParticipants = mongoClient.db("Participants");
        const collection = dbParticipants.collection("participant");
        const from = await collection.findOne({name:message.from});
        if(!from){
            res.sendStatus(422);
            mongoClient.close();
            return;
        }else{
            await mongoClient.connect();
            const dbMessages = mongoClient.db("Messages");
            const collectionMessages = dbMessages.collection("messages");
            const messagesModel = joi.object({
                to:joi.string().required(),
                text:joi.string().required(),
                type:joi.string().valid('message','private_message').required(),
                from:joi.string().required(),
                time:joi.optional()
            });
            const validation = messagesModel.validate(message);
            if(validation.error){
                res.status(422).send("Envie um formato válido");
                console.log(validation.error.details);
                mongoClient.close();
                return;
            }else{
                await collectionMessages.insertOne(message);
                res.sendStatus(201);
                mongoClient.close();
            }
          }
     }catch(err){
         console.log(err);
         res.sendStatus(500);
         mongoClient.close();
     }
    
    


})

app.get("/messages",async (req,res)=>{
    const limit =  parseInt(req.query.limit);
    const user = req.headers.user;
   try{
    await mongoClient.connect();
    const dbMessages = mongoClient.db("Messages");
    const collectionMessages = dbMessages.collection("messages");
    const messages = await collectionMessages.find({}).toArray();
    
    const userMessages = messages.filter(message=> (message.to === user || message.from === user ))
    if(!limit){
        res.send(userMessages);
    }else{
        if(limit> userMessages.length){
            res.send(userMessages);
            return;
        }
        const selectedMessages = [...userMessages].reverse().slice(0,limit);
        res.send(selectedMessages.reverse());
    }

   }catch(err){
       console.log(err);
   }
})

app.post("/status", async (req,res)=>{
    const user = req.headers.user;
    try{
        await mongoClient.connect();
        const dbParticipants = mongoClient.db("Participants")
        const collectionParticipants = dbParticipants.collection("participant");
        const participant = await collectionParticipants.findOne({name:user});
        
        if(!participant){
            res.sendStatus(404);
            mongoClient.close();
        }else{
         await collectionParticipants.updateOne({name:user}, {$set:{ "lastStatus": Date.now()}});
            res.sendStatus(200);
        }
    }catch(err){
        console.log(err);
        res.sendStatus(500);
    }
})

async function  removeParticipants(){
    try{
        await mongoClient.connect();
        const dbMessages = mongoClient.db("Messages");
        const collectionMessages = dbMessages.collection("messages");
        const dbParticipants = mongoClient.db("Participants");
        const collectionParticipants = dbParticipants.collection("participant");
        const lastStatus = await collectionParticipants.find({}).toArray();
        const downtime = lastStatus.filter(status => ((Date.now() - status.lastStatus)/1000)>=15);
        console.log(downtime);
        downtime.forEach(async participant => {
             await collectionParticipants.deleteOne({id:participant.id});
             await collectionMessages.insertOne({
                from: participant.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().locale('pt-br').format('hh:mm:ss')
            })

        })
        return(lastStatus);
    }catch(err){
        console.log(err);
    }
      
   
}
setTimeout(removeParticipants,1000);

app.listen(5000,()=>{
    console.log("Initiated Server...");
   })

