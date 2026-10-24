const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['visitor', 'admin'], default: 'visitor' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const PlaceSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  description: String,
  category: String,
  address: String,
  location: String,
  coordinates: [Number],
  openingTime: String,
  closingTime: String,
  visitDuration: Number,
  duration: Number,
  entryFee: String,
  contactNumber: String,
  images: [String],
  travelTips: String,
  culturalEtiquette: String,
  facilities: [String],
  bestVisitTime: String,
  distanceFromHome: Number,
  distance: Number,
  emoji: String,
  color: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const ItinerarySchema = new mongoose.Schema({
  id: { type: String, index: true },
  userId: String,
  name: String,
  date: String,
  startTime: String,
  pace: String,
  places: [mongoose.Schema.Types.Mixed],
  totalVisitMinutes: Number,
  totalTravelMinutes: Number,
  message: String,
  title: String,
  visitDate: String,
  startTime: String,
  selectedPlaces: [String],
  routeOrder: [String],
  totalDistance: Number,
  totalTravelTime: Number,
  expectedEndTime: String,
  warnings: [String],
}, { timestamps: true })

const ReviewSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  placeId: String,
  userId: String,
  rating: Number,
  comment: String,
}, { timestamps: true })

const SettingSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

module.exports = {
  UserModel: mongoose.models.User || mongoose.model('User', UserSchema),
  PlaceModel: mongoose.models.Place || mongoose.model('Place', PlaceSchema),
  ItineraryModel: mongoose.models.Itinerary || mongoose.model('Itinerary', ItinerarySchema),
  ReviewModel: mongoose.models.Review || mongoose.model('Review', ReviewSchema),
  SettingModel: mongoose.models.Setting || mongoose.model('Setting', SettingSchema),
}
