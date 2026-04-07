'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const commentController = require('../controllers/comment.controller');

// Router mounted at /api/partners
const partnerCommentRouter = Router();
partnerCommentRouter.use(authMiddleware);
partnerCommentRouter.get('/:partnerId/comments', commentController.list);
partnerCommentRouter.post('/:partnerId/comments', commentController.create);

// Router mounted at /api/comments
const commentRouter = Router();
commentRouter.use(authMiddleware);
commentRouter.patch('/:id', commentController.update);
commentRouter.delete('/:id', commentController.remove);

module.exports = { partnerCommentRouter, commentRouter };
