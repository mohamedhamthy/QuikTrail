const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['visitor', 'admin'], default: 'visitor' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const PlaceSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  address: String,
  location: String,
  coordinates: [Number],
  openingTime: String,
  closingTime: String,
  visitDuration: Number,
  entryFee: String,
  contactNumber: String,
  images: [String],
  travelTips: String,
  culturalEtiquette: String,
  facilities: [String],
  bestVisitTime: String,
  distanceFromHome: Number,
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const ItinerarySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  visitDate: String,
  startTime: String,
  selectedPlaces: [String],
  routeOrder: [String],
  totalDistance: Number,
  totalTravelTime: Number,
  expectedEndTime: String,
  pace: String,
  warnings: [String],
}, { timestamps: true })

module.exports = {
  UserModel: mongoose.models.User || mongoose.model('User', UserSchema),
  PlaceModel: mongoose.models.Place || mongoose.model('Place', PlaceSchema),
  ItineraryModel: mongoose.models.Itinerary || mongoose.model('Itinerary', ItinerarySchema),
}
