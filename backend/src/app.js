const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { UserModel, PlaceModel, ItineraryModel } = require('./models')
const { connectDatabase } = require('./config/database')
const healthRouter = require('./routes/health')

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const homeCoordinates = [7.4744, 81.7964]
const maximumRadiusKm = 25
const jwtSecret = process.env.JWT_SECRET || 'quiktrail-development-secret'

app.use(cors())
app.use(express.json())
const uploadsDirectory = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDirectory, { recursive: true })
app.use('/api/uploads', express.static(uploadsDirectory))

function disableProtectedCaching(request, response, next) {
  response.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  })
  next()
}

app.use('/api/admin', disableProtectedCaching)
app.use('/api/plans', disableProtectedCaching)
app.use('/api/auth/me', disableProtectedCaching)

const rawPlaces = [
  { id: 'amir-ali-park', name: "Amir Ali Children's Park", category: 'Recreational', description: 'A friendly local park for children, families and a relaxed afternoon outdoors.', location: 'Sammanthurai', distance: 2, duration: 60, entryFee: 'Free', openingTime: '06:00', closingTime: '19:00', emoji: '🎠', color: 'sage', coordinates: [7.4772, 81.7948], facilities: ['Playground', 'Seating'], bestVisitTime: 'Late afternoon', travelTips: 'Bring water and sun protection.', culturalEtiquette: 'Keep the park clean and respect local families.' },
  { id: 'sammanthurai-market', name: 'Sammanthurai Market', category: 'Useful Junctions & Hubs', description: 'A busy local market for fresh produce, snacks and a glimpse of everyday town life.', location: 'Market Road, Sammanthurai', distance: 1.5, duration: 60, entryFee: 'Free', openingTime: '06:00', closingTime: '18:00', emoji: '🥭', color: 'coral', coordinates: [7.476, 81.7982], facilities: ['Food stalls', 'Parking nearby'], bestVisitTime: 'Morning', travelTips: 'Carry small notes for local purchases.', culturalEtiquette: 'Ask before taking close-up photographs.' },
  { id: 'grand-mosque', name: 'Sammanthurai Grand Mosque', category: 'Religious', description: 'A significant local place of worship and an opportunity to understand Sammanthurai Muslim heritage.', location: 'Sammanthurai town', distance: 1, duration: 45, entryFee: 'Free', openingTime: '05:00', closingTime: '20:00', emoji: '🕌', color: 'gold', coordinates: [7.4745, 81.7942], facilities: ['Nearby shops'], bestVisitTime: 'Outside prayer times', travelTips: 'Check access times before visiting.', culturalEtiquette: 'Dress modestly, remove footwear where requested and ask before photographing.' },
  { id: 'sammanthurai-lake', name: 'Sammanthurai Lake', category: 'Natural', description: 'A calm waterside stop for birdwatching, fresh air and a slower view of the town.', location: 'Central Sammanthurai', distance: 2, duration: 120, entryFee: 'Free', openingTime: '06:00', closingTime: '18:30', emoji: '🌿', color: 'teal', coordinates: [7.4737, 81.7959], facilities: ['Scenic views', 'Photography'], bestVisitTime: 'Early morning', travelTips: 'The light is softest before 9am.', culturalEtiquette: 'Avoid littering and leave wildlife undisturbed.' },
  { id: 'big-chef', name: 'Big Chef Sammanthurai', category: 'Restaurants & Dining', description: 'A convenient local dining stop for a break during your town exploration.', location: 'Sammanthurai', distance: 2, duration: 75, entryFee: 'Varies', openingTime: '10:00', closingTime: '22:00', emoji: '🍛', color: 'coral', coordinates: [7.4719, 81.7985], facilities: ['Dining', 'Takeaway'], bestVisitTime: 'Lunch', travelTips: 'Call ahead for busy weekend times.', culturalEtiquette: 'Respect local dining customs.' },
  { id: 'oluvi-lighthouse', name: 'Oluvil Lighthouse', category: 'Coastal Landmark', description: 'A coastal landmark with open sea views and a memorable eastern sunset.', location: 'Oluvil', distance: 11, duration: 90, entryFee: 'Free', openingTime: '06:00', closingTime: '18:30', emoji: '🌊', color: 'blue', coordinates: [7.2862, 81.8565], facilities: ['Sea views', 'Photography'], bestVisitTime: 'Sunset', travelTips: 'Use caution near the water and check weather conditions.', culturalEtiquette: 'Keep the coastline clean.' },
  { id: 'oluvi-harbour', name: 'Oluvil Harbour', category: 'Coastal Landmark', description: 'Watch the changing colours of the coast at this working harbour near Oluvil.', location: 'Oluvil', distance: 13, duration: 75, entryFee: 'Free', openingTime: '06:00', closingTime: '18:00', emoji: '⚓', color: 'blue', coordinates: [7.2746, 81.8587], facilities: ['Harbour views'], bestVisitTime: 'Late afternoon', travelTips: 'Stay clear of working areas and follow signs.', culturalEtiquette: 'Do not interrupt fishermen at work.' },
  { id: 'southeastern-university', name: 'South Eastern University', category: 'Heritage & Cultural', description: 'A major educational landmark in Oluvil with distinctive campus surroundings.', location: 'Oluvil', distance: 16, duration: 60, entryFee: 'Check locally', openingTime: '08:00', closingTime: '17:00', emoji: '🏛️', color: 'sage', coordinates: [7.2963, 81.8568], facilities: ['Campus views'], bestVisitTime: 'Daytime', travelTips: 'Confirm visitor access before entering campus.', culturalEtiquette: 'Respect students and campus rules.' },
  { id: 'buddhangala', name: 'Buddhangala Raja Maha Viharaya', category: 'Heritage & Cultural', description: 'An ancient Buddhist heritage site surrounded by peaceful natural scenery.', location: 'Ampara area', distance: 11, duration: 120, entryFee: 'Donation welcome', openingTime: '06:00', closingTime: '18:00', emoji: '🪷', color: 'gold', coordinates: [7.3004, 81.7145], facilities: ['Historical site', 'Nature'], bestVisitTime: 'Morning', travelTips: 'Wear comfortable walking shoes.', culturalEtiquette: 'Dress respectfully, remove footwear at temple areas and keep quiet.' },
  { id: 'deegawapi', name: 'Deeghawapi Mountain', category: 'Natural', description: 'A scenic mountain area with natural and historical value for an active day trip.', location: 'Ampara area', distance: 15, duration: 150, entryFee: 'Free', openingTime: '06:00', closingTime: '17:30', emoji: '⛰️', color: 'sage', coordinates: [7.2741, 81.7135], facilities: ['Scenic views', 'Walking trails'], bestVisitTime: 'Morning', travelTips: 'Plan extra time for the walk and carry water.', culturalEtiquette: 'Protect the landscape and follow local guidance.' },
  { id: 'thompukandam-resort', name: 'Thompukandam Village Resort', category: 'Restaurants & Dining', description: 'A countryside resort stop offering dining and a restful rural setting.', location: 'Thompukandam', distance: 12, duration: 120, entryFee: 'Varies', openingTime: '09:00', closingTime: '21:00', emoji: '🌴', color: 'teal', coordinates: [7.3759, 81.7934], facilities: ['Dining', 'Rest area'], bestVisitTime: 'Lunch', travelTips: 'Contact the venue for current availability.', culturalEtiquette: 'Follow venue rules and respect private areas.' },
]

function toRadians(value) { return value * Math.PI / 180 }
function haversineDistance(first, second) {
  const earthRadius = 6371
  const latitudeDifference = toRadians(second[0] - first[0])
  const longitudeDifference = toRadians(second[1] - first[1])
  const latitudeA = toRadians(first[0])
  const latitudeB = toRadians(second[0])
  const a = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDifference / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const places = rawPlaces.map((place) => ({ ...place, distanceFromHome: Number(haversineDistance(homeCoordinates, place.coordinates).toFixed(1)) }))
const users = []
const itineraries = []
const reviews = []
const settings = { homeCoordinates, paceMultipliers: { Relaxed: 1.25, Balanced: 1, Fast: 0.8 }, categories: ['Natural', 'Religious', 'Heritage & Cultural', 'Recreational', 'Restaurants & Dining', 'Coastal Landmark', 'Useful Junctions & Hubs'], notificationsEnabled: true, features: { reviews: true, savedPlans: true } }

function createToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, jwtSecret, { expiresIn: '2d' })
}

function requireAuth(request, response, next) {
  const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null
  if (!token) return response.status(401).json({ message: 'Authentication is required.' })
  try {
    request.user = jwt.verify(token, jwtSecret)
    const currentUser = users.find((user) => user.id === request.user.id)
    if (currentUser && currentUser.isActive === false) return response.status(403).json({ message: 'This account is inactive.' })
    return next()
  } catch {
    return response.status(401).json({ message: 'Your session has expired. Please log in again.' })
  }
}

function requireAdmin(request, response, next) {
  if (request.user.role !== 'admin') return response.status(403).json({ message: 'Administrator access is required.' })
  return next()
}

const verifyToken = requireAuth
const requireAdminRole = requireAdmin

app.use('/api/health', healthRouter)

app.post('/api/auth/register', async (request, response) => {
  const { name, email, password } = request.body
  if (!name || !email || !password || password.length < 6) return response.status(400).json({ message: 'Name, email, and a password of at least 6 characters are required.' })
  const normalizedEmail = email.trim().toLowerCase()
  if (users.some((user) => user.email === normalizedEmail)) return response.status(409).json({ message: 'An account with this email already exists.' })
  const user = { id: `user-${Date.now()}`, name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10), role: 'visitor' }
  users.push(user)
  return response.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: createToken(user) })
})

app.post('/api/auth/login', async (request, response) => {
  const { email, password } = request.body
  const normalizedEmail = email?.trim().toLowerCase()
  const user = users.find((item) => item.email === normalizedEmail)
  if (!user || !(await bcrypt.compare(password || '', user.password))) return response.status(401).json({ message: 'Email or password is incorrect.' })
  return response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: createToken(user) })
})

app.get('/api/auth/me', verifyToken, (request, response) => response.json({ user: request.user }))

app.get('/api/places', (request, response) => {
  const category = request.query.category
  const search = request.query.search?.toLowerCase()
  const radius = Number(request.query.radius) || maximumRadiusKm
  const filteredPlaces = places.filter((place) => {
    const matchesCategory = !category || category === 'All' || place.category === category
    const matchesSearch = !search || `${place.name} ${place.description} ${place.location} ${place.category}`.toLowerCase().includes(search)
    return matchesCategory && matchesSearch && place.distanceFromHome <= radius && place.isActive !== false
  })
  response.json({ home: homeCoordinates, radius, total: filteredPlaces.length, places: filteredPlaces })
})

app.get('/api/places/:id', (request, response) => {
  const place = places.find((item) => item.id === request.params.id)
  if (!place) return response.status(404).json({ message: 'Place not found' })
  return response.json(place)
})

app.post('/api/admin/uploads', verifyToken, requireAdminRole, (request, response) => {
  const { dataUrl, filename = 'place-image' } = request.body
  const match = typeof dataUrl === 'string' ? dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/) : null
  if (!match) return response.status(400).json({ message: 'Choose a JPG, PNG, WEBP, or GIF image.' })
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[match[1]]
  const safeName = String(filename).replace(/[^a-z0-9-_]/gi, '-').toLowerCase().slice(0, 60) || 'place-image'
  const storedName = `${Date.now()}-${safeName}.${extension}`
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length > 5 * 1024 * 1024) return response.status(413).json({ message: 'Images must be smaller than 5 MB.' })
  fs.writeFileSync(path.join(uploadsDirectory, storedName), buffer)
  return response.status(201).json({ url: `/api/uploads/${storedName}` })
})

app.post('/api/admin/places', verifyToken, requireAdminRole, (request, response) => {
  const place = { emoji: '📍', color: 'blue', facilities: [], bestVisitTime: 'Daytime', travelTips: 'Check local conditions before visiting.', culturalEtiquette: 'Respect local people, places and surroundings.', ...request.body, id: `place-${Date.now()}`, isActive: request.body.isActive !== false, coordinates: request.body.coordinates || homeCoordinates, distanceFromHome: Number(haversineDistance(homeCoordinates, request.body.coordinates || homeCoordinates).toFixed(1)) }
  if (!place.name || !place.category || !place.description) return response.status(400).json({ message: 'Name, category, and description are required.' })
  places.push(place)
  return response.status(201).json(place)
})

app.put('/api/admin/places/:id', verifyToken, requireAdminRole, (request, response) => {
  const placeIndex = places.findIndex((item) => item.id === request.params.id)
  if (placeIndex === -1) return response.status(404).json({ message: 'Place not found.' })
  const updatedPlace = { ...places[placeIndex], ...request.body }
  if (request.body.coordinates) updatedPlace.distanceFromHome = Number(haversineDistance(homeCoordinates, request.body.coordinates).toFixed(1))
  places[placeIndex] = updatedPlace
  return response.json(updatedPlace)
})

app.delete('/api/admin/places/:id', verifyToken, requireAdminRole, (request, response) => {
  const placeIndex = places.findIndex((item) => item.id === request.params.id)
  if (placeIndex === -1) return response.status(404).json({ message: 'Place not found.' })
  places.splice(placeIndex, 1)
  return response.json({ message: 'Place removed successfully.' })
})

app.post('/api/plans', verifyToken, (request, response, next) => {
  const { name, date, startTime = '08:00', pace = 'Balanced', places: selectedIds = [] } = request.body
  if (!name || !date || selectedIds.length === 0) return response.status(400).json({ message: 'A plan name, date, and at least one place are required.' })
  const selectedPlaces = selectedIds.map((id) => places.find((place) => place.id === id)).filter(Boolean)
  const paceMultiplier = { Relaxed: 1.25, Balanced: 1, Fast: 0.8 }[pace] || 1
  const totalVisitMinutes = Math.round(selectedPlaces.reduce((total, place) => total + place.duration, 0) * paceMultiplier)
  const totalTravelMinutes = Math.max(0, Math.round(selectedPlaces.reduce((total, place, index) => total + (index === 0 ? place.distanceFromHome : haversineDistance(selectedPlaces[index - 1].coordinates, place.coordinates)), 0) * 3))
  const totalDistance = selectedPlaces.reduce((total, place, index) => total + (index === 0 ? place.distanceFromHome : haversineDistance(selectedPlaces[index - 1].coordinates, place.coordinates)), 0)
  const [hours, minutes] = startTime.split(':').map(Number)
  const end = new Date(2000, 0, 1, hours, minutes + totalVisitMinutes + totalTravelMinutes)
  const expectedEndTime = end.toTimeString().slice(0, 5)
  const warnings = selectedPlaces.filter((place) => startTime < place.openingTime || startTime > place.closingTime).map((place) => `${place.name} may be outside its visiting hours.`)
  const result = { id: `plan-${Date.now()}`, name, date, startTime, pace, places: selectedPlaces, routeOrder: selectedPlaces.map((place) => place.id), totalDistance: Number(totalDistance.toFixed(1)), totalVisitMinutes, totalTravelMinutes, expectedEndTime, warnings, message: 'Trip plan created successfully.' }
  itineraries.push({ ...result, userId: request.user.id, createdAt: new Date().toISOString() })
  return response.status(201).json(result)
})

app.get('/api/plans', verifyToken, (request, response) => response.json(itineraries.filter((plan) => plan.userId === request.user.id)))

app.post('/api/places/:id/reviews', verifyToken, (request, response) => {
  const { rating, comment = '' } = request.body
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) return response.status(400).json({ message: 'Rating must be an integer from 1 to 5.' })
  const review = { id: `review-${Date.now()}`, placeId: request.params.id, userId: request.user.id, rating: Number(rating), comment, createdAt: new Date().toISOString() }
  reviews.push(review)
  return response.status(201).json(review)
})

app.get('/api/admin/settings', verifyToken, requireAdminRole, (request, response) => response.json(settings))
app.put('/api/admin/settings', verifyToken, requireAdminRole, (request, response) => {
  const { homeCoordinates: nextHome, paceMultipliers, categories, notificationsEnabled, features } = request.body
  if (nextHome) settings.homeCoordinates = nextHome
  if (paceMultipliers) settings.paceMultipliers = { ...settings.paceMultipliers, ...paceMultipliers }
  if (Array.isArray(categories)) settings.categories = categories
  if (typeof notificationsEnabled === 'boolean') settings.notificationsEnabled = notificationsEnabled
  if (features) settings.features = { ...settings.features, ...features }
  return response.json(settings)
})

app.get('/api/admin/users', verifyToken, requireAdminRole, (request, response) => response.json(users.map(({ password, ...user }) => ({ ...user, itineraryCount: itineraries.filter((plan) => plan.userId === user.id).length }))))
app.patch('/api/admin/users/:id', verifyToken, requireAdminRole, (request, response) => {
  const user = users.find((item) => item.id === request.params.id)
  if (!user) return response.status(404).json({ message: 'User not found.' })
  if (request.body.role && ['visitor', 'admin'].includes(request.body.role)) user.role = request.body.role
  if (typeof request.body.isActive === 'boolean') user.isActive = request.body.isActive
  const { password, ...safeUser } = user
  return response.json(safeUser)
})
app.get('/api/admin/itineraries', verifyToken, requireAdminRole, (request, response) => response.json(itineraries))

async function startServer() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quiktrail.local'
  const adminPassword = process.env.ADMIN_PASSWORD || 'QuikTrail@123'
  if (!users.some((user) => user.email === adminEmail)) users.push({ id: 'admin-1', name: 'QuikTrail Administrator', email: adminEmail, password: await bcrypt.hash(adminPassword, 10), role: 'admin' })
  await connectDatabase()
  if (!process.env.MONGODB_URI) console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
  app.listen(port, () => console.log(`QuikTrail API running at http://localhost:${port}`))
}

module.exports = { app, startServer }
