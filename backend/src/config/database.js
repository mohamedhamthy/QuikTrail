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
    const safeMessage = error.message
      .replace(process.env.MONGODB_URI, '[redacted MongoDB URI]')
      .replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb+srv://[redacted]@')
    console.error('MongoDB connection failed:', error.name, safeMessage)
    return false
  }
}

module.exports = { connectDatabase }
