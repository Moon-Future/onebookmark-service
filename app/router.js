'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.post('/api/bookmark/importBookmark/', controller.bookmark.importBookmark)
  router.post('/api/bookmark/modifyBookmark/', controller.bookmark.modifyBookmark)
  router.post('/api/bookmark/moveBookmark/', controller.bookmark.moveBookmark)
  router.post('/api/bookmark/removeBookmark/', controller.bookmark.removeBookmark)
  router.post('/api/bookmark/sortBookmark/', controller.bookmark.sortBookmark)
  router.post('/api/bookmark/getBookmark/', controller.bookmark.getBookmark)
  router.post('/api/bookmark/addNewNode/', controller.bookmark.addNewNode)
  router.post('/api/bookmark/getWebsiteTitleAndIcon/', controller.bookmark.getWebsiteTitleAndIcon)
};
