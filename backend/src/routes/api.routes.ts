import express from "express"
import { sendCoversations, sendCoversationsById } from "../controllers/api.controller.js";

const apiRoutes = express.Router()

apiRoutes.get('/conversations', sendCoversations)
apiRoutes.get('/conversations/:id', sendCoversationsById)
// apiRoutes.post('/conversations', handleChatRecieve)


export default apiRoutes