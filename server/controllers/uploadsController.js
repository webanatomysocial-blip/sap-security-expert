const { deleteImage } = require('../utils/helpers');

// POST /api/upload-blog-image
const uploadBlogImage = (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  const oldImage = req.body.old_image || '';
  if (oldImage) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/blogs/' + req.file.filename,
  });
};

// POST /api/upload-ad-image
const uploadAdImage = (req, res) => {
  if (!req.file) return res.json({ status: 'error', message: 'Please select an image to upload.' });

  const oldImage = req.body.old_image || '';
  if (oldImage) deleteImage(oldImage);

  return res.json({
    status: 'success',
    message: 'Ad image uploaded successfully',
    filename: req.file.filename,
    path: '/uploads/ads/' + req.file.filename,
  });
};

module.exports = { uploadBlogImage, uploadAdImage };
