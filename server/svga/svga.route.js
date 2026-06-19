const express = require('express');
const router = express.Router();
const multer = require('multer');
const { svga } = require('../../util/multer');

const SvgaController = require('./svga.controller');
const upload = multer({
  storage: svga,
});

const checkAccessWithKey = require('../../checkAccess');

// get all svga or frame
router.get('/all', checkAccessWithKey(), SvgaController.index);

//get all svga or frame for android
router.get('/get', checkAccessWithKey(), SvgaController.get);

//create
router.post(
  '/create',
  checkAccessWithKey(),
  upload.fields([{ name: 'imageVideo' }, { name: 'thumbnail' }]),
  SvgaController.store
);
//create
router.post(
  '/createFrame',
  checkAccessWithKey(),
  upload.any(),
  SvgaController.frameStore
);
// update
router.patch(
  '/:Id',
  checkAccessWithKey(),
  upload.fields([{ name: 'imageVideo' }, { name: 'thumbnail' }]),
  SvgaController.update
);

// delete
router.delete('/:Id', checkAccessWithKey(), SvgaController.destroy);

// purchase
router.post('/purchase', checkAccessWithKey(), SvgaController.purchase);

//user select the svga or frame
router.post('/select', checkAccessWithKey(), SvgaController.select);

module.exports = router;
