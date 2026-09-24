const express = require('express')

const router = express.Router()

router.get('/', (request, response) => {
  response.json({ status: 'ok', service: 'QuikTrail API' })
})

module.exports = router
