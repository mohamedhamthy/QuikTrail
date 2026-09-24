const mongoose = require('mongoose')

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI not set; using sample data mode')
    return false
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')
    return true
  } catch (error) {
    console.error('MongoDB connection failed:', error.message)
    return false
  }
}

module.exports = { connectDatabase }
