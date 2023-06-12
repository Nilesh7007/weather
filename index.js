const express = require("express");
const app = express();
app.use(express.json());

const {userRouter} = require("./routes/user.route")
app.use(userRouter)

const {connection} = require("./db")


const axios = require('axios');
const redis = require('redis');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
require('dotenv').config();




dotenv.config();



const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});


const limiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 1,
});


app.use(limiter);




const authenticateUser = (req, res, next) => {
  
  const token = req.headers.authorization;

  
  redisClient.get(token, (err, reply) => {
    if (err) {
      console.error('Redis error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (reply) {
      
      return res.status(401).json({ error: 'Unauthorized' });
    }

    
    next();
  });
};


const validateCity = (req, res, next) => {
  const { city } = req.query;

  if (!city || !/^[a-zA-Z\s]+$/.test(city)) {
    return res.status(400).json({ error: 'Invalid city' });
  }

  next();
};


app.get('/weather', authenticateUser, validateCity, async (req, res) => {
  try {
    const { city } = req.query;

    
    redisClient.get(city, async (err, reply) => {
      if (err) {
        console.error('Redis error:', err);
      }

      if (reply) {
        
        const weatherData = JSON.parse(reply);
        return res.json(weatherData);
      }

      
      const apiKey = process.env.api_key;
      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

      const response = await axios.get(apiUrl);
      const weatherData = response.data;


      redisClient.setex(city, 1800, JSON.stringify(weatherData));

      res.json(weatherData);
    });
  } catch (error) {
    
    winston.error('Error retrieving weather data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





app.listen(6000, async()=>{
try {
    await connection;
    console.log("connected to Db");
    console.log("server running on port 6000")
} catch (error) {
    console.log(error)
}
})